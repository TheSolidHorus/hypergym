import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

export default function ShareWorkoutModal({ workout, onClose }) {
    const cardRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        if (cardRef.current) {
            try {
                // Genera immagina scala alta e con sfondo solido (importante per il formato 9:16)
                const canvas = await html2canvas(cardRef.current, {
                    scale: 3, 
                    useCORS: true,
                    backgroundColor: "#020617" // slate-950 per il bordo nero nel rendering
                });

                const image = canvas.toDataURL("image/jpeg", 0.95);

                // Prova Condivisione Nativa
                if (navigator.share && navigator.canShare) {
                    try {
                        const blob = await (await fetch(image)).blob();
                        const file = new File([blob], `HYPER-Story-${Date.now()}.jpg`, { type: "image/jpeg" });
                        
                        await navigator.share({
                            files: [file],
                            title: 'HYPER Workout',
                            text: 'Ho spaccato tutto! 🔥'
                        });
                        setLoading(false);
                        return; // Se ha successo, esci
                    } catch (err) {
                        console.log("Nessun supporto nativo o condivisione annullata");
                    }
                }

                // Fallback Download Locale
                const link = document.createElement('a');
                link.href = image;
                link.download = `HYPER_Story_${Date.now()}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

            } catch (e) {
                console.error("Screenshot error:", e);
                alert("Errore generazione immagine");
            }
        }
        setLoading(false);
    };

    if (!workout) return null;

    const formattedDate = new Date(workout.completedAt || Date.now()).toLocaleDateString('it-IT', {
        day: 'numeric', month: 'short'
    });

    const duration = workout.duration ? Math.round(workout.duration) : 0;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;

    const volume = workout.exercises ? workout.exercises.reduce((acc, ex) => {
        return acc + ex.setsData.filter(s => s.done).reduce((sAcc, s) => sAcc + (parseInt(s.kg) * parseInt(s.reps) || 0), 0);
    }, 0) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-xl p-4 animate-in fade-in pb-safe pt-safe" onClick={onClose}>
            
            {/* Header / Azioni */}
            <div className="flex justify-between items-center mb-6 pt-4 px-2" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors" disabled={loading}>
                    <span className="material-symbols-outlined">close</span>
                </button>
                <button
                    onClick={handleDownload}
                    disabled={loading}
                    className="bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 px-6 py-2 rounded-full font-black text-white uppercase tracking-widest text-xs flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-pink-500/20 disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generazione...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[16px]">ios_share</span> Condividi su Instagram
                        </>
                    )}
                </button>
            </div>

            {/* Area di Anteprima (Scalata dinamicamente in aspect ratio 9:16) */}
            <div className="flex-1 overflow-hidden flex justify-center items-center pb-8" onClick={e => e.stopPropagation()}>
                
                {/* 
                  Container 9:16 esatto. 
                  Diamo una maxWidth per lo schermo telefono per non uscire fuori (es 300px),
                  e proporzioniamo l'altezza. Durante il canvas rimpicciolisce.
                */}
                <div className="relative shadow-2xl rounded-3xl overflow-hidden w-[320px] h-[568px] ring-4 ring-white/10">
                    
                    {/* STESSA MISURA MA DIV SCALATO DA RENDERIZZARE A 1080x1920 (Instagram standard) */}
                    <div 
                        ref={cardRef} 
                        className="absolute top-0 left-0 bg-slate-950 text-white flex flex-col p-10 overflow-hidden"
                        style={{
                            width: "1080px", 
                            height: "1920px", 
                            transformOrigin: "top left", 
                            transform: "scale(0.29629)" // 320 / 1080
                        }}
                    >
                        {/* Decorazioni Brand Sfondo */}
                        <div className="absolute -top-[300px] -right-[300px] w-[1000px] h-[1000px] bg-primary/40 rounded-full blur-[200px]"></div>
                        <div className="absolute -bottom-[300px] -left-[300px] w-[1000px] h-[1000px] bg-purple-600/30 rounded-full blur-[200px]"></div>

                        {/* Top: Branding */}
                        <div className="flex items-center gap-5 mt-16 z-10 w-full relative">
                            <img src="/logo.png" alt="HyperGym" className="w-20 h-20 object-contain" />
                            <span className="font-black text-[64px] uppercase tracking-wider text-white">HYPER</span>
                            <div className="ml-auto text-[36px] font-black tracking-widest text-white/50 border border-white/20 rounded-full px-6 py-2 uppercase">
                                {formattedDate}
                            </div>
                        </div>

                        {/* Middle: Content */}
                        <div className="flex-1 flex flex-col justify-center items-center gap-20 z-10 w-full">
                            
                            {/* Titolo Gigante */}
                            <div className="text-center w-full relative">
                                <div className="inline-flex flex-col items-center justify-center p-12 border-[6px] border-slate-800/80 bg-slate-900/60 rounded-[4rem] backdrop-blur-2xl mb-16 shadow-2xl w-[90%]">
                                    <span className="material-symbols-outlined text-[180px] text-primary mb-8" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                    <h2 className="text-[110px] font-black italic tracking-tighter text-white uppercase leading-none drop-shadow-2xl">
                                        {workout.name || 'Giorno Workout'}
                                    </h2>
                                    <div className="text-[44px] font-bold text-emerald-400 mt-8 uppercase tracking-widest bg-emerald-950/60 px-10 py-5 rounded-full border-2 border-emerald-500/30">
                                        Completato ✓
                                    </div>
                                </div>
                            </div>

                            {/* Statistiche Card */}
                            <div className="grid grid-cols-2 gap-12 px-12 w-full">
                                <div className="bg-slate-900/80 border-4 border-slate-700/50 p-12 rounded-[3.5rem] text-center shadow-2xl backdrop-blur-md">
                                    <span className="material-symbols-outlined text-[64px] text-slate-500 mb-4">timer</span>
                                    <p className="text-[36px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Durata</p>
                                    <p className="text-[80px] font-black text-white italic tracking-tighter">{durationStr}</p>
                                </div>
                                <div className="bg-slate-900/80 border-4 border-slate-700/50 p-12 rounded-[3.5rem] text-center shadow-2xl backdrop-blur-md">
                                    <span className="material-symbols-outlined text-[64px] text-primary mb-4">fitness_center</span>
                                    <p className="text-[36px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Volume</p>
                                    <p className="text-[80px] font-black text-primary italic tracking-tighter">{(volume/1000).toFixed(1)}k</p>
                                </div>
                            </div>
                            
                            {/* Fatica / Difficoltà */}
                            <div className="mt-8 bg-white/5 border-4 border-white/10 p-10 rounded-[3rem] shadow-xl text-center flex items-center justify-center gap-6 w-[80%] backdrop-blur-xl">
                                <span className="text-[80px]">
                                    {workout.difficulty === 'facile' ? '🟢' : workout.difficulty === 'giusto' ? '🟡' : '🔴'}
                                </span>
                                <p className="text-[48px] font-black text-white uppercase tracking-tighter">
                                    {workout.difficulty === 'facile' ? 'Allenamento Leggero' : workout.difficulty === 'giusto' ? 'Allenamento Intenso' : 'Allenamento Estremo'}
                                </p>
                            </div>

                        </div>

                        {/* Bottom Branding */}
                        <div className="mt-auto pb-16 z-10 w-full text-center flex justify-center">
                            <div className="bg-white/10 px-10 py-5 rounded-full flex items-center gap-4 border-2 border-white/10 shadow-xl backdrop-blur-md">
                                <span className="material-symbols-outlined text-[48px] text-white">smartphone</span>
                                <span className="text-[36px] font-black text-white tracking-widest uppercase">Tracciato su HyperGym</span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            <p className="text-white/40 text-center text-[10px] font-bold uppercase tracking-widest drop-shadow-md pb-4">
                Anteprima IG Story
            </p>
        </div>
    );
}
