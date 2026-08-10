import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import AIGeneratorModal from "../components/AIGeneratorModal";

export default function PlanEditor() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const requestId = searchParams.get('requestId');
    const isTemplate = searchParams.get('isTemplate') === 'true';
    const editId = searchParams.get('editId');
    const editTplId = searchParams.get('editTplId');
    const { addPlan, updatePlan, userProfile } = useStore();

    const [targetUserId, setTargetUserId] = useState(searchParams.get('userId') || null);
    const [targetUserName, setTargetUserName] = useState(null);
    const [availableAthletes, setAvailableAthletes] = useState([]);

    useEffect(() => {
        if (targetUserId) {
            supabase.from('profiles').select('name').eq('id', targetUserId).single()
                .then(({ data }) => {
                    if (data) setTargetUserName(data.name);
                });
        }
    }, [targetUserId]);

    useEffect(() => {
        if (!isTemplate && userProfile?.role && userProfile.role !== 'client') {
            const fetchUsers = async () => {
                if (userProfile.role === 'admin') {
                    const { data } = await supabase.from('profiles').select('id, name').order('name');
                    setAvailableAthletes(data || []);
                } else if (userProfile.role === 'trainer') {
                    const { data } = await supabase.from('coaching_requests').select('user_id').eq('trainer_id', userProfile.id);
                    if (data && data.length > 0) {
                        const ids = [...new Set(data.map(d => d.user_id))];
                        const { data: athletes } = await supabase.from('profiles').select('id, name').in('id', ids).order('name');
                        setAvailableAthletes(athletes || []);
                    }
                }
            };
            fetchUsers();
        }
    }, [isTemplate, userProfile]);

    useEffect(() => {
        const fetchExistingPlan = async () => {
            if (editId) {
                const { data } = await supabase.from('workout_plans').select('*').eq('id', editId).single();
                if (data) {
                    setName(data.name);
                    setDaysSummary(data.days || "3");
                    setDuration(data.duration_weeks || 4);
                    if (data.exercises && data.exercises.length > 0) {
                        setWorkoutDays(data.exercises);
                        setActiveDayId(data.exercises[0].id);
                    }
                }
            } else if (editTplId) {
                const { data } = await supabase.from('workout_templates').select('*').eq('id', editTplId).single();
                if (data) {
                    setName(data.name);
                    setDaysSummary(data.days || "3");
                    const match = data.description?.match(/(\d+)/);
                    if (match) setDuration(parseInt(match[1]));
                    if (data.exercises && data.exercises.length > 0) {
                        setWorkoutDays(data.exercises);
                        setActiveDayId(data.exercises[0].id);
                    }
                }
            }
        };
        fetchExistingPlan();
    }, [editId, editTplId]);

    const [name, setName] = useState("");
    const [daysSummary, setDaysSummary] = useState("3"); // Frequenza settimanale indicativa
    const [duration, setDuration] = useState(4);

    // SPLIT ROUTINE STATE
    const [workoutDays, setWorkoutDays] = useState([
        { id: 'day-1', name: 'Giorno A', targetDays: [], exercises: [] }
    ]);
    const [activeDayId, setActiveDayId] = useState('day-1');

    const activeDay = workoutDays.find(d => d.id === activeDayId) || workoutDays[0];

    // Exercise Archive State
    const [showArchive, setShowArchive] = useState(false);
    const [library, setLibrary] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("petto");

    // Copy Plan State
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [savedTemplates, setSavedTemplates] = useState([]);

    // AI Generator State
    const [showAIModal, setShowAIModal] = useState(false);

    useEffect(() => {
        const fetchLibrary = async () => {
            const { data } = await supabase.from('exercise_library').select('*').order('name');
            if (data) setLibrary(data);
        };
        const fetchTemplates = async () => {
            const { data } = await supabase.from('workout_templates').select('*').order('created_at', { ascending: false });
            if (data) setSavedTemplates(data);
        };
        fetchLibrary();
        fetchTemplates();
    }, []);

    const categories = [...new Set(library.map(e => e.muscle_group))];

    const handleSave = async () => {
        if (!name.trim()) return alert("Dai un nome alla scheda!");
        
        const freq = parseInt(daysSummary, 10);
        if (!isNaN(freq) && freq > 7) {
            return alert("La frequenza suggerita non può essere maggiore di 7 giorni a settimana.");
        }

        // Validate each day has exercises
        const validDays = workoutDays.filter(day => day.exercises.some(e => e.name.trim()));
        if (validDays.length === 0) return alert("Aggiungi almeno un esercizio in un giorno!");

        if (isTemplate) {
            if (editTplId) {
                if (window.confirm(`Vuoi aggiornare il template "${name}"?`)) {
                    const { error } = await supabase.from('workout_templates').update({
                        name,
                        description: `${duration} settimane ${searchParams.get('editTplId') != null ? '• Modificato' : '• Modello Globale'}`,
                        days: daysSummary,
                        exercises: workoutDays
                    }).eq('id', editTplId);

                    if (error) {
                        alert(`Errore aggiornamento template: ${error.message}`);
                    } else {
                        alert(`✅ Modello "${name}" aggiornato!`);
                        navigate("/admin");
                    }
                }
                return;
            }

            if (window.confirm(`Confermi di voler salvare "${name}" come Modello (Template) globale?`)) {
                const { error } = await supabase.from('workout_templates').insert({
                    name,
                    description: `${duration} settimane`,
                    days: daysSummary,
                    exercises: workoutDays
                });

                if (error) {
                    alert(`Errore salvataggio template: ${error.message}`);
                } else {
                    alert(`✅ Modello "${name}" salvato nell'archivio globale!`);
                    navigate("/admin");
                }
            }
            return;
        }

        if (editId) {
            if (window.confirm(`Confermi di voler aggiornare la scheda "${name}"?`)) {
                const result = await updatePlan(editId, {
                    name,
                    days: daysSummary,
                    durationWeeks: duration,
                    exercises: workoutDays
                });
                if (result && result.error) {
                    alert(`Errore aggiornamento: ${result.error.message}`);
                } else {
                    alert(`✅ Scheda aggiornata con successo!`);
                    navigate("/plans");
                }
            }
            return;
        }

        const assigneeName = targetUserName || 'Te stesso';
        if (window.confirm(`Confermi di voler assegnare la scheda "${name}" a ${assigneeName}?`)) {
            const result = await addPlan({
                name,
                days: daysSummary, // Text summary
                durationWeeks: duration,
                exercises: workoutDays // Save the whole structure
            }, targetUserId);

            if (result && result.error) {
                alert(`Errore salvataggio: ${result.error.message}`);
            } else {
                // If this fulfilled a request, mark it as completed
                if (requestId) {
                    await supabase.from('coaching_requests').update({ status: 'completed' }).eq('id', requestId);
                }

                if (targetUserId) {
                    alert(`✅ Scheda assegnata a ${assigneeName}!`);
                    navigate("/admin");
                } else {
                    navigate("/plans");
                }
            }
        }
    };

    // --- EXERCISE LOGIC (TARGETS ACTIVE DAY) ---

    // Update ONE exercise in ACTIVE day
    const updateExercise = (exId, field, value) => {
        setWorkoutDays(days => days.map(day => {
            if (day.id !== activeDayId) return day;
            return {
                ...day,
                exercises: day.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e)
            };
        }));
    };

    const removeExercise = (exId) => {
        setWorkoutDays(days => days.map(day => {
            if (day.id !== activeDayId) return day;
            return {
                ...day,
                exercises: day.exercises.filter(e => e.id !== exId)
            };
        }));
    };

    const addExercise = () => {
        setWorkoutDays(days => days.map(day => {
            if (day.id !== activeDayId) return day;
            return {
                ...day,
                exercises: [...day.exercises, { id: Math.random(), name: "", sets: 3, reps: "10", rest: 90 }]
            };
        }));
    };

    const addFromArchive = (ex) => {
        setWorkoutDays(days => days.map(day => {
            if (day.id !== activeDayId) return day;
            return {
                ...day,
                exercises: [...day.exercises, { id: Math.random(), name: ex.name, sets: 3, reps: "10", rest: 90 }]
            };
        }));
        if (navigator.vibrate) navigator.vibrate(20);
        // alert(`Aggiunto a ${activeDay.name}: ${ex.name}`);
    };

    // --- DAY LOGIC ---

    const addDay = () => {
        const newId = `day-${Date.now()}`;
        const newName = String.fromCharCode(65 + workoutDays.length); // A, B, C...
        setWorkoutDays([...workoutDays, { id: newId, name: `Giorno ${newName}`, targetDays: [], exercises: [] }]);
        setActiveDayId(newId);
    };

    const removeDay = (dayId) => {
        if (workoutDays.length <= 1) return alert("Devi avere almeno un giorno!");
        const newDays = workoutDays.filter(d => d.id !== dayId);
        setWorkoutDays(newDays);
        if (activeDayId === dayId) setActiveDayId(newDays[0].id);
    };

    const updateDayName = (dayId, newName) => {
        setWorkoutDays(days => days.map(d => d.id === dayId ? { ...d, name: newName } : d));
    };

    const handleAIPlanGenerated = (plan) => {
        if (!plan || !Array.isArray(plan.workout_days)) return;
        if (!window.confirm(`✨ L'AI ha generato "${plan.name}". Vuoi caricarla nell'editor? La bozza attuale verrà sostituita.`)) return;
        setName(plan.name || "");
        setDaysSummary(plan.days_summary || `${plan.workout_days.length} giorni/settimana`);
        setDuration(plan.duration_weeks || 8);
        // Give fresh random IDs
        const newDays = plan.workout_days.map((day, i) => ({
            ...day,
            id: `day-${Date.now()}-${i}`,
            exercises: (day.exercises || []).map(ex => ({ ...ex, id: Math.random() }))
        }));
        setWorkoutDays(newDays);
        setActiveDayId(newDays[0]?.id || 'day-1');
    };

    const handleLoadTemplate = (tpl) => {
        if (window.confirm(`Vuoi sovrascrivere l'editor attuale con "${tpl.name}"?`)) {
            setName(tpl.name);
            setDaysSummary(tpl.days || "3");

            // Extract weeks from description like "4 settimane"
            let weeks = 4;
            if (tpl.description) {
                const match = tpl.description.match(/(\d+)/);
                if (match) weeks = parseInt(match[1]);
            }
            setDuration(weeks);

            // Give new random IDs to everything so it's a clone
            const newExercises = Array.isArray(tpl.exercises) ? tpl.exercises.map(day => ({
                ...day,
                id: `day-${Math.random()}`,
                exercises: Array.isArray(day.exercises) ? day.exercises.map(ex => ({
                    ...ex,
                    id: Math.random()
                })) : []
            })) : [];

            if (newExercises.length > 0) {
                setWorkoutDays(newExercises);
                setActiveDayId(newExercises[0].id);
            }

            setShowCopyModal(false);
        }
    };

    return (
        <>
        <div className="flex flex-col h-screen bg-background text-slate-900 p-4 font-sans animate-in fade-in pb-16">

            {/* Header */}
            <div className="flex items-center justify-between mb-2 pt-2 pb-4 border-b border-slate-200">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>
                <div className="text-center">
                    <h1 className="text-sm font-black uppercase tracking-[0.2em] text-primary">
                        {isTemplate ? (editTplId ? 'Modifica Modello' : 'Nuovo Modello') : (editId ? 'Modifica Scheda' : (targetUserId ? 'Assegna Scheda' : 'Nuova Scheda'))}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAIModal(true)}
                        className="text-[10px] font-black text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl uppercase tracking-widest transition-colors border border-slate-600 shadow-sm flex items-center gap-1"
                        title="Genera scheda con AI"
                    >
                        ✨ AI
                    </button>
                    <button onClick={() => setShowCopyModal(true)} className="text-[10px] font-black text-slate-300 bg-card hover:bg-slate-800 px-3 py-2 rounded-xl uppercase tracking-widest hover:text-white transition-colors border border-border shadow-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">inventory_2</span> Sfoglia
                    </button>
                    <button onClick={handleSave} className="text-xs font-black bg-white text-black px-5 py-2 rounded-xl uppercase tracking-widest hover:bg-slate-100 active:scale-[0.98] transition-all shadow-md shadow-white/10 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">save</span> Salva
                    </button>
                </div>
            </div>

            {/* Target User Banner */}
            <div className={`p-4 rounded-2xl border mb-6 flex items-center justify-between shadow-sm transition-colors ${targetUserId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                <div className="flex-1 mr-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] block mb-1 opacity-70 text-slate-500">
                        {isTemplate ? 'Tipo Scheda' : (targetUserId ? 'Atleta Destinatario' : 'Scheda Personale')}
                    </span>

                    {isTemplate ? (
                        <span className="font-black text-xl italic tracking-tighter text-amber-500">Modello Pubblico (Archivio)</span>
                    ) : (userProfile?.role === 'admin' || userProfile?.role === 'trainer') && !requestId ? (
                        <select
                            value={targetUserId || ""}
                            onChange={(e) => setTargetUserId(e.target.value || null)}
                            className="bg-transparent font-black italic tracking-tighter text-xl text-primary outline-none cursor-pointer w-full border-b-2 border-dashed border-primary/30 pb-1 appearance-none"
                        >
                            <option value="" className="text-slate-900 not-italic">👩‍💻 Per Te Stesso</option>
                            {availableAthletes.map(a => (
                                <option key={a.id} value={a.id} className="text-slate-900 not-italic">👤 {a.name}</option>
                            ))}
                        </select>
                    ) : (
                        <span className={`font-black italic tracking-tighter text-xl ${targetUserId ? 'text-primary' : 'text-slate-900'}`}>
                            {targetUserName || 'Per Te Stesso'}
                        </span>
                    )}
                </div>
                {targetUserId && <div className="text-primary font-black text-3xl drop-shadow-sm">👤</div>}
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pb-32 custom-scrollbar pr-1">
                {/* Name Input */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome Scheda Completa</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Es. Ipertrofia Gennaio"
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xl font-black italic tracking-tighter text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                    />
                </div>

                {/* Frequency Input */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Frequenza Suggerita</label>
                    <input
                        value={daysSummary}
                        onChange={(e) => setDaysSummary(e.target.value)}
                        placeholder="Es. 3 su 7, Lun-Mer-Ven"
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                    />
                </div>

                {/* Duration Input */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Durata (Settimane)</label>
                    <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <input
                            type="range"
                            min="2" max="18" step="1"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                            className="flex-1 accent-primary h-2 bg-slate-100 border border-slate-200 rounded-lg appearance-none cursor-pointer shadow-inner"
                        />
                        <span className="text-2xl font-black italic tracking-tighter text-primary w-10 text-center">{duration}</span>
                    </div>
                </div>

                <div className="border-t border-slate-200 my-4"></div>

                {/* DAY TABS */}
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block ml-1">Giornate di Allenamento</label>
                    <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide px-1">
                        {workoutDays.map((day) => (
                            <div key={day.id} className="relative group flex-shrink-0">
                                <button
                                    onClick={() => setActiveDayId(day.id)}
                                    className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeDayId === day.id
                                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/30 transform -translate-y-1'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm hover:-translate-y-0.5'
                                        }`}
                                >
                                    {day.name}
                                </button>
                                {workoutDays.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeDay(day.id); }}
                                        className="absolute -top-2 -right-2 bg-red-50 text-red-500 border border-red-200 shadow-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                    >
                                        <span className="material-symbols-outlined text-[14px] block">close</span>
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={addDay}
                            className="px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center flex-shrink-0"
                            title="Aggiungi Giornata"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                        </button>
                    </div>
                </div>

                {/* ACTIVE DAY EDITOR */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-5 shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-300 relative z-0">
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1.5 ml-1">Nome Giornata</label>
                            <input
                                value={activeDay.name}
                                onChange={(e) => updateDayName(activeDay.id, e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                                placeholder="Giorno A"
                            />
                        </div>
                        <div className="sm:w-1/3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1.5 ml-1">Giorni (es. Lun)</label>
                            <input
                                value={Array.isArray(activeDay.targetDays) ? activeDay.targetDays.join(', ') : activeDay.targetDays}
                                onChange={(e) => {
                                    const val = e.target.value.split(',').map(s => s.trim());
                                    setWorkoutDays(ds => ds.map(d => d.id === activeDay.id ? { ...d, targetDays: val } : d));
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                                placeholder="Libero"
                            />
                        </div>
                    </div>

                    {/* Exercises List for Active Day */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end mb-2 border-b border-slate-200 pb-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Esercizi ({activeDay.name})</label>
                            <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">{activeDay.exercises.length} Totali</span>
                        </div>

                        {activeDay.exercises.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">fitness_center</span>
                                <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Nessun esercizio aggiunto</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeDay.exercises.map((ex, i) => (
                                    <div key={ex.id} className="flex gap-2 items-center animate-in slide-in-from-right-8 duration-300">
                                        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-3 flex gap-4 items-center shadow-sm hover:border-slate-300 transition-colors group">
                                            <span className="text-xs font-black text-slate-300 w-4 tracking-tighter text-right">{i + 1}.</span>
                                            <input
                                                value={ex.name}
                                                onChange={(e) => updateExercise(ex.id, "name", e.target.value)}
                                                placeholder="Nome Esercizio"
                                                className="flex-1 bg-transparent text-sm font-bold text-slate-900 focus:outline-none placeholder-slate-300"
                                                autoFocus={i === activeDay.exercises.length - 1}
                                            />
                                            <div className="flex items-center gap-1 border-l border-slate-100 pl-4">
                                                <input
                                                    type="number"
                                                    value={ex.sets}
                                                    onChange={(e) => updateExercise(ex.id, "sets", parseInt(e.target.value) || 0)}
                                                    className="w-8 bg-slate-50 border border-slate-200 rounded p-1 text-center font-black text-xs text-primary focus:outline-none focus:border-primary shadow-inner"
                                                />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 hidden sm:inline">Set</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 sm:hidden">x</span>
                                            </div>
                                            <div className="flex items-center gap-1 border-l border-slate-100 pl-4">
                                                <input
                                                    value={ex.reps || ""}
                                                    onChange={(e) => updateExercise(ex.id, "reps", e.target.value)}
                                                    placeholder="10"
                                                    className="w-12 bg-slate-50 border border-slate-200 rounded p-1 text-center font-black text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:border-primary shadow-inner"
                                                />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 hidden sm:inline">Reps</span>
                                            </div>
                                            <div className="flex items-center gap-1 border-l border-slate-100 pl-4">
                                                <input
                                                    type="number"
                                                    step="10"
                                                    value={ex.rest !== undefined ? ex.rest : 90}
                                                    onChange={(e) => updateExercise(ex.id, "rest", parseInt(e.target.value) || 0)}
                                                    className="w-10 bg-slate-50 border border-slate-200 rounded p-1 text-center font-black text-xs text-slate-700 focus:outline-none focus:border-primary shadow-inner"
                                                    title="Secondi di recupero"
                                                />
                                                <span className="material-symbols-outlined text-[14px] text-slate-400">timer</span>
                                            </div>
                                        </div>
                                        <button onClick={() => removeExercise(ex.id)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm focus:outline-none">
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-6 mt-4">
                            <button
                                onClick={addExercise}
                                className="py-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 active:scale-[0.99] shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span> Manuale
                            </button>
                            <button
                                onClick={() => setShowArchive(true)}
                                className="py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-[0.99] shadow-md shadow-primary/20"
                            >
                                <span className="material-symbols-outlined text-[18px]">inventory_2</span> Archivio
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ARCHIVE MODAL */}
            {showArchive && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex flex-col justify-end animate-in fade-in" onClick={() => setShowArchive(false)}>
                    <div className="bg-white rounded-t-3xl min-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full"></div>
                        
                        <div className="p-6 pb-4 pt-10 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[28px]">inventory_2</span> Archivio Esercizi
                            </h2>
                            <button onClick={() => setShowArchive(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Categories */}
                        <div className="px-6 py-4 overflow-x-auto whitespace-nowrap custom-scrollbar border-b border-slate-100 bg-slate-50">
                            <div className="flex gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm ${selectedCategory === cat
                                            ? 'bg-primary text-white border-primary shadow-primary/20'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-24 custom-scrollbar">
                            {library.filter(e => e.muscle_group === selectedCategory).map(ex => (
                                <button
                                    key={ex.id}
                                    onClick={() => addFromArchive(ex)}
                                    className="w-full bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all hover:border-primary hover:shadow-md hover:shadow-primary/10 shadow-sm"
                                >
                                    <span className="font-bold text-slate-900 text-sm uppercase tracking-tight">{ex.name}</span>
                                    <div className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-full text-primary group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-colors shadow-inner group-hover:shadow-md">
                                        <span className="material-symbols-outlined text-[18px] font-bold">add</span>
                                    </div>
                                </button>
                            ))}
                            {library.length === 0 && (
                                <div className="text-center text-slate-400 py-10 font-bold uppercase tracking-widest text-xs flex flex-col items-center">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">hourglass_empty</span>
                                    Caricamento esercizi...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* COPY TEMPLATE MODAL */}
            {showCopyModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex flex-col justify-end animate-in fade-in" onClick={() => setShowCopyModal(false)}>
                    <div className="bg-white rounded-t-3xl min-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full"></div>
                        
                        <div className="p-6 pb-4 pt-10 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[28px]">file_copy</span> Carica Scheda
                                </h2>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-[0.2em]">Seleziona un modello in archivio</p>
                            </div>
                            <button onClick={() => setShowCopyModal(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24 custom-scrollbar bg-slate-50/50">
                            {savedTemplates.map(tpl => (
                                <div key={tpl.id} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-4 group shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-black text-slate-900 text-lg uppercase italic tracking-tighter">{tpl.name}</h3>
                                        <span className="bg-primary/10 border border-primary/20 text-primary !text-[10px] px-2.5 py-1 rounded-md uppercase font-black tracking-widest shadow-sm">{tpl.days || 'N/A'}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold">{tpl.description}</p>
                                    <button
                                        onClick={() => handleLoadTemplate(tpl)}
                                        className="w-full mt-2 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] py-3 rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-colors shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">check_circle</span> Usa questo modello
                                    </button>
                                </div>
                            ))}
                            {savedTemplates.length === 0 && (
                                <div className="text-center text-slate-400 py-12 font-bold uppercase tracking-widest text-[10px] flex flex-col items-center border-2 border-dashed border-slate-200 rounded-2xl bg-white m-2">
                                    <span className="material-symbols-outlined text-4xl mb-3 opacity-50">search_off</span>
                                    Nessun modello presente in archivio.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

            {/* AI GENERATOR MODAL */}
            {showAIModal && (
                <AIGeneratorModal
                    onClose={() => setShowAIModal(false)}
                    onPlanGenerated={handleAIPlanGenerated}
                />
            )}
        </>
    );
}
