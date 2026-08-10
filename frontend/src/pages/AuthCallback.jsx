import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useStore } from "../lib/store";

export default function AuthCallback() {
    const navigate = useNavigate();
    const { loginFromServer } = useStore();
    const [status, setStatus] = useState("Completamento accesso...");

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Supabase gestisce automaticamente il token dalla URL
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error || !session) {
                    console.error("Auth callback error:", error);
                    setStatus("Errore durante l'accesso. Reindirizzamento...");
                    setTimeout(() => navigate("/login"), 2000);
                    return;
                }

                const user = session.user;

                // Controlla se il profilo esiste già
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                const isNewUser = profileError?.code === 'PGRST116' || !profile;

                if (!isNewUser && profile) {
                    // Utente esistente: popola lo store e vai alla home
                    loginFromServer({
                        access_token: session.access_token,
                        user: {
                            name: profile.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utente',
                            email: user.email,
                            phone: profile.phone || '',
                            avatar_url: profile.avatar_url || user.user_metadata?.avatar_url || null,
                            training_days_goal: profile.training_days_goal || 3,
                            streak: profile.streak || 0,
                            workouts_completed: profile.workouts_completed || 0,
                            certificate_uploaded: profile.certificate_uploaded || false,
                            certificate_filename: profile.certificate_filename || null,
                            certificate_expires_at: profile.certificate_expires_at || null
                        }
                    });
                    navigate("/");
                } else {
                    // Nuovo utente Google: vai alla pagina codice palestra
                    // Salva dati temporanei per GymCodeSetup
                    sessionStorage.setItem('google_auth_pending', JSON.stringify({
                        access_token: session.access_token,
                        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utente',
                        email: user.email,
                        avatar_url: user.user_metadata?.avatar_url || null,
                        user_id: user.id
                    }));
                    navigate("/gym-code");
                }
            } catch (err) {
                console.error("Unexpected auth callback error:", err);
                setStatus("Errore imprevisto. Reindirizzamento...");
                setTimeout(() => navigate("/login"), 2000);
            }
        };

        handleCallback();
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-background items-center justify-center px-6">
            {/* Logo */}
            <div className="relative w-20 h-20 flex items-center justify-center mb-8">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
                <span
                    className="relative z-10 material-symbols-outlined text-primary select-none"
                    style={{ fontSize: '48px', fontVariationSettings: "'FILL' 1, 'wght' 700" }}
                >
                    exercise
                </span>
            </div>

            {/* Spinner */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-slate-500 text-sm font-semibold">{status}</p>
            </div>
        </div>
    );
}
