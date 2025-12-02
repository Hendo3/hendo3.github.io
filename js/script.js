// Escopo elevado para acesso em outros listeners
let cmdInput;

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

	function updateLocalhostLink() {
		const localhostLink = document.getElementById('localhost');
		if (localhostLink) {
			const hostname = window.location.hostname;
			const port = window.location.port ? `:${window.location.port}` : '';
			localhostLink.href = `http://${hostname}${port}`;
		}
	}

	// --- OBTENÇÃO / DEFINIÇÃO DE USUÁRIO ---
	function getLoggedUsername() {
		// Browsers não expõem usuário do SO por segurança. Estratégia:
		// 1. Usa localStorage.
		// 2. Se não existir, solicita via prompt uma única vez.
		// 3. Fallback para um identificador derivado do userAgent.
		let stored = localStorage.getItem('username');
		if (!stored) {
			stored = prompt('Digite seu usuário:')?.trim();
			if (stored) {
				localStorage.setItem('username', stored);
			} else {
				stored = navigator.userAgent.split(' ')[0];
			}
		}
		return stored;
	}

	// --- AES-GCM (Web Crypto) ---
	function bytesToBase64(bytes) {
		let bin = '';
		const arr = new Uint8Array(bytes);
		for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
		return btoa(bin);
	}

	function base64ToArrayBuffer(b64) {
		const bin = atob(b64);
		const len = bin.length;
		const buf = new ArrayBuffer(len);
		const arr = new Uint8Array(buf);
		for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
		return buf;
	}

	async function getOrCreateAesKey() {
		const existing = localStorage.getItem('aes_key_b64');
		if (existing) {
			const raw = base64ToArrayBuffer(existing);
			return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
		}
		const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
		const raw = await crypto.subtle.exportKey('raw', key);
		localStorage.setItem('aes_key_b64', bytesToBase64(raw));
		return key;
	}

	async function encryptAesGcm(plaintext) {
		const enc = new TextEncoder();
		const data = enc.encode(plaintext);
		const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recomendado
		const key = await getOrCreateAesKey();
		const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
		return { ciphertextB64: bytesToBase64(cipherBuf), ivB64: bytesToBase64(iv) };
	}

	async function setUserName() {
		const user = getLoggedUsername();
		const promptSign = document.querySelector('.prompt-sign');
		if (promptSign) promptSign.innerText = `${user}@error:> `;

		const encryptedEl = document.getElementById('encryptedUser');
		if (!window.crypto || !window.crypto.subtle) {
			if (encryptedEl) encryptedEl.innerText = 'WebCrypto indisponível (requer contexto seguro: https:// ou localhost)';
			return;
		}
		try {
			const { ciphertextB64, ivB64 } = await encryptAesGcm(user);
			if (encryptedEl) encryptedEl.innerText = ciphertextB64;
			localStorage.setItem('user_encrypted_gcm', ciphertextB64);
			localStorage.setItem('user_iv_b64', ivB64);
		} catch (err) {
			console.error('Falha ao criptografar com AES-GCM:', err);
			if (encryptedEl) encryptedEl.innerText = 'Erro de criptografia';
		}
	}

	setUserName();

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