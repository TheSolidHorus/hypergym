import { useRef, useState } from "react";
import html2canvas from "html2canvas";

export default function StoryPreviewModal({ open, onClose, workoutData, chartData }) {
    const storyRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

    if (!open) return null;

    const handleShare = async () => {
        if (!storyRef.current) return;
        setIsGenerating(true);

        try {
            // Genera l'immagine dal Div (ignorando font non caricati ecc)
            const canvas = await html2canvas(storyRef.current, {
                scale: 3, // Alta risoluzione per le storie Instagram
                useCORS: true,
                backgroundColor: "#020617", // slate-950 come sfondo per non avere bordi bianchi
            });

            // Convert in blob
            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Errore nella generazione dell'immagine");

                const file = new File([blob], `HYPER-Story-${Date.now()}.jpg`, { type: "image/jpeg" });

                // Prova a usare l'API nativa di condivisione (funziona su iOS/Android PWA)
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'HYPER Workout',
                            text: 'Guarda il mio ultimo allenamento su HYPER! 🔥'
                        });
                    } catch (e) {
                        console.log("Condivisione annullata o non supportata in questo browser:", e);
                        forceDownload(canvas.toDataURL("image/jpeg", 0.9));
                    }
                } else {
                    // Fallback per Desktop: Scarica l'immagine
                    forceDownload(canvas.toDataURL("image/jpeg", 0.9));
                }
                setIsGenerating(false);
            }, "image/jpeg", 0.9);

        } catch (err) {
            console.error(err);
            alert("Si è verificato un errore durante la generazione dell'immagine.");
            setIsGenerating(false);
        }
    };

    const forceDownload = (dataUrl) => {
        const link = document.createElement('a');
        link.download = `HYPER-Story-${Date.now()}.jpg`;
        link.href = dataUrl;
        link.click();
    };

    // Formatter del tempo
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m} min`;
    };

    return (
        <div className="fixed inset-0 z-[500] flex flex-col bg-black/90 backdrop-blur-sm p-4 safe-area-pt">
            {/* Header / Azioni */}
            <div className="flex justify-between items-center mb-6 pt-4">
                <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" disabled={isGenerating}>
                    <span className="material-symbols-outlined">close</span>
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 px-6 py-2 rounded-full font-black text-white uppercase tracking-widest text-xs flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-pink-500/20 disabled:opacity-50"
                    >
                        {isGenerating ? 'Generazione...' : (
                            <>
                                <span className="material-symbols-outlined text-[16px]">ios_share</span> Condividi
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Area di Anteprima (Scrollable se schermo piccolo) */}
            <div className="flex-1 overflow-y-auto flex justify-center items-center pb-8">
                {/* 
                  IL DIV "STORY"
                  Usa aspect-ratio 9/16, scale in modo da entrare sempre nello schermo,
                  ma quando renderizzato dall'html2canvas manterrà i suoi Pixel interni.
                  Risoluzione base: 1080x1920 (scalata visivamente con W-full max-w-[340px])
                */}
                <div className="relative shadow-2xl overflow-hidden rounded-3xl" style={{ width: "340px", height: "604.44px" }}>
                    
                    {/* Questo è il nodo renderizzato */}
                    <div
                        ref={storyRef}
                        className="absolute inset-0 bg-slate-950 flex flex-col p-8 overflow-hidden text-white"
                        style={{ width: "1080px", height: "1920px", transformOrigin: "top left", transform: "scale(0.3148)" }}
                    >
                        {/* Decorazioni Sfondo */}
                        <div className="absolute -top-[200px] -right-[200px] w-[800px] h-[800px] bg-primary/30 rounded-full blur-[150px]"></div>
                        <div className="absolute -bottom-[200px] -left-[200px] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[150px]"></div>

                        {/* Top / App Logo */}
                        <div className="flex items-center gap-4 mt-12 z-10 w-full relative">
                            <img src="/logo.png" alt="HyperGym" className="w-16 h-16 object-contain" />
                            <span className="font-black text-[48px] uppercase tracking-wider text-white">HYPER</span>
                        </div>

                        {/* Contenuto Centrale Dinamico */}
                        <div className="flex-1 flex flex-col justify-center gap-16 z-10">
                            {workoutData ? (
                                // LAYOUT: WORKOUT FINITO
                                <div className="text-center w-full">
                                    <div className="inline-flex flex-col items-center justify-center p-8 border-4 border-slate-800/50 bg-slate-900/50 rounded-[4rem] backdrop-blur-xl mb-12 shadow-2xl">
                                        <span className="material-symbols-outlined text-[140px] text-primary mb-8" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                        <h2 className="text-[100px] font-black italic tracking-tighter text-white uppercase leading-none drop-shadow-xl">{workoutData.name}</h2>
                                        <div className="text-[40px] font-bold text-slate-400 mt-4 uppercase tracking-widest bg-slate-950/50 px-8 py-4 rounded-full">
                                            Workout Completato
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 px-8">
                                        <div className="bg-slate-900/80 border-2 border-slate-700 p-8 rounded-[3rem] text-center shadow-xl">
                                            <p className="text-[32px] text-slate-400 font-black uppercase tracking-widest mb-2">Durata</p>
                                            <p className="text-[64px] font-black text-white">{formatTime(workoutData.duration)}</p>
                                        </div>
                                        <div className="bg-slate-900/80 border-2 border-slate-700 p-8 rounded-[3rem] text-center shadow-xl">
                                            <p className="text-[32px] text-slate-400 font-black uppercase tracking-widest mb-2">Volume</p>
                                            <p className="text-[64px] font-black text-primary">{workoutData.totalVolume} <span className="text-[32px]">kg</span></p>
                                        </div>
                                    </div>

                                    {workoutData.prCount > 0 && (
                                        <div className="mt-12 bg-amber-500/10 border-2 border-amber-500/30 p-8 rounded-[3rem] shadow-xl text-center flex items-center justify-center gap-4">
                                            <span className="text-[64px]">🏆</span>
                                            <p className="text-[48px] font-black text-amber-500 uppercase tracking-tight">
                                                {workoutData.prCount} Record Infranti
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : chartData ? (
                                // LAYOUT: PROGRESSO CHARTA (MOCKUP PER PROGRESS.JSX)
                                <div className="text-center w-full">
                                    <h2 className="text-[80px] font-black italic tracking-tighter text-white uppercase leading-tight px-12 mb-2">
                                        {chartData.exerciseName}
                                    </h2>
                                    <div className="text-[36px] font-bold text-primary mb-12 uppercase tracking-widest flex justify-center items-center gap-4">
                                        <span className="material-symbols-outlined text-[48px]">trending_up</span> Nuovo Record Personale
                                    </div>

                                    <div className="bg-slate-900/80 border-4 border-slate-800 p-12 rounded-[4rem] text-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
                                        {/* Mockup Linea in canvas / HTML non ottimale per le storie, usiamo solo i grandi numeri */}
                                        <p className="text-[40px] text-slate-400 font-black uppercase tracking-widest mb-4">{chartData.metric === 'weight' ? 'Carico Max' : 'Volume Totale'}</p>
                                        <p className="text-[200px] leading-none font-black text-white italic drop-shadow-2xl">
                                            {chartData.maxValue} <span className="text-[60px] text-slate-500 not-italic">kg</span>
                                        </p>
                                        <p className="text-[40px] font-bold text-emerald-400 mt-6 bg-emerald-950/50 py-4 px-8 rounded-full border border-emerald-500/20 inline-block truncate max-w-full">
                                            +{chartData.growth}% dalla prima volta
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Footer Story */}
                        <div className="mt-auto z-10 w-full text-center pb-12 flex flex-col items-center">
                            <div className="bg-white/10 px-8 py-4 rounded-full flex items-center gap-4 border border-white/10">
                                <span className="material-symbols-outlined text-[40px] text-white">smartphone</span>
                                <span className="text-[32px] font-black text-white tracking-widest uppercase">HyperGym App</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Spiegazione in basso */}
            <p className="text-white/40 text-center text-[10px] font-bold uppercase pb-8">Anteprima Storia 9:16</p>
        </div>
    );
}
