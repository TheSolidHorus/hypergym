export default function SmartSwapModal({ originalExercise, currentWeight = 0, alternatives = [], isOpen, onClose, onSwap }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white relative">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[24px]">swap_horiz</span> Smart Swap
                        </h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 ml-8">Sostituisci: <span className="text-primary">{originalExercise}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-100 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50">
                    {alternatives.length > 0 ? (
                        alternatives.map((alt, i) => {
                            // Calcolo peso suggerito
                            // (Peso * Ratio). Arrotonda 2.5kg
                            const rawWeight = currentWeight * alt.ratio;
                            const roundedWeight = Math.round(rawWeight / 2.5) * 2.5;

                            // Se arrotondato < 2.5 ma raw > 0, metti min 2.5 (o manubri min)
                            // Se currentWeight è 0, mostriamo "-"

                            const displayWeight = currentWeight > 0 ? `${roundedWeight} kg` : "-";

                            return (
                                <button
                                    key={i}
                                    onClick={() => onSwap(alt.name, roundedWeight)}
                                    className="w-full group relative flex items-center justify-between p-4 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-2xl transition-all active:scale-[0.98] shadow-sm hover:shadow-md cursor-pointer"
                                >
                                    <div className="text-left pr-4">
                                        <h4 className="font-black italic text-slate-900 text-sm uppercase tracking-tighter group-hover:text-amber-600 transition-colors">
                                            {alt.name}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">calculate</span>
                                            Ratio: {alt.ratio}x
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-end pl-4 border-l border-slate-100 group-hover:border-amber-200/50 transition-colors">
                                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Suggerito</span>
                                        <span className={`font-black italic tracking-tighter text-xl mt-0.5 ${currentWeight > 0 ? "text-primary group-hover:text-amber-600" : "text-slate-300"}`}>
                                            {displayWeight}
                                        </span>
                                    </div>

                                    {/* Icon overlay */}
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500/10 scale-[2.5] opacity-0 group-hover:opacity-100 transition-all pointer-events-none mix-blend-multiply">
                                        <span className="material-symbols-outlined text-[48px]">swap_horiz</span>
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 flex flex-col items-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">help_center</span>
                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Nessuna alternativa testata</p>
                            <p className="text-[10px] text-slate-400 px-4 font-bold">
                                Cerca nel database principale o chiedi supporto al tuo allenatore dedicati.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Message */}
                {currentWeight > 0 && alternatives.length > 0 && (
                    <div className="p-4 bg-amber-50 border-t border-amber-100 text-center">
                        <p className="text-[10px] text-amber-800/70 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-[12px]">info</span>
                            Basato sull&apos;ultimo carico ({currentWeight}kg). Regola se serve.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
