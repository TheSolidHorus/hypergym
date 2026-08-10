import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setError("");
        if (!email.trim()) return setError("Inserisci la tua email");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Email non valida");
        setLoading(true);
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/reset-password' });
            if (resetError?.status === 429) { setError("Troppe richieste. Riprova tra poco."); return; }
            setSent(true);
        } catch (err) { setError("Si è verificato un errore. Riprova."); }
        finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-display px-6">
            <div className="pt-10">
                <button onClick={() => navigate("/login")} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
            </div>

            <div className="pt-6 text-center">
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center mb-3">
                    <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl"></div>
                    <img 
                        src="/logo.png" 
                        alt="HyperGym Logo" 
                        className="relative z-10 w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                    />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">HYPER</h1>
                <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase mb-1">GYM &bull; SPORT &bull; CONDITIONING</p>
                <p className="text-slate-400 text-sm font-medium mt-1">Recupero Password</p>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-8">
                {!sent ? (
                    <>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-foreground mb-2">Password dimenticata?</h2>
                            <p className="text-sm text-slate-400">Inserisci la tua email e ti invieremo un <strong className="text-slate-300">link</strong> per reimpostarla.</p>
                        </div>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
                                    <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                        placeholder="mario@email.com" autoFocus onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                        className="w-full bg-card border border-border rounded-xl p-4 pl-12 text-base font-medium text-foreground placeholder-slate-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all shadow-sm" />
                                </div>
                            </div>
                            {error && <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-sm font-semibold text-center">{error}</div>}
                            <button onClick={handleSubmit} disabled={loading}
                                className={`w-full py-4 font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${loading ? 'bg-slate-800 text-slate-500' : 'bg-white text-black shadow-lg shadow-white/10 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98]'}`}>
                                {loading ? <span className="animate-pulse">Invio...</span> : <>Invia Link <span className="material-symbols-outlined text-lg">arrow_forward</span></>}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white/10 mx-auto flex items-center justify-center border-2 border-white">
                            <span className="material-symbols-outlined text-white text-3xl">check</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">Email inviata!</h2>
                            <p className="text-sm text-slate-400">Controlla la tua casella di posta e clicca sul link ricevuto per creare una nuova password.</p>
                        </div>
                        <button onClick={() => navigate("/login")}
                            className="mt-6 w-full py-3 bg-card border border-border text-foreground font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
                            Torna al Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
