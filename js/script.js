// Escopo elevado para acesso em outros listeners
let cmdInput;


const hiddenLinkTargets = {
	1: () => 'https://github.com/Hendo3',
	2: () => 'https://mail.google.com/',
	3: () => 'https://temp-mail.org/pt/',
	4: () => 'https://gemini.google.com/',
	5: () => {
		const hostname = window.location.hostname;
		const port = window.location.port ? `:${window.location.port}` : '';
		return `http://${hostname}${port}`;
	},
	6: () => 'https://youtube.com',
	7: () => 'https://spotify.com',
	8: () => 'https://web.whatsapp.com',
	9: () => 'https://www.crunchyroll.com',
	10: () => 'https://mangadex.org',
	11: () => 'https://drive.google.com/drive/u/0/folders/1le1H6tlSb3wk-pdka0BMKyTNzB6IydFt',
	12: () => 'https://drive.google.com/drive/u/0/folders/1ANMek8NrkyQih9o_h6_mWjPX--UhbeZw',
	13: () => 'https://drive.google.com/drive/u/0/folders/1A8AOrQb1yPZRYvcEqesOohAE04yO0-eo',
	14: () => 'https://drive.google.com/drive/u/0/folders/1oneeFAeYPraeiroYLA1t0SSRFqNoKIgm',
	15: () => 'https://gmail.com',
	16: () => 'https://tuta.com',
	17: () => 'https://store.playstation.com/pt-br/',
	18: () => 'https://translate.google.com'
};

function getRandomLogLines() {
	if (Array.isArray(window.CYBERPUNK_LOG_LINES) && window.CYBERPUNK_LOG_LINES.length) {
		return window.CYBERPUNK_LOG_LINES;
	}

	return [
		'> initializing protocols...',
		'> loading custom.css... OK',
		'> connection secure',
		'> waiting for input...',
		'> handshake established',
		'> cache warmed',
		'> memcheck: clean',
		'> ping: 12ms',
		'> dns resolve: ok',
		'> watchdog: active',
		'> auth token refreshed',
		'> syncing time with NTP',
		'> io throughput stable',
		'> gc cycle complete',
		'> updating routes',
		'> link-layer: stable',
		'> entropy source: healthy',
		'> task queued',
		'> task complete',
		'> standby...'
	];
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

		// Semeia algumas linhas iniciais
		for (let i = 0; i < 4; i++) appendLine(lines[i]);

		// Loop com intervalo variável
		(function tick() {
			const next = 800 + Math.random() * 1700;
			appendLine(lines[Math.floor(Math.random() * lines.length)]);
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

// Simulação de status aleatório ao carregar
//window.addEventListener('load', () => {
//	const statuses = ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'UPDATING'];
//	const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
//	const statusEl = document.getElementById('status');
//	if (statusEl) statusEl.innerText = randomStatus;
//});

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