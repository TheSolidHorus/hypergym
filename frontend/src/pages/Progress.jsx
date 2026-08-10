import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import ProgressChart from "../components/ProgressChart";
import StoryPreviewModal from "../components/StoryPreviewModal";

export default function Progress() {
    const navigate = useNavigate();
    const { exerciseName } = useParams();
    const { history } = useStore();
    const [chartData, setChartData] = useState([]);
    const [selectedExercise, setSelectedExercise] = useState(exerciseName || null);
    const [availableExercises, setAvailableExercises] = useState([]);
    const [chartType, setChartType] = useState('weight');
    const [showStoryModal, setShowStoryModal] = useState(false);

    useEffect(() => {
        const exercisesSet = new Set();
        history.forEach(session => { session.exercises?.forEach(ex => exercisesSet.add(ex.name)); });
        setAvailableExercises(Array.from(exercisesSet).sort());
        if (!selectedExercise && exercisesSet.size > 0) setSelectedExercise(Array.from(exercisesSet)[0]);
    }, [history, selectedExercise]);

    useEffect(() => {
        if (!selectedExercise) return;
        const data = [];
        history.forEach(session => {
            const exercise = session.exercises?.find(ex => ex.name === selectedExercise);
            if (!exercise || !exercise.setsData) return;
            const maxWeight = Math.max(...exercise.setsData.filter(s => s.done && s.kg).map(s => parseInt(s.kg) || 0));
            const volume = exercise.setsData.filter(s => s.done && s.kg && s.reps).reduce((acc, s) => acc + (parseInt(s.kg) * parseInt(s.reps)), 0);
            if (maxWeight > 0 || volume > 0) {
                const maxReps = Math.max(...exercise.setsData.filter(s => s.done).map(s => parseInt(s.reps) || 0));
                data.push({
                    date: new Date(session.startedAt || session.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
                    weight: maxWeight === -Infinity ? 0 : maxWeight, volume,
                    reps: maxReps === -Infinity ? 0 : maxReps,
                    timestamp: new Date(session.startedAt || session.date).getTime()
                });
            }
        });
        data.sort((a, b) => a.timestamp - b.timestamp);
        setChartData(data);
    }, [selectedExercise, history]);

    return (
        <div className="flex flex-col min-h-screen bg-background text-slate-900 p-4 pb-24">

            <div className="flex items-center gap-4 mb-4 pt-6 justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-2xl">trending_up</span>
                        <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight">Progressione</h1>
                    </div>
                </div>
                {selectedExercise && chartData.length > 0 && (
                    <button 
                        onClick={() => setShowStoryModal(true)}
                        className="bg-primary/10 text-primary p-2 rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-colors border border-primary/20 active:scale-95"
                    >
                        <span className="material-symbols-outlined">ios_share</span>
                    </button>
                )}
            </div>

            <div className="flex bg-white border border-slate-200 rounded-xl p-1 mb-6 shadow-sm">
                <button onClick={() => setChartType('weight')}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all ${chartType === 'weight' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}>
                    Carico Max
                </button>
                <button onClick={() => setChartType('volume')}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all ${chartType === 'volume' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400'}`}>
                    Volume Totale
                </button>
            </div>

            {availableExercises.length > 0 && (
                <div className="mb-8">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Seleziona Esercizio</label>
                    <select value={selectedExercise || ''} onChange={(e) => setSelectedExercise(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-primary shadow-sm transition-colors">
                        {availableExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                    </select>
                </div>
            )}

            {selectedExercise ? (
                chartData.length > 0 ? (
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                        <ProgressChart data={chartData} exerciseName={selectedExercise} metric={chartType} />
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nessun dato per {selectedExercise}</p>
                        <p className="text-slate-400 text-xs mt-2">Completa alcuni allenamenti per vedere la progressione</p>
                    </div>
                )
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                    <span className="material-symbols-outlined text-slate-300 text-5xl mb-4 block">trending_up</span>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nessun esercizio trovato</p>
                    <p className="text-slate-400 text-xs mt-2">Completa un allenamento per iniziare a tracciare i progressi</p>
                </div>
            )}

            <StoryPreviewModal 
                open={showStoryModal}
                onClose={() => setShowStoryModal(false)}
                chartData={
                    chartData.length > 0 ? {
                        exerciseName: selectedExercise,
                        metric: chartType,
                        maxValue: Math.max(...chartData.map(d => d[chartType === 'volume' ? 'volume' : 'weight'])),
                        growth: chartData.length > 1 
                                ? ((chartData[chartData.length - 1][chartType === 'volume' ? 'volume' : 'weight'] - chartData[0][chartType === 'volume' ? 'volume' : 'weight']) / chartData[0][chartType === 'volume' ? 'volume' : 'weight'] * 100).toFixed(1)
                                : 0
                    } : null
                }
            />
        </div>
    );
}
