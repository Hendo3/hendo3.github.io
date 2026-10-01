let cmdInput;

let linkStore;
let customAliases = {};
let seedState;
let customSectors = [];
let commands = [];
let lastRealLogAt = 0;

const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

let driveApiKeyPromise;
function getDriveApiKey() {
	return (driveApiKeyPromise ||= fetch("js/drive-api-key.json")
		.then((response) => {
			if (!response.ok) throw new Error("Google Drive API key unavailable.");
			return response.json();
		})
		.then((data) => data.key || "")
		.catch(() => ""));
}
const DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";
let customLinks = [];
let driveBrowser;
function getDriveFolderId(url) {
	try {
		const parsedUrl = new URL(url);
		if (parsedUrl.hostname !== "drive.google.com") return "";
		return parsedUrl.pathname.match(/\/folders\/([^/]+)/)?.[1] || "";
	} catch {
		return "";
	}
}
function createDriveBrowser() {
	const element = document.createElement("aside");
	element.id = "drive-browser";
	element.className = "drive-browser";
	element.hidden = true;
	element.setAttribute("role", "dialog");
	element.setAttribute("aria-modal", "true");
	element.setAttribute("aria-labelledby", "drive-browser-title");
	element.innerHTML = `
		<div class="drive-browser__header">
			<div>
				<p class="drive-browser__eyebrow">/// GOOGLE_DRIVE</p>
				<h2 id="drive-browser-title">FILES</h2>
			</div>
			<button class="drive-browser__close" type="button" aria-label="Close archive navigator">×</button>
		</div>
		<div class="drive-browser__toolbar">
			<button class="drive-browser__back" type="button">← BACK</button>
			<a class="drive-browser__open-folder" target="_blank" rel="noopener noreferrer">OPEN FOLDER IN DRIVE ↗</a>
		</div>
		<p class="drive-browser__status" aria-live="polite"></p>
		<ul class="drive-browser__list" aria-label="Available files"></ul>
		<button class="drive-browser__more" type="button" hidden>LOAD MORE</button>
	`;
	document.body.appendChild(element);
	const browser = {
		element,
		title: element.querySelector("#drive-browser-title"),
		backButton: element.querySelector(".drive-browser__back"),
		closeButton: element.querySelector(".drive-browser__close"),
		openFolderLink: element.querySelector(".drive-browser__open-folder"),
		status: element.querySelector(".drive-browser__status"),
		list: element.querySelector(".drive-browser__list"),
		moreButton: element.querySelector(".drive-browser__more"),
		path: [],
		nextPageToken: "",
		requestId: 0,
		lastFocusedElement: null,
	};
	browser.closeButton.addEventListener("click", () =>
		closeDriveBrowser(browser),
	);
	browser.element.addEventListener("keydown", (event) => {
		if (event.key === "Escape") closeDriveBrowser(browser);
	});
	browser.backButton.addEventListener("click", () => {
		if (browser.path.length > 1) {
			browser.path.pop();
			loadDriveFolder(browser);
		} else {
			closeDriveBrowser(browser);
		}
	});
	browser.moreButton.addEventListener("click", () =>
		loadDriveFolder(browser, true),
	);
	return browser;
}
function closeDriveBrowser(browser) {
	browser.requestId += 1;
	browser.element.hidden = true;
	document.body.classList.remove("drive-browser-open");
	browser.lastFocusedElement?.focus();
}
function setDriveBrowserStatus(browser, message, state = "") {
	browser.status.textContent = message;
	browser.status.dataset.state = state;
}
function renderDriveError(browser, message) {
	browser.list.replaceChildren();
	setDriveBrowserStatus(browser, message, "error");
	browser.moreButton.hidden = true;
}
function renderDriveFiles(browser, files, append) {
	if (!append) browser.list.replaceChildren();
	if (!files.length && !append) {
		setDriveBrowserStatus(
			browser,
			"EMPTY // this folder has no files or subfolders.",
			"error",
		);
		return;
	}
	setDriveBrowserStatus(browser, `${files.length} ITEMS LOADED`, "success");
	files.forEach((file) => {
		const item = document.createElement("li");
		const isFolder = file.mimeType === DRIVE_FOLDER_MIME_TYPE;
		const control = document.createElement(isFolder ? "button" : "a");
		control.className = "drive-browser__file";
		control.textContent = `${isFolder ? "[DIR]" : "[FILE]"} ${file.name}`;
		if (isFolder) {
			control.type = "button";

			control.addEventListener("click", () => {
				browser.path.push({
					id: file.id,
					name: file.name,
					url: `https://drive.google.com/drive/folders/${file.id}`,
				});
				loadDriveFolder(browser);
			});
		} else {
			control.href =
				file.webViewLink ||
				`https://drive.google.com/file/d/${file.id}/view`;
			control.target = "_blank";
			control.rel = "noopener noreferrer";
		}
		item.appendChild(control);
		browser.list.appendChild(item);
	});
}
async function loadDriveFolder(browser, append = false) {
	const folder = browser.path.at(-1);
	if (!folder) return;
	const apiKey = await getDriveApiKey();
	browser.title.textContent = `FILES // ${folder.name}`;
	browser.openFolderLink.href = folder.url;
	browser.backButton.disabled = browser.path.length === 1;
	browser.moreButton.hidden = true;
	if (!apiKey) {
		renderDriveError(
			browser,
			"SETUP REQUIRED // add your Google Drive API key to js/drive-api-key.json.",
		);
		return;
	}
	const requestId = ++browser.requestId;
	setDriveBrowserStatus(
		browser,
		append ? "LOADING MORE FILES..." : "LOADING FILES...",
	);
	if (!append) browser.list.replaceChildren();
	const parameters = new URLSearchParams({
		key: apiKey,
		q: `'${folder.id}' in parents and trashed = false`,
		fields: "nextPageToken,files(id,name,mimeType,webViewLink)",
		orderBy: "folder,name_natural",
		pageSize: "1000",
		supportsAllDrives: "true",
		includeItemsFromAllDrives: "true",
	});
	if (append && browser.nextPageToken)
		parameters.set("pageToken", browser.nextPageToken);
	try {
		const response = await fetch(`${DRIVE_API_URL}?${parameters}`);
		const payload = await response.json();
		if (!response.ok)
			throw new Error(payload?.error?.message || "Error loading folder.");
		if (requestId !== browser.requestId) return;
		browser.nextPageToken = payload.nextPageToken || "";
		renderDriveFiles(browser, payload.files || [], append, folder.url);
		browser.moreButton.hidden = !browser.nextPageToken;
	} catch (error) {
		if (requestId !== browser.requestId) return;
		console.error("Error loading files from Google Drive:", error);
		renderDriveError(browser, `ERROR LOADING FILES // ${error.message}`);
	}
}
function openDriveBrowser(targetUrl, trigger) {
	const folderId = getDriveFolderId(targetUrl);
	if (!folderId) {
		window.location.assign(targetUrl);
		return;
	}
	if (!driveBrowser) driveBrowser = createDriveBrowser();
	driveBrowser.lastFocusedElement = trigger;
	driveBrowser.path = [
		{
			id: folderId,
			name: trigger.textContent.trim(),
			url: targetUrl,
		},
	];
	driveBrowser.nextPageToken = "";
	driveBrowser.element.hidden = false;
	document.body.classList.add("drive-browser-open");
	loadDriveFolder(driveBrowser);
	driveBrowser.closeButton.focus();
}
function getLogsContainer() {
	return (
		document.getElementById("logs") ||
		document.querySelector(".sector-rawlogs .sector-title + div")
	);
}
// Keep the timestamp separate so wrapped text has a consistent hanging indent.
function appendLogLine(text, real = false) {
	const container = getLogsContainer();
	if (!container) return;
	if (real) lastRealLogAt = Date.now();
	const line = document.createElement("div");
	line.className = real ? "log-line real-log" : "log-line ambient-log";
	const stamp = document.createElement("time");
	stamp.className = "log-timestamp";
	const now = new Date();
	stamp.dateTime = now.toISOString();
	stamp.textContent = `[${now.toLocaleTimeString("en-US", { hour12: false })}]`;
	const body = document.createElement("div");
	body.className = "log-body";
	if (typeof text === "object" && Array.isArray(text.usage)) {
		const prefix = document.createElement("span");
		prefix.className = "log-prefix";
		prefix.textContent = "CMD // ";
		body.appendChild(prefix);
		text.usage.forEach((usage, index) => {
			const variant = document.createElement("code");
			variant.className = "log-command";
			// Pipes are actual argument separators, never separators between variants.
			usage.split(/\s*\|\s*/).forEach((part, partIndex) => {
				const group = document.createElement("span");
				group.className = "log-command-group";
				group.textContent = `${partIndex ? "| " : ""}${part}`;
				if (partIndex) variant.appendChild(document.createTextNode(" "));
				variant.appendChild(group);
			});
			if (index) body.appendChild(document.createElement("br"));
			body.appendChild(variant);
		});
		const description = document.createElement("span");
		description.className = "log-description";
		description.textContent = `// ${text.description}`;
		body.appendChild(description);
	} else {
		body.textContent = String(text);
	}
	line.append(stamp, body);
	container.appendChild(line);
	while (container.childElementCount > 30) container.firstElementChild.remove();
	if (window.matchMedia("(max-width: 900px)").matches) {
		container.scrollTop = container.scrollHeight;
	}
}

