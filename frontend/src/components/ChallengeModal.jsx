import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ChallengeModal({ open, onClose, onCreated }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetMetric, setTargetMetric] = useState("volume"); // volume, workouts, pr
    const [targetValue, setTargetValue] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    if (!open) return null;

    const handleSubmit = async () => {
        if (!title || !description || !targetValue || !endDate) return alert("Compila tutti i campi");

        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            alert("Non autenticato");
            setIsSaving(false);
            return;
        }

        const { data, error } = await supabase.from('community_challenges').insert({
            title,
            description,
            target_metric: targetMetric,
            target_value: parseFloat(targetValue),
            end_date: new Date(endDate).toISOString(),
            created_by: user.id
        }).select().single();

        setIsSaving(false);

        if (error) {
            console.error(error);
            alert("Errore durante la creazione della sfida");
        } else {
            onCreated(data);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black italic uppercase text-slate-900">Nuova Sfida</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full p-2 transition-colors">
                        <span className="material-symbols-outlined block">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Titolo Sfida</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="es. 10.000 KG Challenge"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descrizione (Breve)</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="es. Riuscirai a sollevare 10 tonnellate in una settimana?"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none h-20" />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Obiettivo (Metrica)</label>
                            <select value={targetMetric} onChange={e => setTargetMetric(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20">
                                <option value="volume">Volume Totale (KG)</option>
                                <option value="workouts">N° Allenamenti</option>
                                <option value="pr">Record Max (KG)</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Valore (Target)</label>
                            <input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="es. 10000"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Scadenza</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button onClick={onClose} 
                        className="flex-1 py-3 bg-white text-slate-500 font-bold text-xs uppercase border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                        Annulla
                    </button>
                    <button onClick={handleSubmit} disabled={isSaving}
                        className="flex-1 py-3 bg-primary text-white font-bold text-xs uppercase rounded-xl hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                        {isSaving ? <span className="material-symbols-outlined animate-spin text-sm block">sync</span> : null}
                        Crea Sfida
                    </button>
                </div>
            </div>
        </div>
    );
}
