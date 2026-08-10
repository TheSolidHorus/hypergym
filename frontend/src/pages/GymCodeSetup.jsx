import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useStore } from "../lib/store";

export default function GymCodeSetup() {
    const navigate = useNavigate();
    const { loginFromServer } = useStore();
    const [gymCode, setGymCode] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pendingData, setPendingData] = useState(null);

    useEffect(() => {
        // Recupera i dati temporanei salvati da AuthCallback
        const raw = sessionStorage.getItem('google_auth_pending');
        if (!raw) {
            // Nessun dato pendente, torna al login
            navigate("/login");
            return;
        }
        try {
            setPendingData(JSON.parse(raw));
        } catch {
            navigate("/login");
        }
    }, []);

    const handleConfirm = async () => {
        setError("");
        if (!gymCode.trim()) return setError("Inserisci il Codice Palestra");

        setLoading(true);
        try {
            // M-03: Usa la sessione corrente invece del token salvato (evita token scaduti)
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                sessionStorage.removeItem('google_auth_pending');
                navigate("/login");
                return;
            }

            // C-01 + M-04: Verifica codice palestra tramite RPC server-side
            const { data: isValid, error: rpcError } = await supabase.rpc('verify_gym_code', {
                input_code: gymCode.trim()
            });

            if (rpcError) {
                throw new Error("Impossibile verificare il codice. Riprova.");
            }

            if (!isValid) {
                throw new Error("Codice Palestra non valido. Chiedi il codice al tuo coach.");
            }

            // Aggiorna il profilo con dati aggiuntivi
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    phone: phone.trim() || null,
                    training_days_goal: 3,
                })
                .eq('id', pendingData.user_id);

            if (updateError) {
                console.warn("Profile update warning:", updateError);
            }

            // Pulisci dati temporanei
            sessionStorage.removeItem('google_auth_pending');

            // Popola lo store con la sessione aggiornata
            loginFromServer({
                access_token: session.access_token,
                user: {
                    name: pendingData.name,
                    email: pendingData.email,
                    phone: phone.trim() || '',
                    avatar_url: pendingData.avatar_url,
                    training_days_goal: 3,
                    streak: 0,
                    workouts_completed: 0,
                    certificate_uploaded: false,
                    certificate_filename: null,
                    certificate_expires_at: null
                }
            });

            navigate("/");
        } catch (err) {
            setError(err.message || "Errore durante la verifica");
        } finally {
            setLoading(false);
        }
    };

    if (!pendingData) return null;

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-display px-6">

            {/* Header */}
            <div className="pt-16 text-center">
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center mb-4">
                    <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl" />
                    {pendingData.avatar_url ? (
                        <img
                            src={pendingData.avatar_url}
                            alt="Avatar"
                            className="relative z-10 w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
                        />
                    ) : (
                        <img
                            src="/logo.png"
                            alt="HyperGym Logo"
                            className="relative z-10 w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        />
                    )}
                </div>
                <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">
                    Benvenuto!
                </h1>
                <p className="text-slate-400 text-sm font-medium mt-1">
                    Ciao <span className="font-bold text-white">{pendingData.name}</span>! Un ultimo passaggio.
                </p>
            </div>

            {/* Form */}
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-8 space-y-5">

                {/* Info card */}
                <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sm">
                    <span className="material-symbols-outlined text-slate-300 text-xl mt-0.5">info</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        Per accedere a HyperGym hai bisogno del <strong className="text-white">Codice Palestra</strong> fornito dal tuo coach o dalla tua struttura.
                    </p>
                </div>

                {/* Codice Palestra */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Codice Palestra <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">vpn_key</span>
                        <input
                            type="text"
                            value={gymCode}
                            onChange={(e) => { setGymCode(e.target.value); setError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                            placeholder="Inserisci il codice di sblocco"
                            autoFocus
                            className="w-full bg-card border border-border rounded-xl p-4 pl-12 text-base font-medium text-foreground placeholder-slate-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all shadow-sm uppercase"
                        />
                    </div>
                </div>

                {/* Telefono (opzionale) */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Numero di Telefono <span className="text-slate-500">(opzionale)</span>
                    </label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">phone</span>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                            placeholder="+39 123 456 7890"
                            className="w-full bg-card border border-border rounded-xl p-4 pl-12 text-base font-medium text-foreground placeholder-slate-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-sm font-semibold text-center">
                        {error}
                    </div>
                )}

                {/* Confirm Button */}
                <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className={`w-full py-4 font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${loading
                        ? 'bg-slate-800 text-slate-500'
                        : 'bg-white text-black shadow-lg shadow-white/10 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                >
                    {loading
                        ? <span className="animate-pulse">Verifica...</span>
                        : <>Entra in HyperGym <span className="material-symbols-outlined text-lg">arrow_forward</span></>
                    }
                </button>

                {/* Back to login */}
                <button
                    onClick={() => {
                        sessionStorage.removeItem('google_auth_pending');
                        supabase.auth.signOut();
                        navigate("/login");
                    }}
                    className="text-center text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
                >
                    Annulla e torna al login
                </button>
            </div>
        </div>
    );
}
