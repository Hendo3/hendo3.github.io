// Escopo elevado para acesso em outros listeners
let cmdInput;


const hiddenLinkTargets = {
	1: () => randomizeUrlValue('https://github.com/Hendo3'),
	2: () => 'https://mail.google.com/',
	3: () => 'https://mail.proton.me',
	4: () => 'https://temp-mail.org/pt/',
	5: () => 'https://gemini.google.com/',
	6: () => {
		const hostname = window.location.hostname;
		const port = window.location.port ? `:${window.location.port}` : '';
		return `http://${hostname}${port}`;
	},
	7: () => 'https://youtube.com',
	8: () => 'https://spotify.com',
	9: () => 'https://web.whatsapp.com',
	10: () => 'https://www.crunchyroll.com',
	11: () => 'https://mangadex.org',
	12: () => 'https://drive.google.com/drive/u/0/folders/1le1H6tlSb3wk-pdka0BMKyTNzB6IydFt',
	13: () => 'https://drive.google.com/drive/u/0/folders/1ANMek8NrkyQih9o_h6_mWjPX--UhbeZw',
	14: () => 'https://drive.google.com/drive/u/0/folders/1A8AOrQb1yPZRYvcEqesOohAE04yO0-eo',
	15: () => 'https://drive.google.com/drive/u/0/folders/1oneeFAeYPraeiroYLA1t0SSRFqNoKIgm',
	16: () => 'https://gmail.com',
	17: () => 'https://tuta.com',
	18: () => 'https://store.playstation.com/pt-br/',
	19: () => 'https://translate.google.com'
};

function getRandomLogLines() {
	// get log-lines.json js/log-lines.json and return as array of strings
	const lines = fetch('js/log-lines.json')
		.then(response => response.json())
		.then(data => {
			if (data && data.keys && data.keys.items) {
				console.log('Fetched log lines:', data.keys.items);
				let lines = data.keys.items;
				if (Array.isArray(lines)) {
					return lines;
			} else {
				console.error('Invalid log lines data structure:', data);
				return lines;
			}
		} else {
			console.error('Invalid log lines data structure:', data);
			return lines;
		}
	})
		.catch(error => {
			console.error('Error fetching log lines:', error);
			return lines;
		});
	console.log('Log lines:', lines);
	return lines.finally(() => {
		console.log('Finished fetching log lines.');
	});
}

function resolveHiddenLink(linkId) {
	const target = hiddenLinkTargets[linkId];
	return typeof target === 'function' ? target() : '';
}

function bindHiddenLinks() {
	document.querySelectorAll('[data-link]').forEach((linkEl) => {
		const openLink = () => {
			const targetUrl = resolveHiddenLink(linkEl.dataset.link);
			if (!targetUrl) return;
			window.location.assign(targetUrl);
		};

		linkEl.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			openLink();
		});

		linkEl.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				openLink();
			}
		});
	});
}

function lockLinkCopying() {
	document.querySelectorAll('a[data-link]').forEach((linkEl) => {
		linkEl.draggable = false;

		linkEl.addEventListener('contextmenu', (event) => {
			event.preventDefault();
		});

		linkEl.addEventListener('dragstart', (event) => {
			event.preventDefault();
		});

		linkEl.addEventListener('selectstart', (event) => {
			event.preventDefault();
		});
	});
}

