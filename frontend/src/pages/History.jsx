import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";

export default function History() {
    const navigate = useNavigate();
    const { history, deleteHistoryItem } = useStore();

    const handleDelete = (id, sessionName, e) => {
        e.stopPropagation();
        if (window.confirm(`Eliminare l'allenamento "${sessionName}" dello storico? Questa azione è irreversibile.`)) deleteHistoryItem(id);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/D";
        return new Date(dateString).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-slate-900 p-4 pt-12 pb-24">

            <div className="flex items-center gap-4 mb-8 sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b border-slate-200">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-primary rounded-full hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-2xl font-bold uppercase text-slate-900 tracking-tight">Storico</h1>
            </div>

            <div className="space-y-3 animate-in slide-in-from-bottom-4">
                {history.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                        <span className="material-symbols-outlined text-slate-300 text-5xl mb-4 block">schedule</span>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nessun allenamento completato</p>
                    </div>
                ) : (
                    history.map((session) => (
                        <div key={session.id}
                            className="bg-white border border-slate-100 rounded-2xl p-5 flex justify-between items-center group hover:border-primary/20 transition-colors shadow-sm">
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 text-lg tracking-tight mb-1">
                                    {session.name || session.planName || 'Allenamento'}
                                </h3>
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-wide">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                                        {formatDate(session.completedAt || session.completed_at || session.startedAt)}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span>{session.exercises?.length || 0} Esercizi</span>
                                </div>
                            </div>
                            <button onClick={(e) => handleDelete(session.id, session.name || 'Allenamento', e)}
                                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95">
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