function normalizeCustomSector(value, sectors = customSectors) {
	const normalized = value.trim().toLowerCase();
	const exact = sectors.find((sector) => sector.id === normalized);
	if (exact) return exact.id;
	const position = normalized.match(/^(?:setor|sector)?(\d+)$/);
	if (position) return sectors[Number(position[1]) - 1]?.id || "";
	return "";
}

function applyLinks(data) {
	customLinks = data.links;
	customSectors = data.sectors;
	customAliases = data.aliases || {};
	renderCustomLinks();
}

async function mutateLinks(change) {
	if (!linkStore)
		throw new Error(
			"Local storage unavailable. Check the site data permission in the browser.",
		);
	await linkStore.mutate(change);
}

function createCustomLinkElement(link) {
	const element = document.createElement("a");
	element.dataset.customLink = link.id;
	element.href = link.url;
	element.textContent = link.label;
	element.title = `ID: ${link.id}`;
	element.addEventListener("click", (event) => {
		if (!getDriveFolderId(link.url)) return;
		event.preventDefault();
		openDriveBrowser(link.url, element);
	});
	return element;
}

function renderCustomLinks() {
	const container = document.getElementById("link-sectors");
	if (!container) return;
	container.replaceChildren();
	customSectors.forEach((sector, index) => {
		const element = document.createElement("section");
		element.className = "sector";
		element.dataset.customSector = sector.id;
		const title = document.createElement("span");
		title.className = "sector-title";
		title.textContent = `/// SECTOR_${String(index + 1).padStart(2, "0")} [${sector.label}]`;
		element.appendChild(title);
		customLinks
			.filter((link) => link.sector === sector.id)
			.forEach((link) =>
				element.appendChild(createCustomLinkElement(link)),
			);
		container.appendChild(element);
	});
	if (!customSectors.length) {
		const hint = document.createElement("p");
		hint.textContent = "Create a sector: sector add <id> | <name>";
		container.appendChild(hint);
	}
}

