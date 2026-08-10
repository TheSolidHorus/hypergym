import { useState, useEffect } from 'react';

export default function InstallPrompt() {
    const [isInstallable, setIsInstallable] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(true); // Default a true per evitare flash
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Controlla se l'utente ha già chiuso il banner
        if (localStorage.getItem('pwa_prompt_dismissed')) {
            setIsDismissed(true);
            return;
        }

        // Controlla se siamo già in modalità app
        const checkStandalone = () => {
            const isStandAloneMatch = window.matchMedia('(display-mode: standalone)').matches;
            const isIOSStandalone = window.navigator.standalone === true;
            return isStandAloneMatch || isIOSStandalone;
        };
        
        const standalone = checkStandalone();
        setIsStandalone(standalone);

        if (standalone) return; // Se già installata, nascondi tutto

        // Rileva iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Per iOS mostriamo il prompt manuale subito se non è standalone e non è stato chiuso
        if (isIosDevice) {
            setIsInstallable(true);
        }

        // Per Android/Chrome, intercettiamo l'evento PWA nativo
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Ascolta se l'installazione va a buon fine
        window.addEventListener('appinstalled', () => {
            setIsInstallable(false);
            setDeferredPrompt(null);
            setIsStandalone(true);
        });

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Android nativo
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstallable(false);
            }
            setDeferredPrompt(null);
        } else if (isIOS) {
            // Su iOS non si può far apparire il prompt automatico
            alert('Per installare l\'app:\n1. Tocca l\'icona Condividi (il quadrato con la freccia in alto) nella barra in basso.\n2. Scorri e tocca "Aggiungi alla schermata Home".');
        }
    };

    const handleDismiss = () => {
        setIsInstallable(false);
        setIsDismissed(true);
        localStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (isStandalone || isDismissed || !isInstallable) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="max-w-lg mx-auto bg-slate-900 text-white rounded-2xl shadow-2xl p-5 border border-slate-700/50 relative overflow-hidden">
                {/* Background Decorator */}
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-[100px]">downloading</span>
                </div>

                <div className="relative z-10 flex gap-4">
                    <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center shrink-0 shadow-lg mt-1 p-2">
                        <img src="/logo.png" alt="HyperGym" className="w-full h-full object-contain" />
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <h3 className="font-black uppercase tracking-wider text-lg leading-tight mb-1">
                                Installa l&apos;App
                            </h3>
                            <button onClick={handleDismiss} className="text-slate-400 hover:text-white p-1 -mt-1 -mr-2 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <p className="text-slate-300 text-xs font-medium leading-relaxed mb-4">
                            {isIOS 
                                ? "Aggiungi HyperGym alla tua schermata Home per un'esperienza nativa e per non dover ricaricare dal browser."
                                : "Installa HyperGym per accedere più velocemente e ricevere le notifiche in tempo reale."
                            }
                        </p>

                        <button 
                            onClick={handleInstallClick}
                            className="w-full bg-white text-slate-900 font-bold uppercase text-xs tracking-wider py-3 px-4 rounded-xl shadow-sm hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {isIOS ? 'ios_share' : 'download'}
                            </span>
                            {isIOS ? 'Come installare' : 'Installa Ora'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
