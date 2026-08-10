import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function FeedbackModal({ onClose }) {
    const [type, setType] = useState('bug');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utente non autenticato");

            const { error } = await supabase.from('app_feedback').insert({
                user_id: user.id,
                type,
                message
            });

            if (error) throw error;
            setStatus('success');
            setTimeout(onClose, 2000);
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    if (status === 'success') {
        const getSuccessMessage = () => {
            if (type === 'bug') return "Grazie per la segnalazione! La leggeremo subito per risolvere il bug.";
            if (type === 'idea') return "Grazie per questa fantastica idea! Ci aiuta molto a migliorare HyperGym.";
            return "Messaggio inviato! Grazie per averci contattato.";
        };

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-sm w-full text-center animate-in zoom-in shadow-2xl">
                    <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <span className="material-symbols-outlined text-[40px]">check_circle</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Grazie!</h3>
                    <p className="text-slate-500 text-xs font-bold mt-3 uppercase tracking-widest leading-relaxed">
                        {getSuccessMessage()}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div
                className="bg-white border border-slate-200 p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-300"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[28px]">
                                {type === 'bug' ? 'bug_report' : type === 'idea' ? 'lightbulb' : 'rate_review'}
                            </span> 
                            {type === 'bug' ? 'Segnala Bug' : type === 'idea' ? 'Nuova Idea' : 'Feedback'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 ml-[36px]">Aiutaci a migliorare</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-800 border border-slate-200 shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-500 mb-2.5 tracking-[0.2em] ml-1">Tipo di segnalazione</label>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { id: 'bug', label: 'Bug', icon: 'bug_report' },
                                { id: 'idea', label: 'Idea', icon: 'lightbulb' },
                                { id: 'other', label: 'Altro', icon: 'chat' }
                            ].map((item) => {
                                const isSelected = type === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setType(item.id)}
                                        className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${isSelected ? 'bg-primary text-white border-primary shadow-primary/20 scale-[1.02]' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}
                                    >
                                        <span className={`material-symbols-outlined text-[24px] ${isSelected ? 'text-white' : 'text-slate-400'}`}>{item.icon}</span>
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase font-black text-slate-500 mb-2.5 tracking-[0.2em] ml-1">Messaggio</label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Descrivi il problema o la tua idea..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[140px] resize-none placeholder:text-slate-400 font-bold shadow-inner"
                            required
                        />
                    </div>

                    {status === 'error' && (
                        <div className="bg-red-50 border border-red-200 text-red-500 text-xs p-3 rounded-xl text-center font-bold">
                            Errore durante l&apos;invio. Riprova più tardi.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'loading' || !message.trim()}
                        className="w-full bg-primary text-white font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                    >
                        {status === 'loading' ? (
                            <span className="animate-pulse">Invio in corso...</span>
                        ) : (
                            <>
                                {type === 'bug' ? 'Invia Segnalazione' : type === 'idea' ? 'Invia Idea' : 'Invia Feedback'} <span className="material-symbols-outlined text-[18px]">send</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-3">Oppure contattaci direttamente su</p>
                    <div className="flex gap-3">
                        <a href="https://wa.me/393427681514" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366]/10 text-[#25D366] rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-[#25D366]/20 border border-[#25D366]/20 shadow-sm active:scale-95">
                            <span className="material-symbols-outlined text-[18px]">forum</span> WhatsApp <span className="opacity-70 lowercase font-medium tracking-normal ml-1">+39 342 768 1514</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
