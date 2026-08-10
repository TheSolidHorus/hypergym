import { useState, useEffect } from "react";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function VerifyEmail() {
    const { userProfile, logout, fetchUserData } = useStore();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Check automatico all'ingresso
    useEffect(() => {
        const check = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email_confirmed_at) {
                await fetchUserData();
                navigate('/');
            }
        };
        check();
    }, [navigate, fetchUserData]);

    const checkVerification = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) {
            await fetchUserData();
            navigate('/');
        } else {
            alert("Email non ancora verificata. Controlla la posta (anche spam) o clicca su 'Invia di nuovo'.");
        }
        setLoading(false);
    };

    const resendEmail = async () => {
        setLoading(true);
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: userProfile.email,
        });
        if (error) {
            alert("Errore: " + error.message);
        } else {
            alert("✅ Email rinviata! Controlla la posta in arrivo e spam.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 border border-slate-200 shadow-xl shadow-primary/10">
                <span className="material-symbols-outlined text-[48px] text-primary animate-pulse w-[48px] h-[48px] flex justify-center items-center">mail</span>
            </div>
            
            <h1 className="text-4xl font-black text-slate-900 italic uppercase mb-4 tracking-tighter">Verifica Email</h1>
            
            <p className="text-slate-500 mb-8 max-w-sm font-bold text-sm leading-relaxed">
                Abbiamo inviato un link di conferma a:<br />
                <span className="text-slate-900 font-black bg-white px-3 py-2 rounded-xl mt-3 inline-block border border-slate-200 shadow-sm">{userProfile.email || "tua email"}</span>
                <br /><br />
                Clicca sul link ricevuto per attivare il tuo account e iniziare ad allenarti.
            </p>

            <div className="space-y-3 w-full max-w-sm">
                <button
                    onClick={checkVerification}
                    disabled={loading}
                    className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-95"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Verifica in corso...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[20px]">check_circle</span> Ho Verificato
                        </>
                    )}
                </button>

                <button
                    onClick={resendEmail}
                    disabled={loading}
                    className="w-full py-4 bg-white text-slate-600 font-black uppercase tracking-widest text-xs rounded-2xl border border-slate-200 hover:border-primary hover:text-primary transition-all active:scale-95 shadow-sm"
                >
                    Non ho ricevuto l&apos;email
                </button>

                <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 mt-8 flex items-center justify-center gap-2 mx-auto transition-colors"
                >
                    <span className="material-symbols-outlined text-[16px]">logout</span> Email sbagliata? Esci
                </button>
            </div>

            <div className="mt-auto pt-12 pb-6 text-[10px] text-slate-300 font-mono uppercase font-bold">
                SECURITY CHECK PROTECTED
            </div>
        </div>
    );
}