function normalizeCustomUrl(value) {
	if (value.startsWith("/") && !value.startsWith("//")) return value;
	const candidate =
		/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
	const url = new URL(candidate);
	if (!["http:", "https:"].includes(url.protocol) || /\s/.test(value)) {
		throw new Error(
			"Use an http:// or https:// URL, or a path starting with /.",
		);
	}
	return url.href;
}

function findLink(links, query) {
	const matches = links.filter(
		(link) =>
			link.id.toLowerCase() === query.toLowerCase() ||
			link.label.toLowerCase() === query.toLowerCase(),
	);
	if (!matches.length) throw new Error(`Link not found: ${query}`);
	if (matches.length > 1)
		throw new Error("Repeated name. Use the ID shown in list.");
	return matches[0];
}

function showCommandHelp(filter) {
	commands
		.filter((entry) => !filter || entry.command.includes(filter))
		.forEach((entry) => appendLogLine(entry, true));
}

async function executeCommand(rawCommand, visited = new Set()) {
	const command = rawCommand.trim();
	if (!command) return true;
	const word = command.split(/\s+/)[0].toLowerCase();
	if (visited.has(word) || visited.size >= 20)
		throw new Error("Alias cycle detected.");
	if (/^(help|usage)$/i.test(command)) {
		showCommandHelp();
		return true;
	}
	if (/^\w+\s+(--help|-h)$/i.test(command)) {
		showCommandHelp(word);
		return true;
	}
	if (/^export$/i.test(command)) {
		if (!linkStore) throw new Error("Local storage unavailable.");
		const data = await linkStore.read();
		const url = URL.createObjectURL(
			new Blob([JSON.stringify(data, null, 2) + "\n"], {
				type: "application/json",
			}),
		);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "homepage-backup.json";
		anchor.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		appendLogLine("CMD // BACKUP EXPORTED", true);
		return true;
	}
	if (/^import$/i.test(command)) {
		if (!linkStore) throw new Error("Local storage unavailable.");
		const picker = document.createElement("input");
		picker.type = "file";
		picker.accept = ".json,application/json";
		picker.addEventListener("change", async () => {
			const file = picker.files?.[0];
			if (!file) return;
			try {
				if (file.size > 5 * 1024 * 1024)
					throw new Error("Backup larger than 5 MB.");
				const data = JSON.parse(await file.text());
				const { validateState } = await import("./model.js");
				validateState(data);
				if (
					!window.confirm(
						`Overwrite the current data with ${data.links.length} links and ${data.sectors.length} sectors from this backup?`,
					)
				)
					return;
				await linkStore.replace(data);
				appendLogLine("CMD // BACKUP IMPORTED AND SAVED", true);
			} catch (error) {
				appendLogLine(
					`CMD // IMPORT ERROR: ${error.message}`,
					true,
				);
			}
		});
		picker.click();
		return true;
	}
	if (/^(clear|cls)$/i.test(command)) {
		getLogsContainer()?.replaceChildren();
		return true;
	}
	if (/^(clearlinks|cl)$/i.test(command)) {
		await mutateLinks((data) => {
			data.links = [];
		});
		appendLogLine("CMD // ALL LINKS REMOVED AND SAVED", true);
		return true;
	}
	if (word === "sector") {
		const list = /^sector(?:\s+list)?$/i.test(command);
		if (list) {
			customSectors.forEach((sector, index) =>
				appendLogLine(
					`CMD // ${index + 1}: ${sector.id} [${sector.label}]`,
					true,
				),
			);
			if (!customSectors.length)
				appendLogLine("CMD // No sectors found.", true);
			return true;
		}
		const add = command.match(
			/^sector\s+add\s+([a-z][a-z0-9_-]{0,39})(?:\s*\|\s*(.+))?$/i,
		);
		const rename = command.match(/^sector\s+rename\s+(\S+)\s*\|\s*(.+)$/i);
		const move = command.match(/^sector\s+move\s+(\S+)\s+(\d+)$/i);
		const remove = command.match(/^sector\s+remove\s+(\S+)(?:\s+(\S+))?$/i);
		if (!(add || rename || move || remove))
			throw new Error("Use sector --help.");
		await mutateLinks((data) => {
			if (add) {
				const id = add[1].toLowerCase();
				if (data.sectors.some((sector) => sector.id === id))
					throw new Error("This sector already exists.");
				data.sectors.push({
					id,
					label: (add[2] || id).trim().toUpperCase(),
				});
				return;
			}
			const match = rename || move || remove;
			const id = normalizeCustomSector(match[1], data.sectors);
			const index = data.sectors.findIndex((sector) => sector.id === id);
			if (index < 0) throw new Error("Sector not found.");
			if (rename) {
				data.sectors[index].label = rename[2].trim().toUpperCase();
				return;
			}
			if (move) {
				const target = Number(move[2]) - 1;
				if (target < 0 || target >= data.sectors.length)
					throw new Error("Position out of sector list range.");
				data.sectors.splice(
					target,
					0,
					data.sectors.splice(index, 1)[0],
				);
				return;
			}
			const destination =
				remove[2] ? normalizeCustomSector(remove[2], data.sectors) : "";
			if (remove[2] && (!destination || destination === id))
				throw new Error("Invalid destination.");
			if (!destination && data.links.some((link) => link.sector === id)) {
				throw new Error(
					"Sector contains links. Use sector remove <source> <destination> to move them.",
				);
			}
			data.links.forEach((link) => {
				if (link.sector === id) link.sector = destination;
			});
			data.sectors.splice(index, 1);
		});
		appendLogLine("CMD // SECTORS SAVED", true);
		return true;
	}
	const add =
		command.match(/^add\s+(\w+)\s*\|\s*([^|]+)\s*\|\s*(.+)$/i) ||
		command.match(/^add\s+(\w+)\s+(.+?)\s+(\S+)$/i);
	if (add) {
		const sector = normalizeCustomSector(add[1]);
		if (!sector)
			throw new Error("Invalid sector. Use sector list to see the IDs.");
		// Generate an ID- prefix followed by eight random hexadecimal characters.
		const link = {
			id: `ID-${Math.random().toString(16).substr(2, 8).toUpperCase()}`,
			sector,
			label: add[2].trim().toUpperCase(),
			url: normalizeCustomUrl(add[3].trim()),
		};
		await mutateLinks((data) => {
			data.links.push(link);
		});
		appendLogLine(`CMD // SAVED: ${link.label} [${link.id}]`, true);
		return true;
	}
	const edit = command.match(/^edit\s+([^|]+)\s*\|\s*(.+)$/i);
	if (edit) {
		const query = edit[1].trim();
		const fields = edit[2].split("|").map((field) => field.trim());
		if (![1, 3].includes(fields.length))
			throw new Error(
				"Use edit <ID/name> | <url> or edit <ID/name> | <sector> | <name> | <url>.",
			);
		const url = normalizeCustomUrl(fields.at(-1));
		const sector =
			fields.length === 3 ? normalizeCustomSector(fields[0]) : null;
		if (fields.length === 3 && (!sector || !fields[1]))
			throw new Error("Use a valid sector and name.");
		await mutateLinks((data) => {
			const link = findLink(data.links, query);
			link.url = url;
			if (fields.length === 3) {
				link.sector = sector;
				link.label = fields[1].toUpperCase();
			}
		});
		appendLogLine(`CMD // CHANGE SAVED: ${query}`, true);
		return true;
	}
	const list = command.match(/^(list|ls)(?:\s+(\S+))?$/i);
	if (list) {
		const sector = list[2] ? normalizeCustomSector(list[2]) : "";
		if (list[2] && !sector) throw new Error("Invalid sector.");
		const links = customLinks.filter(
			(link) => !sector || link.sector === sector,
		);
		if (!links.length) appendLogLine("CMD // No links saved.", true);
		links.forEach((link) =>
			appendLogLine(
				`CMD // [${link.id}] ${link.sector.toUpperCase()} // ${link.label} // ${link.url}`,
				true,
			),
		);
		return true;
	}
	const remove = command.match(/^(remove|rm)\s+(.+)$/i);
	if (remove) {
		await mutateLinks((data) => {
			const link = findLink(data.links, remove[2].trim());
			data.links = data.links.filter((item) => item.id !== link.id);
		});
		appendLogLine(`CMD // REMOVAL SAVED: ${remove[2]}`, true);
		return true;
	}
	const alias = command.match(/^alias\s+(\w+)\s*=\s*(["'])(.+)\2$/i);
	if (alias) {
		const name = alias[1].toLowerCase();
		if (
			["__proto__", "prototype", "constructor"].includes(name) ||
			commands.some((entry) => entry.command.includes(name))
		)
			throw new Error("Reserved alias name.");
		await mutateLinks((data) => {
			data.aliases[name] = alias[3];
		});
		appendLogLine(`CMD // ALIAS SAVED: ${name}`, true);
		return true;
	}
	const unalias = command.match(/^unalias\s+(\w+)$/i);
	if (unalias) {
		await mutateLinks((data) => {
			const name = unalias[1].toLowerCase();
			if (!Object.hasOwn(data.aliases, name))
				throw new Error("Alias not found.");
			delete data.aliases[name];
		});
		appendLogLine("CMD // ALIAS REMOVED", true);
		return true;
	}
	if (/^aliases$/i.test(command)) {
		const entries = Object.entries(customAliases);
		if (!entries.length) appendLogLine("CMD // No aliases saved.", true);
		entries.forEach(([name, value]) =>
			appendLogLine(`CMD // ${name} => ${value}`, true),
		);
		return true;
	}
	if (Object.hasOwn(customAliases, word)) {
		visited.add(word);
		return executeCommand(
			customAliases[word] + command.slice(word.length),
			visited,
		);
	}
	if (commands.some((entry) => entry.command.includes(word)))
		throw new Error(`Invalid syntax. Use ${word} --help.`);
	return false;
}

async function getRandomLogLines() {
	try {
		const response = await fetch("js/log-lines.json");
		if (!response.ok) return [];
		const data = await response.json();
		return Array.isArray(data?.keys?.items) ? data.keys.items : [];
	} catch {
		return [];
	}
}

async function initializeLinks() {
	try {
		const [response, helpResponse] = await Promise.all([
			fetch("js/links.json", { cache: "no-store" }),
			fetch("js/commandsList.json"),
		]);
		if (!response.ok || !helpResponse.ok)
			throw new Error(
				"Could not read initial data / commands.",
			);
		const { validateState } = await import("./model.js");
		seedState = validateState(await response.json());
		commands = (await helpResponse.json()).commands;
		applyLinks(structuredClone(seedState));
		const { installAutocomplete } = await import("./autocomplete.js");
		installAutocomplete(cmdInput, () => ({
			commands,
			sectors: customSectors,
			links: customLinks,
			aliases: customAliases,
		}));
		const { createLinkStore } = await import("./link-store.js");
		linkStore = await createLinkStore({
			seedState,
			onData: applyLinks,
			onStatus: (message) => {
				document.getElementById("sync-status").textContent = message;
			},
			onError: (error) =>
				appendLogLine(`NET // ${error.message}`, true),
		});
	} catch (error) {
		console.error("Error initializing links:", error);	
		document.getElementById("sync-status").textContent =
			"NET: LINKS UNAVAILABLE";
		appendLogLine(`NET // ${error.message}`, true);
	}
}

document.addEventListener("DOMContentLoaded", async () => {
	// --- INITIALIZATION ---
	// Start the clock.
	// --- DIGITAL CLOCK ---
	function updateClock() {
		const now = new Date();
		const timeString = now.toLocaleTimeString("en-US", { hour12: false });
		const clockEl = document.getElementById("clock");
		if (clockEl) clockEl.innerText = timeString;
	}
	setInterval(updateClock, 1000);
	updateClock();
	cmdInput = document.getElementById("cmd");
	if (window.matchMedia("(min-width: 901px) and (pointer: fine)").matches) cmdInput?.focus();
	// Keep the mobile terminal above on-screen keyboards that overlay the layout.
	if (window.visualViewport) {
		const updateTerminalPosition = () => {
			const mobileInput = window.matchMedia("(max-width: 900px)").matches
				&& document.activeElement === cmdInput;
			const viewport = window.visualViewport;
			const offset = mobileInput ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
			document.documentElement.style.setProperty("--terminal-bottom", `${offset}px`);
		};
		window.visualViewport.addEventListener("resize", updateTerminalPosition);
		window.visualViewport.addEventListener("scroll", updateTerminalPosition);
		cmdInput?.addEventListener("focus", updateTerminalPosition);
		cmdInput?.addEventListener("blur", updateTerminalPosition);
	}
	void initializeLinks();
	let busy = false;
	cmdInput?.addEventListener("keydown", async function (event) {
		if (
			event.defaultPrevented ||
			event.key !== "Enter" ||
			event.isComposing ||
			busy
		)
			return;
		const value = this.value.trim();
		if (!value) return;
		busy = true;
		this.readOnly = true;
		try {
			if (!(await executeCommand(value))) {
				window.location.href =
					"https://google.com/search?q=" + encodeURIComponent(value);
			}
			this.value = "";
		} catch (error) {
			console.error("Error executing command:", error);
			appendLogLine(`CMD // ERROR: ${error.message}`, true);
		} finally {
			busy = false;
			this.readOnly = false;
		}
	});

	function initRandomLogs() {
		const lines = getRandomLogLines();
		(async function tick() {
			if (Date.now() - lastRealLogAt > 10000) {
				const entries = await lines;
				if (entries.length)
					appendLogLine(
						entries[Math.floor(Math.random() * entries.length)],
					);
			}
			setTimeout(tick, 1000 + Math.random() * 2000);
		})();
	}

	initRandomLogs();
	function initGlobalGlitchEffect() {
		const glitchChars = '!@#$%^&*()-_=+[]{}|;:",.<>?/\\';
		const revertDelay = Math.floor(Math.random() * 200) + 600; // Restore text after 600 to 800 ms.
		const interval = Math.floor(Math.random() * 10000) + 5000; // Apply the effect every 5 to 15 seconds.
		function collectTextNodes(root) {
			const nodes = [];
			const walker = document.createTreeWalker(
				root,
				NodeFilter.SHOW_TEXT,
				null,
				false,
			);
			let current;
			while ((current = walker.nextNode())) {
				if (
					!current.parentElement.closest(
						"#input-zone, #sync-status, #logs, #clock",
					) &&
					current.textContent &&
					current.textContent.trim().length
				) {
					nodes.push(current);
				}
			}
			return nodes;
		}
		function applyGlitch() {
			if (window.matchMedia("(max-width: 900px), (prefers-reduced-motion: reduce)").matches) return;
			const textNodes = collectTextNodes(document.body);
			if (!textNodes.length) return;
			const affected = new Map();
			const glitches = Math.floor(Math.random() * 20) + 1; // Apply 1 to 20 glitches per cycle.
			for (let i = 0; i < glitches; i++) {
				const node =
					textNodes[Math.floor(Math.random() * textNodes.length)];
				if (!node || !node.textContent || !node.textContent.length)
					continue;
				if (!affected.has(node)) {
					affected.set(node, node.textContent);
				}
				const baseText = node.textContent;
				const charIndex = Math.floor(Math.random() * baseText.length);
				const replacement =
					glitchChars[Math.floor(Math.random() * glitchChars.length)];
				node.textContent =
					baseText.slice(0, charIndex) +
					replacement +
					baseText.slice(charIndex + 1);
			}
			setTimeout(() => {
				affected.forEach((original, node) => {
					node.textContent = original;
				});
			}, revertDelay);
		}
		applyGlitch();
		setInterval(applyGlitch, interval);
	}
	initGlobalGlitchEffect(); // Apply the global text glitch effect.
	// --- AUTOMATIC INPUT FOCUS ---
	document.addEventListener("click", (event) => {
		if (
			window.matchMedia("(min-width: 901px) and (pointer: fine)").matches &&
			cmdInput &&
			!event.target.closest("a, button, input, .drive-browser")
		)
			cmdInput.focus();
	});
});
// Update the displayed network status when connectivity changes.
window.addEventListener("load", () => {
	const statusEl = document.getElementById("status");
	if (!statusEl) return;
	function updateNetworkStatus() {
		const isOnline = navigator.onLine;
		statusEl.innerText = isOnline ? "ONLINE" : "OFFLINE";
		renderCustomLinks();
	}
	window.addEventListener("online", updateNetworkStatus);
	window.addEventListener("offline", updateNetworkStatus);
	updateNetworkStatus();
});
// Generate a random hexadecimal node ID for display.
window.addEventListener("load", () => {
	const nodeIdEl = document.getElementById("node-id");
	if (nodeIdEl) {
		const randomId = Math.random().toString(16).slice(2, 10).toUpperCase();
		nodeIdEl.innerText = randomId;
	}
});
// Keep the current pathname in the address bar.
if (window.history && window.history.replaceState) {
	window.history.replaceState({}, document.title, window.location.pathname);
}
