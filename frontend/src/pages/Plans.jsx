import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import { exportPlanToPDF } from "../utils/pdfExport";

export default function Plans() {
    const navigate = useNavigate();
    const { plans, startWorkout, deletePlan, userProfile } = useStore();
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ coach_id: null, location: null, goal: 'ipertrofia', days: 3, injuries: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [selectedPlanForStart, setSelectedPlanForStart] = useState(null);
    const [coaches, setCoaches] = useState([]);

    useEffect(() => {
        const fetchCoaches = async () => {
            const { data } = await supabase.from('profiles').select('id, name, email, avatar_url').in('role', ['trainer', 'coach']).order('name');
            setCoaches(data || []);
        };
        fetchCoaches();
    }, []);

    const handleLocationSelect = (loc) => { setFormData(prev => ({ ...prev, location: loc })); setStep(3); };

    const handleStart = (planId) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;
        const isSplit = plan.exercises?.length > 0 && plan.exercises[0].exercises && Array.isArray(plan.exercises[0].exercises);
        if (isSplit) setSelectedPlanForStart(plan);
        else { startWorkout(planId); navigate("/workout/active"); }
    };

    const handleExportPDF = (e, plan) => { e.stopPropagation(); exportPlanToPDF(plan); if (navigator.vibrate) navigator.vibrate(50); };

    const handleDelete = (e, planId, planName) => {
        e.stopPropagation();
        if (window.confirm(`Sei sicuro di voler eliminare la scheda "${planName}"?`)) { deletePlan(planId); if (navigator.vibrate) navigator.vibrate([50, 50]); }
    };

    const submitRequest = async () => {
        if (!formData.location) return;
        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase.from('coaching_requests').insert({
                user_id: user.id, trainer_id: formData.coach_id, location: formData.location, status: 'pending', details: { ...formData }
            });
            if (error) { alert("Errore invio richiesta: " + error.message); }
            else { alert("✅ Richiesta inviata al Coach!"); setShowRequestModal(false); setStep(1); setFormData({ coach_id: null, location: null, goal: 'ipertrofia', days: 3, injuries: '', notes: '' }); }
        }
        setSubmitting(false);
    };

    return (
        <div className="p-4 pt-12 pb-24 max-w-md mx-auto min-h-screen relative bg-background">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black italic text-slate-900 uppercase -skew-x-6 leading-none">
                        Le tue <span className="text-primary not-italic">Schede</span>
                    </h1>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Gestisci i tuoi workout</p>
                </div>
                <div className="flex gap-3">
                    {userProfile.role !== 'admin' && userProfile.role !== 'trainer' && (
                        <button onClick={() => setShowRequestModal(true)}
                            className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-90"
                            title="Richiedi Scheda al Coach">
                            <span className="material-symbols-outlined">chat</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-4 animate-in slide-in-from-bottom-8 duration-500">
                {plans.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 shadow-sm">
                        <span className="material-symbols-outlined text-slate-300 text-5xl mb-3 block">fitness_center</span>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Nessuna scheda attiva</p>
                        <div className="flex flex-col gap-3 max-w-[200px] mx-auto">
                            {userProfile.role !== 'admin' && userProfile.role !== 'trainer' && (
                                <button onClick={() => setShowRequestModal(true)}
                                    className="px-4 py-3 bg-primary text-white font-bold uppercase text-xs rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                                    Richiedi al Coach
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    plans.map((plan) => (
                        <div key={plan.id} onClick={() => handleStart(plan.id)}
                            className="group bg-white border border-slate-100 rounded-2xl p-5 active:scale-[0.98] transition-all cursor-pointer hover:border-primary/30 relative overflow-hidden shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div className="bg-slate-50 border border-slate-200 text-[10px] font-black text-slate-500 px-2 py-1 rounded uppercase tracking-[0.2em]">
                                    {plan.days || '3gg'}
                                </div>
                                <div className="flex gap-2 -mr-2 -mt-2">
                                    {!plan.isAssigned && (
                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/plans/new?editId=${plan.id}`); }} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 hover:scale-110 rounded-xl transition-all" title="Modifica Scheda">
                                            <span className="material-symbols-outlined text-xl">edit</span>
                                        </button>
                                    )}
                                    <button onClick={(e) => handleExportPDF(e, plan)} className="p-2 text-slate-300 hover:text-primary hover:scale-110 transition-all" title="Scarica PDF">
                                        <span className="material-symbols-outlined text-xl">download</span>
                                    </button>
                                    {!plan.isAssigned && (
                                        <button onClick={(e) => handleDelete(e, plan.id, plan.name)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 hover:scale-110 rounded-xl transition-all" title="Elimina Scheda">
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300 pointer-events-none">
                                <span className="material-symbols-outlined text-5xl text-primary/10">chevron_right</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-primary transition-colors italic uppercase tracking-tighter w-[85%] truncate">{plan.name}</h3>
                            <div className="flex items-center gap-3 mt-4 text-xs font-bold text-slate-400 uppercase tracking-wide">
                                <span className="flex items-center gap-1">{plan.exercises.length} Ex</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="text-slate-500">{plan.duration_weeks || 4} Settimane</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="text-slate-400 truncate max-w-[80px]">Ultimo: {plan.lastPerformed ? new Date(plan.lastPerformed).toLocaleDateString() : 'Mai'}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4 animate-in fade-in pt-16">
                    <div className="bg-white border border-slate-100 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto">
                        <button onClick={() => { setShowRequestModal(false); setStep(1); setFormData({ ...formData, coach_id: null, location: null }); }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-full p-2 transition-all">
                            <span className="material-symbols-outlined text-lg block">close</span>
                        </button>
                        <h2 className="text-xl font-black text-slate-900 italic uppercase mb-2">Richiedi Scheda</h2>
                        
                        {step === 1 ? (
                            <>
                                <p className="text-slate-500 text-sm mb-4 leading-relaxed">Scegli il Coach che preparerà il tuo programma personalizzato.</p>
                                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                                    {coaches.map(coach => (
                                        <button key={coach.id} onClick={() => { setFormData(prev => ({ ...prev, coach_id: coach.id })); setStep(2); }}
                                            className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left shadow-sm ${formData.coach_id === coach.id ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white hover:border-primary/30'}`}>
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-inner" style={{ background: 'linear-gradient(135deg, #ff6a00, #ffb000)' }}>
                                                {coach.name?.[0] || '?'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900 text-sm">{coach.name}</p>
                                                <p className="text-[10px] text-slate-400">{coach.email}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                                        </button>
                                    ))}
                                    {coaches.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nessun coach disponibile al momento.</p>}
                                </div>
                            </>
                        ) : step === 2 ? (
                            <>
                                <p className="text-slate-500 text-sm mb-4 leading-relaxed">Dove ti alleni?</p>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <button onClick={() => handleLocationSelect('home')}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 shadow-sm ${formData.location === 'home' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}>
                                        <span className="material-symbols-outlined text-4xl">home</span>
                                        <span className="text-xs font-bold uppercase tracking-wider mt-2">A Casa</span>
                                    </button>
                                    <button onClick={() => handleLocationSelect('gym')}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 shadow-sm ${formData.location === 'gym' ? 'border-blue-500 bg-blue-50 text-blue-500' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}>
                                        <span className="material-symbols-outlined text-4xl tracking-tighter" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                                        <span className="text-xs font-bold uppercase tracking-wider mt-2">In Palestra</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4 animate-in slide-in-from-right-8 fade-in duration-300">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Obiettivo Principale</p>
                                    <select value={formData.goal} onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                                        className="w-full bg-white text-slate-900 rounded-lg p-3 text-sm font-bold border border-slate-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none shadow-sm">
                                        <option value="ipertrofia">💪 Ipertrofia (Massa)</option>
                                        <option value="dimagrimento">🔥 Dimagrimento</option>
                                        <option value="forza">🏋️ Forza Pura</option>
                                        <option value="tonificazione">✨ Tonificazione</option>
                                        <option value="resistenza">🏃 Resistenza / Cardio</option>
                                    </select>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex justify-between">Giorni a settimana: <span className="text-primary">{formData.days}</span></p>
                                    <input type="range" min="1" max="7" value={formData.days} onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                                        className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2 uppercase"><span>1 Relax</span><span>7 Beast</span></div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Infortuni o Limitazioni</p>
                                    <textarea value={formData.injuries} onChange={(e) => setFormData({ ...formData, injuries: e.target.value })} placeholder="Es. Dolore alla spalla..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 min-h-[60px] shadow-sm" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Note per il Coach</p>
                                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Vorrei focalizzarmi sui glutei..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 min-h-[80px] shadow-sm" />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setStep(2)} className="px-4 py-3 bg-slate-100 text-slate-500 font-bold uppercase text-xs rounded-xl hover:bg-slate-200 hover:text-slate-700 transition-colors">Indietro</button>
                                    <button disabled={submitting} onClick={submitRequest} className="flex-1 bg-primary text-white font-black uppercase py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                                        {submitting ? 'Invio...' : <><span className="material-symbols-outlined text-lg">check</span> Invia Richiesta</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedPlanForStart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4 animate-in fade-in pt-16">
                    <div className="bg-white border border-slate-100 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl">
                        <button onClick={() => setSelectedPlanForStart(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-full p-2 transition-all">
                            <span className="material-symbols-outlined text-lg block">close</span>
                        </button>
                        <h2 className="text-xl font-black text-slate-900 italic uppercase mb-2">Scegli Allenamento</h2>
                        <p className="text-slate-500 text-sm mb-6">Quale giornata della scheda vuoi fare oggi?</p>
                        <div className="space-y-3">
                            {selectedPlanForStart.exercises.map((day, index) => (
                                <button key={index} onClick={() => { startWorkout(selectedPlanForStart.id, index); navigate("/workout/active"); }}
                                    className="w-full bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 p-4 rounded-xl flex items-center justify-between group transition-all shadow-sm focus:border-primary focus:ring-1 focus:ring-primary/20">
                                    <div className="text-left">
                                        <h3 className="font-bold text-slate-900 uppercase group-hover:text-primary transition-colors">{day.name || `Giorno ${index + 1}`}</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase mt-1">{day.exercises?.length || 0} Esercizi • {Array.isArray(day.targetDays) ? day.targetDays.join(', ') : 'Libero'}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
