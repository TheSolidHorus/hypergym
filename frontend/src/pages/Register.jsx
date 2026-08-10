import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

// Icona SVG ufficiale di Google
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4"/>
        <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7252 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853"/>
        <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.03298C-0.371021 20.0112 -0.371021 28.0009 3.03298 34.7825L11.0051 28.6006Z" fill="#FBBC04"/>
        <path d="M24.48 9.49932C27.9016 9.44641 31.2086 10.7339 33.6866 13.0973L40.5387 6.24523C36.2 2.17101 30.4414 -0.068932 24.48 0.00161733C15.4055 0.00161733 7.10718 5.11644 3.03296 13.2296L11.005 19.4115C12.901 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335"/>
    </svg>
);

export default function Register() {
    const navigate = useNavigate();
    const { loginFromServer } = useStore();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Stato OTP
    const [otpCode, setOtpCode] = useState("");
    const [otpTimer, setOtpTimer] = useState(0);
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);

    const handleGoogleRegister = async () => {
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
        } catch (err) {
            console.error('Google register error:', err);
            setError(err.message || "Errore durante la registrazione con Google");
            setGoogleLoading(false);
        }
    };

    const [formData, setFormData] = useState({
        name: "", email: "", phone: "", password: "", confirmPassword: "", acceptPrivacy: false, gymCode: ""
    });

    const updateField = (field, value) => { 
        setFormData({ ...formData, [field]: value }); 
        setError(""); 
        if (field === 'phone') {
            setOtpVerified(false);
            setOtpCode("");
        }
    };

    // Timer per reinvio OTP
    useEffect(() => {
        let interval = null;
        if (otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer((prev) => prev - 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    const formatPhoneNumber = (phone) => {
        let clean = phone.replace(/\s+/g, '');
        if (!clean.startsWith('+')) {
            clean = '+39' + clean.replace(/^0+/, '');
        }
        return clean;
    };

    // Invio OTP via Supabase Auth SMS
    const sendOtpCode = async (phone) => {
        setOtpSending(true);
        setError("");
        try {
            const formattedPhone = formatPhoneNumber(phone);
            const { error: sendError } = await supabase.auth.signInWithOtp({
                phone: formattedPhone,
            });

            if (sendError) {
                console.error("Errore invio OTP Supabase:", sendError);
                if (sendError.message?.toLowerCase().includes("provider") || sendError.message?.toLowerCase().includes("not configured")) {
                    throw new Error("Servizio SMS non ancora configurato nel dashboard Supabase. Assicurati di abilitare il provider SMS (es. Twilio).");
                }
                throw new Error(sendError.message || "Impossibile inviare l'SMS con il codice OTP.");
            }

            setOtpTimer(60);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setOtpSending(false);
        }
    };

    // Verifica OTP inserito dall'utente
    const handleVerifyOtp = async () => {
        setError("");
        if (!otpCode || otpCode.trim().length < 6) {
            return setError("Inserisci il codice OTP a 6 cifre inviato sul tuo cellulare");
        }

        setLoading(true);
        try {
            const formattedPhone = formatPhoneNumber(formData.phone);
            const { error: verifyError } = await supabase.auth.verifyOtp({
                phone: formattedPhone,
                token: otpCode.trim(),
                type: 'sms',
            });

            if (verifyError) {
                throw new Error(verifyError.message || "Codice OTP non valido o scaduto. Riprova.");
            }

            setOtpVerified(true);
            setStep(4);
        } catch (err) {
            console.error("Errore verifica OTP:", err);
            setError(err.message || "Codice OTP errato. Riprova.");
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = async () => {
        setError("");
        if (step === 1) {
            if (!formData.name.trim()) return setError("Inserisci il tuo nome");
            setStep(2);
        } else if (step === 2) {
            if (!formData.email.trim()) return setError("Inserisci la tua email");
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(formData.email)) return setError("Email non valida (es. nome@gmail.com)");
            if (!formData.phone.trim()) return setError("Inserisci il tuo numero di telefono");
            const phoneDigits = formData.phone.replace(/\D/g, '');
            if (phoneDigits.length < 8) return setError("Numero di telefono non valido (es. +39 340 123 4567)");
            if (!formData.password) return setError("Inserisci una password");
            const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.]).{8,}$/;
            if (!strongPasswordRegex.test(formData.password)) {
                return setError("La password deve avere 8+ caratteri e includere: Maiuscola, minuscola, numero e un simbolo (@$!%*?&.)");
            }
            if (formData.password !== formData.confirmPassword) return setError("Le password non corrispondono");

            // Invia il codice OTP tramite Supabase Auth SMS e passa allo step 3
            setLoading(true);
            const sent = await sendOtpCode(formData.phone);
            setLoading(false);
            if (sent) {
                setStep(3);
            }
        } else if (step === 3) {
            // Nello step 3 la verifica avviene con il pulsante handleVerifyOtp
            await handleVerifyOtp();
        } else if (step === 4) {
            if (!otpVerified) {
                setStep(3);
                return setError("Verifica prima il tuo numero di telefono con il codice OTP.");
            }
            if (!formData.gymCode || !formData.gymCode.trim()) return setError("Inserisci il Codice Palestra");
            if (!formData.acceptPrivacy) return setError("Devi accettare l'informativa privacy");
            setLoading(true);
            try {
                // Verifica codice palestra tramite RPC server-side
                const { data: isValid, error: rpcError } = await supabase.rpc('verify_gym_code', {
                    input_code: formData.gymCode.trim()
                });

                if (rpcError) {
                    throw new Error("Impossibile verificare il codice. Riprova.");
                }

                if (!isValid) {
                    throw new Error("Codice Palestra non valido. Chiedi il codice al tuo coach.");
                }

                const formattedPhone = formatPhoneNumber(formData.phone);
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email: formData.email.trim(), password: formData.password,
                    options: { data: { name: formData.name.trim(), phone: formattedPhone } }
                });
                if (signUpError) throw new Error(signUpError.message);
                if (!authData.user) throw new Error("Registrazione fallita");

                // Aggiorniamo i campi extra nel profilo utente
                await supabase.from('profiles').update({
                    phone: formattedPhone || null,
                    training_days_goal: 3,
                }).eq('id', authData.user.id);

                if (authData.session) {
                    loginFromServer({
                        access_token: authData.session.access_token,
                        user: {
                            name: formData.name.trim(), email: formData.email.trim(), phone: formattedPhone || '',
                            training_days_goal: 3, streak: 0, workouts_completed: 0,
                            certificate_uploaded: false, certificate_filename: null, certificate_expires_at: null
                        }
                    });
                }
                setStep(5);
            } catch (err) {
                if (err.message?.includes('already registered')) setError("Email già registrata. Prova ad accedere.");
                else if (err.message?.includes('Password should be')) setError("La password deve essere più forte");
                else setError(err.message || "Errore durante la registrazione");
            } finally { setLoading(false); }
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-slate-900 font-display px-6">

            {/* Back */}
            <div className="pt-10">
                {step > 1 && step < 5 && (
                    <button onClick={() => setStep(step - 1)} className="p-2 -ml-2 text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                )}
            </div>

            {/* Logo */}
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
                <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase mb-2">GYM &bull; SPORT &bull; CONDITIONING</p>
                <p className="text-slate-400 text-sm font-medium">
                    {step === 1 && "Iniziamo! Come ti chiami?"}
                    {step === 2 && "Contatti e Password"}
                    {step === 3 && "Verifica Codice OTP"}
                    {step === 4 && "Conferma i tuoi dati"}
                    {step === 5 && "Benvenuto!"}
                </p>
            </div>

            {/* Progress Bar (4 passi attivi prima del completamento) */}
            {step < 5 && (
                <div className="flex gap-2 max-w-sm mx-auto w-full mt-6 mb-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-slate-200'}`} />
                    ))}
                </div>
            )}

            {/* Form */}
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-6 space-y-5">

                {step === 1 && (
                    <div className="space-y-5">
                        {/* Google Register Button */}
                        <button
                            onClick={handleGoogleRegister}
                            disabled={googleLoading || loading}
                            className="w-full py-3.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow-md hover:border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {googleLoading ? (
                                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                            ) : (
                                <GoogleIcon />
                            )}
                            {googleLoading ? "Connessione a Google..." : "Continua con Google"}
                        </button>

                        {/* Divisore */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">oppure</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nome Completo</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">person</span>
                                <input type="text" value={formData.name} onChange={(e) => updateField('name', e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleContinue()} placeholder="Mario Rossi" autoFocus
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 pl-12 text-base font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
                                <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="tuaemail@esempio.com"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 pl-12 text-base font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Telefono</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">phone</span>
                                <input type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+39 340 123 4567"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 pl-12 text-base font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                            <p className="text-[10px] text-slate-400 pl-1">Invieremo un codice SMS per la verifica del tuo numero.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                                <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Minimo 8 caratteri"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 pl-12 pr-12 text-base font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary">
                                    <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>
                        {formData.password && <PasswordStrengthMeter password={formData.password} />}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conferma Password</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                                <input type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleContinue()} placeholder="Ripeti la password"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 pl-12 text-base font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Inserimento Codice OTP */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center space-y-2">
                            <span className="material-symbols-outlined text-primary text-3xl">sms</span>
                            <h3 className="font-bold text-slate-900 text-base">Codice SMS Inviato</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Abbiamo inviato un codice OTP di 6 cifre al numero:<br />
                                <span className="font-black text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-200 mt-1 inline-block">
                                    {formatPhoneNumber(formData.phone)}
                                </span>
                            </p>
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="text-[11px] font-bold text-slate-400 hover:text-primary transition-colors underline block mx-auto pt-1"
                            >
                                Numero errato? Modifica
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block text-center">Codice OTP</label>
                            <input
                                type="text"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => {
                                    setOtpCode(e.target.value.replace(/\D/g, ''));
                                    setError("");
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                                placeholder="123456"
                                autoFocus
                                className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-mono font-bold tracking-[0.4em] text-slate-900 placeholder-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                            />
                        </div>

                        {/* Reinvio SMS OTP */}
                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => sendOtpCode(formData.phone)}
                                disabled={otpTimer > 0 || otpSending}
                                className="text-xs font-bold text-primary hover:underline disabled:text-slate-400 disabled:no-underline transition-colors"
                            >
                                {otpSending ? "Invio in corso..." : otpTimer > 0 ? `Reinvia codice tra ${otpTimer}s` : "Non hai ricevuto il codice? Reinvia SMS"}
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-5">
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
                            <div><p className="text-xs text-slate-400 uppercase tracking-wide">Nome</p><p className="text-base font-bold text-slate-900">{formData.name}</p></div>
                            <div><p className="text-xs text-slate-400 uppercase tracking-wide">Email</p><p className="text-base font-bold text-slate-900">{formData.email}</p></div>
                            {formData.phone && (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide">Telefono</p>
                                        <p className="text-base font-bold text-slate-900">{formatPhoneNumber(formData.phone)}</p>
                                    </div>
                                    {otpVerified && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            <span className="material-symbols-outlined text-[14px]">verified</span> Verificato
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Codice Palestra</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">vpn_key</span>
                                <input type="text" value={formData.gymCode} onChange={(e) => updateField('gymCode', e.target.value)} placeholder="Inserisci il codice di sblocco"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 pl-12 text-base font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm uppercase" />
                            </div>
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={formData.acceptPrivacy} onChange={(e) => updateField('acceptPrivacy', e.target.checked)}
                                className="mt-1 w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0" />
                            <span className="text-xs text-slate-500 leading-relaxed">
                                Accetto l&apos;<button onClick={() => navigate("/privacy")} className="text-primary font-bold underline">informativa sulla privacy</button> e il trattamento dei miei dati personali
                            </span>
                        </label>
                    </div>
                )}

                {step === 5 && (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 rounded-full bg-white/10 mx-auto flex items-center justify-center mb-4 border-2 border-white">
                            <span className="material-symbols-outlined text-white text-4xl">check_circle</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-foreground mb-2">Registrazione Completata!</h2>
                            <p className="text-sm text-slate-400">Benvenuto in HyperGym, {formData.name}!</p>
                        </div>
                        <button onClick={() => navigate("/")}
                            className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-white/10 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Inizia Ora 🚀
                        </button>
                    </div>
                )}

                {error && step < 5 && (
                    <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-sm font-semibold text-center leading-relaxed">
                        {error}
                    </div>
                )}

                {step < 5 && (
                    <button onClick={handleContinue} disabled={loading || otpSending}
                        className={`w-full py-4 font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${loading || otpSending ? 'bg-slate-800 text-slate-500' : 'bg-white text-black shadow-lg shadow-white/10 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98]'}`}>
                        {loading ? <span className="animate-pulse">Caricamento...</span> : step === 3 ? <>Verifica Codice <span className="material-symbols-outlined text-lg">check_circle</span></> : <>Continua <span className="material-symbols-outlined text-lg">arrow_forward</span></>}
                    </button>
                )}
            </div>

            {step === 1 && (
                <div className="pb-8 max-w-sm mx-auto w-full">
                    <button onClick={() => navigate("/login")} className="w-full py-3 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors text-center">
                        Hai già un account? <span className="text-white font-bold underline underline-offset-4">Accedi</span>
                    </button>
                </div>
            )}
        </div>
    );
}

