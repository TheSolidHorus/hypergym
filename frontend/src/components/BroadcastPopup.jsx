import { useEffect, useState } from "react";
import { useStore } from "../lib/store";

// Configurazione tipi di comunicazione
const BROADCAST_TYPES = {
    annuncio: {
        label: "Annuncio",
        emoji: "📢",
        gradient: "from-blue-500 to-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        badge: "bg-blue-100 text-blue-700 border-blue-200",
    },
    offerta: {
        label: "Offerta Speciale",
        emoji: "🎁",
        gradient: "from-orange-400 to-primary",
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
        badge: "bg-orange-100 text-orange-700 border-orange-200",
    },
    avviso: {
        label: "Avviso",
        emoji: "⚠️",
        gradient: "from-amber-400 to-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        badge: "bg-amber-100 text-amber-700 border-amber-200",
    },
    novita: {
        label: "Novità",
        emoji: "✅",
        gradient: "from-emerald-500 to-green-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
};

export default function BroadcastPopup() {
    const { broadcasts, fetchBroadcasts, markBroadcastRead } = useStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visible, setVisible] = useState(false);
    const [animatingOut, setAnimatingOut] = useState(false);

    // Carica i broadcasts all'avvio
    useEffect(() => {
        fetchBroadcasts();
    }, []);

    // Mostra il popup se ci sono broadcast non letti
    useEffect(() => {
        if (broadcasts.length > 0) {
            setCurrentIndex(0);
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [broadcasts.length]);

    if (!visible || broadcasts.length === 0) return null;

    const current = broadcasts[currentIndex];
    if (!current) return null;

    const typeConfig = BROADCAST_TYPES[current.type] || BROADCAST_TYPES.annuncio;
    const hasMore = currentIndex < broadcasts.length - 1;

    const handleDismiss = async () => {
        // Animazione uscita
        setAnimatingOut(true);
        setTimeout(async () => {
            await markBroadcastRead(current.id);
            if (hasMore) {
                setCurrentIndex(prev => prev + 1);
                setAnimatingOut(false);
            } else {
                setVisible(false);
                setAnimatingOut(false);
            }
        }, 300);
    };

    const handleNext = () => {
        setAnimatingOut(true);
        setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setAnimatingOut(false);
        }, 200);
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className={`relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border overflow-hidden flex flex-col transition-all duration-300 ${animatingOut ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'} ${typeConfig.border}`}
            >
                {/* Header colorato con gradiente */}
                <div className={`bg-gradient-to-br ${typeConfig.gradient} px-6 pt-8 pb-6 relative`}>
                    {/* Indicatore paginazione (se multipli) */}
                    {broadcasts.length > 1 && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5">
                            {broadcasts.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Emoji tipo */}
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl mb-4 shadow-inner border border-white/30">
                        {typeConfig.emoji}
                    </div>

                    {/* Badge tipo */}
                    <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/30 mb-3">
                        {typeConfig.label}
                    </span>

                    {/* Titolo */}
                    <h2 className="text-2xl font-black italic text-white uppercase leading-tight tracking-tighter">
                        {current.title}
                    </h2>

                    {/* Data */}
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2">
                        {new Date(current.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {/* Corpo */}
                <div className="px-6 py-5 flex-1 flex flex-col gap-4">
                    {/* Immagine (se presente) */}
                    {current.image_url && (
                        <div className="w-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                            <img
                                src={current.image_url}
                                alt={current.title}
                                className="w-full h-48 object-cover"
                                onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                            />
                        </div>
                    )}

                    {/* Messaggio */}
                    <p className="text-slate-700 text-sm font-medium leading-relaxed">
                        {current.message}
                    </p>

                    {/* Azioni */}
                    <div className="flex gap-3 mt-2">
                        {/* Bottone "Prossima" (se ci sono altri broadcast da vedere) */}
                        {hasMore && (
                            <button
                                onClick={handleNext}
                                className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-50 transition-colors"
                            >
                                Prossima
                            </button>
                        )}

                        {/* Bottone OK / Ho capito */}
                        <button
                            onClick={handleDismiss}
                            className={`flex-1 py-3 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg bg-gradient-to-r ${typeConfig.gradient}`}
                        >
                            {hasMore ? 'OK, leggo dopo' : '✓ Ho capito'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