document.addEventListener('DOMContentLoaded', () => {
	// --- RELÓGIO DIGITAL ---
	function updateClock() {
		const now = new Date();
		const timeString = now.toLocaleTimeString('en-US', { hour12: false });
		const clockEl = document.getElementById('clock');
		if (clockEl) clockEl.innerText = timeString;
	}
	setInterval(updateClock, 1000);
	updateClock();
	bindHiddenLinks();
	lockLinkCopying();

	// --- SISTEMA DE BUSCA ---
	cmdInput = document.getElementById('cmd');
	if (cmdInput) {
		cmdInput.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				const val = this.value.trim();
				if (val) {
					// Se existir uma função executeCommand definida em outro script, usa. Senão ignora silenciosamente.
					if (typeof executeCommand === 'function') {
						executeCommand(val);
					}
					this.value = '';
					// Redireciona para busca (mantido comportamento original)
					window.location.href = "https://google.com/search?q=" + encodeURIComponent(val);
				}
			}
		});
	}

	// --- LOGS ALEATÓRIOS ---
	function initRandomLogs() {
		const container = document.getElementById('logs') || document.querySelector('.sector-rawlogs .sector-title + div');
		if (!container) return;

		const lines = getRandomLogLines();

		const maxLines = 30;

		function appendLine(text) {
			const p = document.createElement('p');
			const stamp = new Date().toLocaleTimeString('en-US', { hour12: false });
			p.textContent = `[${stamp}] ${text}`;
			container.appendChild(p);

			while (container.childElementCount > maxLines) {
				container.removeChild(container.firstElementChild);
			}
			container.scrollTop = container.scrollHeight;
		}

		// pega uma linha aleatória do array de logs e adiciona ao container
		async function addRandomLogLine() {
			const resolvedLines = await lines;
			if (!resolvedLines || !resolvedLines.length) return;

			const randomLine = resolvedLines[Math.floor(Math.random() * resolvedLines.length)];
			appendLine(randomLine);
		}
		// Loop com intervalo variável
		(function tick() {
			const next = 800 + Math.random() * 1700;
			addRandomLogLine();
			setTimeout(tick, next);
		})();
	}

	initRandomLogs();

	function initGlobalGlitchEffect() {
		const glitchChars = '!@#$%^&*()-_=+[]{}|;:",.<>?/\\';
		const revertDelay = 400;
		const interval = 10000; 

		function collectTextNodes(root) {
			const nodes = [];
			const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
			let current;
			while ((current = walker.nextNode())) {
				if (current.textContent && current.textContent.trim().length) {
					nodes.push(current);
				}
			}
			return nodes;
		}

		function applyGlitch() {
			const textNodes = collectTextNodes(document.body);
			if (!textNodes.length) return;

			const affected = new Map();
			const glitches = Math.floor(Math.random() * 20) + 1; // aplica entre 1 e 20 glitches por ciclo 

			for (let i = 0; i < glitches; i++) {
				const node = textNodes[Math.floor(Math.random() * textNodes.length)];
				if (!node || !node.textContent || !node.textContent.length) continue;

				if (!affected.has(node)) {
					affected.set(node, node.textContent);
				}

				const baseText = node.textContent;
				const charIndex = Math.floor(Math.random() * baseText.length);
				const replacement = glitchChars[Math.floor(Math.random() * glitchChars.length)];
				node.textContent = baseText.slice(0, charIndex) + replacement + baseText.slice(charIndex + 1);
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

	initGlobalGlitchEffect(); // a cada 10 segundos, aplica o efeito global de glitch em textos da página durante 400ms 

	// --- SISTEMA DE FOCO AUTOMÁTICO ---
	document.addEventListener('click', () => {
		if (cmdInput) cmdInput.focus();
	});
});

// verifica o status da rede a cada 15 segundos e atualiza o status na interface
window.addEventListener('load', () => {
	const statusEl = document.getElementById('status');
	if (!statusEl) return;

	function updateNetworkStatus() {
		const isOnline = navigator.onLine;
		statusEl.innerText = isOnline ? 'ONLINE' : 'OFFLINE';
	}

	window.addEventListener('online', updateNetworkStatus);
	window.addEventListener('offline', updateNetworkStatus);
	updateNetworkStatus();
});

// geração de ID de nó aleatório hexadecimal para exibição
window.addEventListener('load', () => {
	const nodeIdEl = document.getElementById('node-id');
	if (nodeIdEl) {
		const randomId = Math.random().toString(16).slice(2, 10).toUpperCase();
		nodeIdEl.innerText = randomId;
	}
});

// mascarar url da barra de endereços
if (window.history && window.history.replaceState) {
	window.history.replaceState({}, document.title, window.location.pathname);
}