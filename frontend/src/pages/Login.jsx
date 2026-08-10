import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";

// Icona SVG ufficiale di Google
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4"/>
        <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7252 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853"/>
        <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.03298C-0.371021 20.0112 -0.371021 28.0009 3.03298 34.7825L11.0051 28.6006Z" fill="#FBBC04"/>
        <path d="M24.48 9.49932C27.9016 9.44641 31.2086 10.7339 33.6866 13.0973L40.5387 6.24523C36.2 2.17101 30.4414 -0.068932 24.48 0.00161733C15.4055 0.00161733 7.10718 5.11644 3.03296 13.2296L11.005 19.4115C12.901 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335"/>
    </svg>
);

export default function Login() {
    const navigate = useNavigate();
    const { loginFromServer } = useStore();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGoogleLogin = async () => {
        setError("");
        setGoogleLoading(true);
        try {
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });
            if (oauthError) throw oauthError;
            // Il browser viene reindirizzato automaticamente — non serve altro
        } catch (err) {
            console.error('Google login error:', err);
            setError(err.message || "Errore durante il login con Google");
            setGoogleLoading(false);
        }
    };

    const handleLogin = async () => {
        setError("");
        if (!email.trim()) return setError("Inserisci la tua email");
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.trim())) return setError("Email non valida (es. nome@gmail.com)");
        if (!password) return setError("Inserisci la password");

        setLoading(true);
        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });
            if (authError) throw new Error(authError.message);
            if (!data.user || !data.session) throw new Error("Login fallito");

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Errore recupero profilo:', profileError);
            }

            loginFromServer({
                access_token: data.session.access_token,
                user: {
                    name: profile?.name || data.user.email?.split('@')[0] || 'Utente',
                    email: data.user.email,
                    phone: profile?.phone || '',
                    avatar_url: profile?.avatar_url,
                    training_days_goal: profile?.training_days_goal || 3,
                    streak: profile?.streak || 0,
                    workouts_completed: profile?.workouts_completed || 0,
                    certificate_uploaded: profile?.certificate_uploaded || false,
                    certificate_filename: profile?.certificate_filename || null,
                    certificate_expires_at: profile?.certificate_expires_at || null
                }
            });
            navigate("/");
        } catch (err) {
            console.error('Login error:', err);
            if (err.message?.includes('Invalid login credentials')) {
                setError("Email o password errati");
            } else if (err.message?.includes('Email not confirmed')) {
                setError("Email non verificata. Controlla la tua casella.");
            } else {
                setError(err.message || "Errore durante il login");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-display">

            {/* Logo */}
            <div className="pt-16 text-center px-6">
                <div className="relative w-32 h-32 mx-auto flex items-center justify-center mb-4">
                    <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl"></div>
                    <img 
                        src="/logo.png" 
                        alt="HyperGym Logo" 
                        className="relative z-10 w-28 h-28 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                    />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">HYPER</h1>
                <p className="text-slate-400 text-xs font-semibold tracking-wider mt-1 uppercase">GYM &bull; SPORT &bull; CONDITIONING</p>
                <p className="text-slate-400 text-sm font-medium mt-2">Accedi al tuo account</p>
            </div>

            {/* Form */}
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-6 py-8 space-y-5">

                {/* Email */}
                <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(""); }}
                            placeholder="mario@email.com"
                            autoFocus
                            className="w-full bg-card border border-border rounded-xl p-4 pl-12 text-base font-medium text-foreground placeholder-slate-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(""); }}
                            placeholder="La tua password"
                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                            className="w-full bg-card border border-border rounded-xl p-4 pl-12 pr-12 text-base font-medium text-foreground placeholder-slate-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all shadow-sm"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                            <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                    </div>
                    <div className="flex justify-end pt-1">
                        <button type="button" onClick={() => navigate("/forgot-password")} className="text-[10px] font-black uppercase text-slate-300 tracking-widest hover:text-white transition-colors">
                            Password dimenticata?
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-sm font-semibold text-center">
                        {error}
                    </div>
                )}

                {/* Login Button */}
                <button onClick={handleLogin} disabled={loading || googleLoading}
                    className={`w-full py-4 font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${loading ? 'bg-slate-800 text-slate-500' : 'bg-white text-black shadow-lg shadow-white/10 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98]'
                        }`}>
                    {loading ? <span className="animate-pulse">Accesso...</span> : <><>Accedi </><span className="material-symbols-outlined text-lg">arrow_forward</span></> }
                </button>

                {/* Divisore */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">oppure</span>
                    <div className="flex-1 h-px bg-border" />
                </div>

                {/* Google Login Button */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading || googleLoading}
                    className="w-full py-3.5 bg-card border border-border rounded-xl font-semibold text-foreground text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow-md hover:border-slate-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {googleLoading ? (
                        <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                    ) : (
                        <GoogleIcon />
                    )}
                    {googleLoading ? "Connessione a Google..." : "Continua con Google"}
                </button>
            </div>

            {/* Bottom */}
            <div className="pb-8 max-w-sm mx-auto w-full px-6">
                <button onClick={() => navigate("/register")}
                    className="w-full py-3 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors text-center">
                    Non hai un account? <span className="text-white font-black underline underline-offset-4">Registrati</span>
                </button>
            </div>
        </div>
    );
}
