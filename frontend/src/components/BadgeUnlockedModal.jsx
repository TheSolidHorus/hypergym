import { useEffect, useState } from "react";
import { useStore } from "../lib/store";

export default function BadgeUnlockedModal() {
    const { newBadges, clearNewBadges, activeWorkout } = useStore(); // ✅ Check active workout
    const [activeBadge, setActiveBadge] = useState(null);

    useEffect(() => {
        // ✅ NON mostrare badge durante workout attivo
        if (activeWorkout) return;

        // Se c'è un nuovo badge, mostralo
        if (newBadges && newBadges.length > 0) {
            setActiveBadge(newBadges[0]);

            // Vibrazione
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

            // Auto-hide dopo 4 secondi
            const timer = setTimeout(() => {
                handleDismiss();
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [newBadges, activeWorkout]); // ✅ Dipende anche da activeWorkout

    const handleDismiss = () => {
        setActiveBadge(null);
        setTimeout(() => {
            clearNewBadges();
        }, 300);
    };

    if (!activeBadge) return null;

    // Determina colori in base al livello
    const getColors = (level) => {
        switch (level?.toLowerCase()) {
            case 'bronze': return { from: 'from-orange-700', to: 'to-orange-500', border: 'border-orange-200', text: 'text-orange-600', glow: 'bg-orange-500/20' };
            case 'silver': return { from: 'from-slate-400', to: 'to-slate-300', border: 'border-slate-200', text: 'text-slate-500', glow: 'bg-slate-400/20' };
            case 'gold': return { from: 'from-yellow-500', to: 'to-yellow-400', border: 'border-yellow-200', text: 'text-yellow-600', glow: 'bg-yellow-500/20' };
            case 'platinum': return { from: 'from-cyan-500', to: 'to-cyan-400', border: 'border-cyan-200', text: 'text-cyan-600', glow: 'bg-cyan-500/20' };
            default: return { from: 'from-yellow-500', to: 'to-yellow-400', border: 'border-yellow-200', text: 'text-yellow-600', glow: 'bg-yellow-500/20' };
        }
    };

    const colors = getColors(activeBadge.level);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Background Overlay */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={handleDismiss}
            />

            {/* CONTENT */}
            <div className="relative z-10 w-full max-w-sm flex flex-col items-center animate-in zoom-in-90 duration-500">

                {/* Glow Effect Background */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 ${colors.glow} blur-[60px] rounded-full animate-pulse`} />

                {/* Trophy Circle */}
                <div className={`w-32 h-32 bg-gradient-to-br ${colors.from} ${colors.to} rounded-full flex items-center justify-center mb-8 shadow-2xl border-4 ${colors.border} animate-bounce relative`}>
                    <span className="material-symbols-outlined text-white drop-shadow-md text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
                    <span className="material-symbols-outlined absolute -top-2 -right-2 text-yellow-300 animate-spin-slow text-[32px] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="material-symbols-outlined absolute -bottom-2 -left-2 text-white/80 animate-pulse text-[28px] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>flare</span>
                </div>

                {/* Text Content */}
                <div className="text-center space-y-4 relative w-full">
                    <h2 className={`text-4xl font-black uppercase tracking-tighter italic drop-shadow-sm ${colors.text} animate-in slide-in-from-bottom-4 duration-700`}>
                        Badge Sbloccato!
                    </h2>

                    <div className="bg-white border border-slate-200 px-6 py-6 rounded-3xl backdrop-blur-xl shadow-xl animate-in slide-in-from-bottom-8 duration-700 delay-100 w-full relative group">

                        {/* Close X */}
                        <button onClick={handleDismiss} className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 p-1 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-[16px] block">close</span>
                        </button>

                        <p className="text-2xl font-black text-slate-900 mb-3 uppercase italic tracking-tighter">
                            {({'panca': 'Panca Piana', 'squat': 'Squat', 'stacco': 'Stacco da Terra'}[activeBadge.badge_type]) || activeBadge.badge_type}
                        </p>
                        <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border ${colors.border} bg-slate-50 shadow-inner mb-4`}>
                            <span className={`material-symbols-outlined text-[16px] ${colors.text}`}>verified</span>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${colors.text}`}>
                                Livello {activeBadge.level}
                            </p>
                        </div>
                        <p className="text-slate-500 text-sm font-bold">
                            Hai sollevato un massimale di <span className="text-slate-900 font-black italic text-xl px-1">{activeBadge.weight_achieved} kg</span>
                        </p>
                    </div>

                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest animate-in fade-in delay-700 pt-4 flex items-center justify-center gap-2">
                        Continua così! <span className="text-xl">💪</span>
                    </p>
                </div>

            </div>
        </div>
    );
}
