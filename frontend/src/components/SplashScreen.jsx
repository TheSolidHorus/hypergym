import { useEffect, useState } from "react";

export default function SplashScreen({ onFinish }) {
    const [animate, setAnimate] = useState(false);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        setTimeout(() => setAnimate(true), 100);
        const fadeTimer = setTimeout(() => setOpacity(0), 2200);
        const finishTimer = setTimeout(() => onFinish(), 2700);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(finishTimer);
        };
    }, [onFinish]);

    return (
        <div
            className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center transition-opacity duration-500 ease-out"
            style={{ opacity }}
        >
            {/* Decorative Background (subtle gym) */}
            <div className="absolute inset-0 -z-10 opacity-5 pointer-events-none">
                <div className="w-full h-full bg-center bg-no-repeat bg-cover"
                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDYI0-knOPK3D6ue6IoN0QHCUFiu3-gZ1gL1PzlzQJM94YNn0sHoezpIf7ke4Yf6ifL1x0E7t4ODwOtacItENQNykUeO3O6sgxLjpUfQaGm6V64vqiZ_Uj6FZlYXMAgj9wOzVjm33ZUspnPad-zNJW-inNWfcwVuXIDrGfLObV4fj6v1pUbh5djYDLFGKtY-Edea6gU82Y5PC4GkXUu2hB-hY8uStezEbuatsDiJPRi7qLGJt4SB37tYKrcGUiCjBLvgz_TnuNwIg4")' }}
                />
            </div>

            <div className={`transition-all duration-1000 transform ${animate ? 'scale-100 opacity-100 blur-0' : 'scale-90 opacity-0 blur-sm'}`}>
                <div className="relative flex flex-col items-center max-w-md w-full px-6 space-y-6">
                    {/* Official HyperGym Logo */}
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl"></div>
                        <img 
                            src="/logo.png" 
                            alt="HyperGym Logo" 
                            className="relative z-10 w-36 h-36 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                        />
                    </div>

                    {/* Typography */}
                    <div className="text-center space-y-2">
                        <h1 className="text-foreground tracking-wider text-4xl font-black uppercase leading-none">
                            HYPER
                        </h1>
                        <h2 className="text-slate-400 text-xs font-bold tracking-[0.35em] uppercase">
                            GYM &bull; SPORT &bull; CONDITIONING
                        </h2>
                    </div>
                </div>
            </div>

            {/* Bottom: Loading Bar + Version */}
            <div className="absolute bottom-12 w-full max-w-xs px-8 flex flex-col items-center gap-6">
                <div className="w-full space-y-3">
                    <div className="h-[2px] w-full bg-slate-700/40 rounded-full overflow-hidden">
                        <div className={`h-full bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.8)] transition-all duration-[2000ms] ease-out ${animate ? 'w-full' : 'w-0'}`}></div>
                    </div>
                </div>
                <div className={`text-slate-400 text-[10px] font-medium tracking-widest uppercase transition-opacity duration-1000 delay-700 ${animate ? 'opacity-100' : 'opacity-0'}`}>
                    HYPERGYM v3.0.0
                </div>
            </div>
        </div>
    );
}
