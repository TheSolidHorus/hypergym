import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import VideoModal from "../components/VideoModal";
import SmartSwapModal from "../components/SmartSwapModal";
import ShareWorkoutModal from "../components/ShareWorkoutModal";
import RecoveryTimer from "../components/RecoveryTimer";
import { getSmartSwaps } from "../lib/smartSwapRules";

export default function WorkoutSession() {
    const navigate = useNavigate();
    const { activeWorkout, finishWorkout, cancelWorkout, updateSet, addSet, removeSet, getVideoForExercise, swapExercise, userProfile, updateExerciseNote } = useStore();
    const [timerValue, setTimerValue] = useState(0);
    const [autoTimerTrigger, setAutoTimerTrigger] = useState(null);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [currentVideo, setCurrentVideo] = useState(null);
    const [showFeelingModal, setShowFeelingModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [finishedWorkout, setFinishedWorkout] = useState(null);
    const [isFinishing, setIsFinishing] = useState(false);

    // Smart Swap State
    const [swapModalState, setSwapModalState] = useState({
        open: false,
        exIndex: null,
        exerciseName: '',
        currentWeight: 0,
        alternatives: []
    });

    // ... (rest of useEffects remain same) ...

    // Sync timer on load/refresh
    useEffect(() => {
        if (activeWorkout?.startedAt) {
            const diff = Math.floor((Date.now() - new Date(activeWorkout.startedAt).getTime()) / 1000);
            setTimerValue(diff > 0 ? diff : 0);
        }
    }, [activeWorkout?.startedAt]);

    // Timer Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setTimerValue((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Redirect to home if no active workout (and not sharing/rating)
    useEffect(() => {
        if (!activeWorkout && !showShareModal && !isFinishing && !showFeelingModal) navigate("/");
    }, [activeWorkout, navigate, showShareModal, isFinishing, showFeelingModal]);

    const handleFinish = () => {
        setShowFeelingModal(true);
    };

    const submitFinish = async (feeling) => {
        setShowFeelingModal(false);
        try {
            setIsFinishing(true);
            const summary = {
                ...activeWorkout,
                completedAt: new Date().toISOString(),
                duration: timerValue / 60,
                difficulty: feeling
            };
            setFinishedWorkout(summary);
            await finishWorkout(feeling);
            setShowShareModal(true);
            setIsFinishing(false);
        } catch (error) {
            console.error("Errore salvataggio:", error);
            alert("Si è verificato un errore durante il salvataggio. Controlla la connessione.");
            setIsFinishing(false);
        }
    };

    const handleCloseShare = () => {
        setShowShareModal(false);
        navigate("/");
    };

    // SHOW LOADING WHILE SAVING
    if (isFinishing && !showShareModal) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background text-slate-900 z-50 fixed inset-0">
                <div className="animate-spin rounded-full h-16 w-16 border-t-[3px] border-primary border-r-2 border-transparent mb-6 drop-shadow-sm"></div>
                <h2 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter animate-pulse">Salvataggio...</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Stiamo sincronizzando i progressi</p>
            </div>
        );
    }

    const handleSetChange = (exIndex, setIndex, field, value) => {
        updateSet(exIndex, setIndex, { [field]: value });
    };

    const toggleSetDone = (exIndex, setIndex) => {
        if (navigator.vibrate) navigator.vibrate(50);
        const wasDone = storeValue(exIndex, setIndex, 'done');
        updateSet(exIndex, setIndex, { done: !wasDone });
        
        // Auto-start rest timer
        if (!wasDone) {
            const restSecs = activeWorkout.exercises[exIndex].rest || 90;
            setAutoTimerTrigger({ time: restSecs, timestamp: Date.now() });
        }
    };

    const storeValue = (exIndex, setIndex, field) => {
        return activeWorkout?.exercises[exIndex]?.setsData[setIndex]?.[field] || "";
    };

    const handleOpenVideo = (exerciseName) => {
        const video = getVideoForExercise(exerciseName);
        if (video) {
            setCurrentVideo({ exercise: exerciseName, url: video.video_url });
            setVideoModalOpen(true);
        } else {
            alert(`Video non disponibile per "${exerciseName}"`);
        }
    };

    // --- SMART SWAP LOGIC ---
    const handleOpenSwap = (exIndex, exerciseName) => {
        const sets = activeWorkout.exercises[exIndex].setsData;
        const weights = sets.map(s => parseFloat(s.kg) || 0);
        const maxWeight = Math.max(...weights);

        const alternatives = getSmartSwaps(exerciseName);

        setSwapModalState({
            open: true,
            exIndex,
            exerciseName,
            currentWeight: maxWeight > 0 ? maxWeight : 0,
            alternatives
        });
    };

    const handleSwapConfirm = (newName, newWeight) => {
        if (swapModalState.exIndex !== null) {
            swapExercise(swapModalState.exIndex, newName, newWeight);
            setSwapModalState(prev => ({ ...prev, open: false }));
        }
    };


    // --- 1RM CALCULATOR ---
    const calculate1RM = (setsData) => {
        let max = 0;
        (setsData || []).forEach(set => {
            if (set.done && set.kg && set.reps) {
                const kg = parseFloat(set.kg);
                const reps = parseInt(set.reps);
                if (kg > 0 && reps > 0) {
                    const orm = reps === 1 ? kg : kg * (1 + reps / 30);
                    if (orm > max) max = orm;
                }
            }
        });
        return max > 0 ? Math.round(max) : 0;
    };


    if (!activeWorkout && !showShareModal) return null;
    const workout = activeWorkout || finishedWorkout;
    if (!workout) return null;

    return (
        <div className="flex flex-col h-screen bg-background text-slate-900 overflow-hidden pb-16 relative touch-pan-y animate-in fade-in">

            {/* Top Bar - Sticky */}
            <div className="flex justify-between items-center p-4 pt-14 bg-white/90 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200 select-none shadow-sm">
                <button
                    onClick={() => { if (confirm("Annullare workout?")) { cancelWorkout(); navigate('/'); } }}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
                    aria-label="Annulla Workout"
                >
                    <span className="material-symbols-outlined text-slate-700 text-[28px] block">close</span>
                </button>
                <div className="text-center">
                    <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{workout.name}</h2>
                    <span className="font-sans text-2xl font-black tracking-tighter text-slate-800 bg-slate-100 px-3 py-0.5 rounded-lg border border-slate-200 mt-0.5 inline-block shadow-inner drop-shadow-sm">
                        {Math.floor(timerValue / 60)}:{(timerValue % 60).toString().padStart(2, '0')}
                    </span>
                </div>
                <button
                    onClick={handleFinish}
                    className="bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-primary/20 shadow-sm active:scale-95"
                >
                    FINISH
                </button>
            </div>

            {/* Main Content - Exercise Loop */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-32 custom-scrollbar">

                {workout.exercises.map((exercise, exIndex) => (
                    <div key={exIndex} className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

                        {/* Exercise Header */}
                        <div className="flex justify-between items-start mb-0 p-5 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
                            <div>
                                <h1 className="text-2xl font-black italic uppercase text-slate-900 mb-1 tracking-tighter">{exercise.name}</h1>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded shadow-sm tracking-wider uppercase inline-flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">flag</span> TARGET: {exercise.sets} SET x {exercise.reps || 'MAX'}
                                    </span>
                                    {calculate1RM(exercise.setsData) > 0 && (
                                        <span className="text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded shadow-sm tracking-wider uppercase inline-flex items-center gap-1 transition-all animate-in zoom-in-95">
                                            <span className="material-symbols-outlined text-[14px]">calculate</span> 1RM STIMATO: {calculate1RM(exercise.setsData)} KG
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {userProfile?.role !== 'admin' && (
                                    <button
                                        onClick={() => handleOpenSwap(exIndex, exercise.name)}
                                        className="w-10 h-10 flex justify-center items-center bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-amber-500 hover:border-amber-300 hover:bg-amber-50 transition-colors active:scale-95 shadow-sm"
                                        title="Alternativa Smart"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/progress/${encodeURIComponent(exercise.name)}`)}
                                    className="w-10 h-10 flex justify-center items-center bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors active:scale-95 shadow-sm"
                                    title="Grafico Progressione"
                                >
                                    <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                                </button>
                                <button
                                    onClick={() => handleOpenVideo(exercise.name)}
                                    className="w-10 h-10 flex justify-center items-center bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-colors active:scale-95 shadow-sm"
                                    title="Guarda video tecnica"
                                >
                                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                                </button>
                            </div>
                        </div>

                        {/* EXERCISE NOTES */}
                        <div className="px-5 pb-3 bg-white">
                            <textarea
                                placeholder="Aggiungi una nota (es. altezza sellino, feeling)... Dimentichi o impari qualcosa? Scrivilo qui per la prossima volta!"
                                value={exercise.notes || ''}
                                onChange={(e) => updateExerciseNote(exIndex, e.target.value)}
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:bg-white resize-none transition-all shadow-inner"
                                rows="2"
                            />
                        </div>

                        {/* THE TABLE (EXCEL STYLE) */}
                        <div className="bg-white">
                            {/* Header */}
                            <div className="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] py-2.5 px-3 border-b border-slate-100 bg-slate-50 shadow-inner">
                                <div className="w-8 text-center ml-1">#</div>
                                <div className="flex-1 text-center text-primary">KG</div>
                                <div className="flex-1 text-center text-primary">REPS</div>
                                <div className="w-14 text-center">RPE</div>
                                <div className="w-12 text-center mr-1"></div>
                            </div>

                            {/* Rows */}
                            <div className="divide-y divide-slate-100 pointer-events-auto">
                                {exercise.setsData.map((set, setIndex) => (
                                    <div
                                        key={setIndex}
                                        className={`flex items-center py-3 px-2 transition-colors duration-200 ${storeValue(exIndex, setIndex, 'done') ? "bg-primary/5" : "hover:bg-slate-50"}`}
                                    >
                                        <div className="w-10 flex justify-center">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-colors shadow-inner ${storeValue(exIndex, setIndex, 'done') ? "bg-primary text-white shadow-md shadow-primary/20 border-transparent" : "bg-slate-100 text-slate-400 border border-slate-200"}`}>
                                                {setIndex + 1}
                                            </div>
                                        </div>

                                        <div className="flex-1 px-3">
                                            <input
                                                type="number"
                                                placeholder="-"
                                                value={storeValue(exIndex, setIndex, 'kg')}
                                                onChange={(e) => handleSetChange(exIndex, setIndex, 'kg', e.target.value)}
                                                className={`w-full bg-transparent text-center font-black text-2xl focus:outline-none border-b-2 border-transparent focus:border-primary transition-colors py-1 appearance-none tracking-tighter ${storeValue(exIndex, setIndex, 'done') ? "text-primary/70" : "text-slate-800"}`}
                                                disabled={storeValue(exIndex, setIndex, 'done')}
                                            />
                                        </div>

                                        <div className="flex-1 px-3">
                                            <input
                                                type="number"
                                                placeholder="-"
                                                value={storeValue(exIndex, setIndex, 'reps')}
                                                onChange={(e) => handleSetChange(exIndex, setIndex, 'reps', e.target.value)}
                                                className={`w-full bg-transparent text-center font-black text-2xl focus:outline-none border-b-2 border-transparent focus:border-primary transition-colors py-1 appearance-none tracking-tighter ${storeValue(exIndex, setIndex, 'done') ? "text-primary/70" : "text-slate-800"}`}
                                                disabled={storeValue(exIndex, setIndex, 'done')}
                                            />
                                        </div>

                                        <div className="w-14 px-1">
                                            <input
                                                type="number"
                                                placeholder="@"
                                                step="0.5"
                                                value={storeValue(exIndex, setIndex, 'rpe')}
                                                onChange={(e) => handleSetChange(exIndex, setIndex, 'rpe', e.target.value)}
                                                className={`w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-center font-black text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-colors shadow-inner ${storeValue(exIndex, setIndex, 'done') ? "text-slate-400 bg-transparent border-transparent shadow-none" : "text-slate-500"}`}
                                                disabled={storeValue(exIndex, setIndex, 'done')}
                                            />
                                        </div>

                                        <div className="w-12 flex justify-end pr-1">
                                            <button
                                                onClick={() => toggleSetDone(exIndex, setIndex)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 duration-200 border ${storeValue(exIndex, setIndex, 'done') ? "bg-primary border-primary text-white shadow-md shadow-primary/30" : "bg-white border-slate-200 text-slate-300 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-400"}`}
                                            >
                                                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add/Remove Set Buttons */}
                            <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2 w-full mt-auto">
                                <button
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(30);
                                        removeSet(exIndex);
                                    }}
                                    className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-red-200 hover:text-red-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:bg-slate-100"
                                    disabled={exercise.setsData.length <= 1}
                                >
                                    <span className="material-symbols-outlined text-[16px]">remove</span> Rimuovi
                                </button>
                                <button
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(30);
                                        addSet(exIndex);
                                    }}
                                    className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-colors shadow-sm flex items-center justify-center gap-1.5 active:bg-slate-100"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span> Aggiungi
                                </button>
                            </div>

                        </div>
                    </div>
                ))}

                <div className="h-12"></div> {/* Spacer */}
            </div>

            {/* MODALS & OVERLAYS */}

            {/* Smart Swap Modal */}
            <SmartSwapModal
                isOpen={swapModalState.open}
                originalExercise={swapModalState.exerciseName}
                currentWeight={swapModalState.currentWeight}
                alternatives={swapModalState.alternatives}
                onClose={() => setSwapModalState(prev => ({ ...prev, open: false }))}
                onSwap={(name, weight) => handleSwapConfirm(name, weight)}
            />

            {/* Video Modal */}
            {videoModalOpen && currentVideo && (
                <VideoModal
                    exercise={currentVideo.exercise}
                    videoUrl={currentVideo.url}
                    onClose={() => {
                        setVideoModalOpen(false);
                        setCurrentVideo(null);
                    }}
                />
            )}

            {/* Recovery Timer (Always present, floating) */}
            <RecoveryTimer trigger={autoTimerTrigger} />

            {/* Share Modal (After finish) */}
            {showShareModal && (
                <ShareWorkoutModal
                    workout={finishedWorkout}
                    onClose={handleCloseShare}
                />
            )}

            {/* Feeling/Rating Modal */}
            {showFeelingModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowFeelingModal(false)}>
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-8">
                            <span className="material-symbols-outlined text-[48px] text-primary mb-2">vital_signs</span>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Com&apos;è andata?</h2>
                            <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">Il feedback aiuta il tuo Coach a calibrare i pesi</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <button onClick={() => submitFinish('facile')} className="bg-green-50 border-2 border-green-200 hover:bg-green-500 hover:text-white hover:border-green-500 text-green-700 font-black uppercase text-sm py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm group">
                                <span className="text-xl">🟢</span> Facile (RPE basso)
                            </button>
                            <button onClick={() => submitFinish('giusto')} className="bg-amber-50 border-2 border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500 text-amber-700 font-black uppercase text-sm py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm group">
                                <span className="text-xl">🟡</span> Giusto / Sfidante
                            </button>
                            <button onClick={() => submitFinish('estremo')} className="bg-red-50 border-2 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 text-red-700 font-black uppercase text-sm py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm group">
                                <span className="text-xl">🔴</span> Estremo (Al limite)
                            </button>
                        </div>
                        <button onClick={() => setShowFeelingModal(false)} className="w-full mt-6 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors">
                            Annulla
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
