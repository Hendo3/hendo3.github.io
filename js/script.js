// Escopo elevado para acesso em outros listeners
let cmdInput;

function updateLocalhostLink() {
	const localhostLink = document.getElementById('localhost');
	if (localhostLink) {
		const hostname = window.location.hostname;
		const port = window.location.port ? `:${window.location.port}` : '';
		localhostLink.href = `http://${hostname}${port}`;
	}
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

	// Chama a função para atualizar o link ao carregar a página
	updateLocalhostLink();

	// --- LOGS ALEATÓRIOS ---
	function initRandomLogs() {
		const container = document.getElementById('logs') || document.querySelector('.sector-rawlogs .sector-title + div');
		if (!container) return;

		const lines = [
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
			const glitches = Math.floor(Math.random() * 20) + 1;

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

	initGlobalGlitchEffect();

	// --- SISTEMA DE FOCO AUTOMÁTICO ---
	document.addEventListener('click', () => {
		if (cmdInput) cmdInput.focus();
	});
});

// Simulação de status aleatório ao carregar
window.addEventListener('load', () => {
	const statuses = ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'UPDATING'];
	const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
	const statusEl = document.getElementById('status');
	if (statusEl) statusEl.innerText = randomStatus;
});

window.addEventListener('load', () => {
	updateLocalhostLink();
});

// mascarar url da barra de endereços
if (window.history && window.history.replaceState) {
	window.history.replaceState({}, document.title, window.location.pathname);
}