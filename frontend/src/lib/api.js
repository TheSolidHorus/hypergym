// Helper per ottenere l'URL corretto del backend

// 🌐 Per usare NGROK (tunnel pubblico):
// 1. Avvia: AVVIA_NGROK.bat
// 2. Copia URL (es: https://abc123.ngrok-free.app)
// 3. Incolla qui sotto:
const NGROK_URL = ''; // ← INCOLLA QUI (lascia vuoto per IP locale)

export function getApiUrl() {
    // 1. Se hai configurato NGROK, usalo (funziona SEMPRE, da qualsiasi rete!)
    if (NGROK_URL) {
        if (import.meta.env.DEV) console.log('[API] 🌐 Usando NGROK:', NGROK_URL);
        return NGROK_URL;
    }

    // 2. Controlla variabile d'ambiente
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) {
        if (import.meta.env.DEV) console.log('[API] Usando .env:', envUrl);
        return envUrl;
    }

    // 3. Auto-rilevamento per sviluppo locale
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

    const isAndroid = /android/i.test(userAgent);
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';

    // A-02: Log solo in sviluppo, mai in produzione
    if (import.meta.env.DEV) console.log('[API] 📱 Ambiente:', { isAndroid, hostname });

    // Web browser locale
    if (isLocalhost && !isAndroid) {
        if (import.meta.env.DEV) console.log('[API] 💻 Web dev → http://localhost:8000');
        return 'http://localhost:8000';
    }

    // Emulatore Android
    if (isAndroid && isLocalhost) {
        if (import.meta.env.DEV) console.log('[API] 📱 Emulatore → http://10.0.2.2:8000');
        return 'http://10.0.2.2:8000';
    }

    // A-03: IP del telefono fisico → ora da variabile d'ambiente VITE_BACKEND_IP
    if (isAndroid) {
        const pcIp = import.meta.env.VITE_BACKEND_IP || 'http://localhost:8000';
        if (import.meta.env.DEV) console.log('[API] 📱 Telefono → ' + pcIp);
        return pcIp;
    }

    // Fallback
    return 'http://localhost:8000';
}

export const API_URL = getApiUrl();

// A-02: Log URL backend solo in sviluppo
if (import.meta.env.DEV) console.log('[API] ✅ URL Backend:', API_URL);
