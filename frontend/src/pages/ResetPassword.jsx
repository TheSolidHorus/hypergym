import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errorMSG, setErrorMSG] = useState("");
    const [success, setSuccess] = useState(false);

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [sessionVerified, setSessionVerified] = useState(false);

    // Verifica sessione al caricamento
    useEffect(() => {
        // Funzione per verificare sessione
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setSessionVerified(true);
            }
        };

        checkSession();

        // Ascolta cambi auth state (es: login automatico da magic link)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // PASSWORD_RECOVERY è l'evento specifico quando si clicca sul link di reset
            // SIGNED_IN è generico
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                setSessionVerified(true);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleReset = async () => {
        setErrorMSG("");

        if (!newPassword) return setErrorMSG("Inserisci la nuova password");
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.]).{8,}$/;
        if (!strongPasswordRegex.test(newPassword)) {
            return setErrorMSG("La password deve avere 8+ caratteri e includere: Maiuscola, minuscola, numero e simbolo (@$!%*?&.)");
        }
        if (newPassword !== confirmPassword) return setErrorMSG("Le password non corrispondono");

        setLoading(true);
        try {
            // Aggiorna password utente autenticato (da link magic link)
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => navigate("/login"), 3000);
        } catch (err) {
            console.error("Errore reset:", err);
            setErrorMSG(err.message || "Impossibile aggiornare la password");
        } finally {
            setLoading(false);
        }
    };

    if (!sessionVerified && !errorMSG) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 p-6 items-center justify-center space-y-6">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Verifica link di sicurezza...</p>
                <button onClick={() => navigate("/forgot-password")} className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-slate-600 underline mt-8 transition-colors">Torna indietro</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground p-6 font-display">

            {/* Back button */}
            <div className="pt-8">
                <button
                    onClick={() => navigate("/login")}
                    className="w-10 h-10 flex items-center justify-center bg-card border border-border shadow-sm rounded-full text-slate-400 hover:text-white transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
            </div>

            {/* Logo */}
            <div className="pt-6 text-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
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
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2 bg-card px-3 py-1 inline-block rounded-full border border-border">Nuova Password</p>
            </div>

            {/* Form */}
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-8">

                {!success ? (
                    <div className="space-y-6">

                        {/* Titolo e istruzioni */}
                        <div className="text-center mb-6 animate-in fade-in duration-500 delay-100">
                            <h2 className="text-2xl font-black text-foreground mb-2 uppercase tracking-tight">Reimposta Password</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Scegli una password forte e sicura.</p>
                        </div>

                        {/* Inputs Wrapper */}
                        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-200">
                            {/* Nuova Password */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nuova Password</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
                                    <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setErrorMSG(""); }}
                                        placeholder="Minimo 8 caratteri"
                                        className="w-full bg-background border border-border rounded-2xl p-4 pl-12 pr-12 text-sm font-bold text-foreground placeholder-slate-500 focus:bg-card focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all shadow-inner" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Conferma Password */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conferma Password</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock_clock</span>
                                    <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setErrorMSG(""); }}
                                        onKeyDown={(e) => e.key === "Enter" && handleReset()}
                                        placeholder="Ripeti la password"
                                        className="w-full bg-background border border-border rounded-2xl p-4 pl-12 text-sm font-bold text-foreground placeholder-slate-500 focus:bg-card focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all shadow-inner" />
                                </div>
                            </div>
                            
                            {/* Strength Meter */}
                            {newPassword && (
                                <PasswordStrengthMeter password={newPassword} />
                            )}
                        </div>

                        {/* Errore */}
                        {errorMSG && (
                            <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-2xl text-center shadow-sm animate-in shake">
                                <p className="text-red-300 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">error</span>
                                    {errorMSG}
                                </p>
                            </div>
                        )}

                        {/* Reset Button */}
                        <button onClick={handleReset} disabled={loading}
                            className={`w-full py-4 font-black uppercase tracking-widest text-xs rounded-2xl transition-all flex items-center justify-center gap-2 ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-black shadow-xl shadow-white/10 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98]'
                                }`}>
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                    Aggiornamento...
                                </>
                            ) : (
                                <>
                                    Salva Password <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </>
                            )}
                        </button>

                    </div>
                ) : (
                    <div className="text-center space-y-6 bg-card p-8 rounded-3xl border border-border shadow-sm animate-in zoom-in">
                        <div className="w-24 h-24 rounded-full bg-green-950/30 mx-auto flex items-center justify-center border border-green-800/50 shadow-inner">
                            <span className="material-symbols-outlined text-green-400 text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-foreground mb-2 uppercase tracking-tight">Password Aggiornata!</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">La password è stata cambiata con successo.</p>
                        </div>
                        <div className="bg-background rounded-xl p-3 inline-block border border-border">
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                                Reindirizzamento al login...
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom */}
            <div className="pb-8 max-w-sm mx-auto w-full">
                <button onClick={() => navigate("/login")}
                    className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors text-center flex items-center justify-center gap-2 bg-card rounded-2xl border border-border shadow-sm active:scale-95">
                    <span className="material-symbols-outlined text-[16px]">login</span> Torna al Login
                </button>
            </div>
        </div>
    );
}
