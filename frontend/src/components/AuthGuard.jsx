import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";

export default function AuthGuard({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { userProfile } = useStore();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            // Pagine pubbliche: nessun controllo necessario
            const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/auth/callback', '/gym-code', '/privacy'];
            if (publicPaths.includes(location.pathname)) {
                setChecking(false);
                return;
            }

            // ✅ FIX SEC-2: Verifica la sessione reale su Supabase, non solo il token locale
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/login');
                setChecking(false);
                return;
            }

            // Controllo email verificata — salta per utenti OAuth (Google ecc.)
            const isOAuthUser = session.user?.app_metadata?.provider !== 'email';
            if (!isOAuthUser && userProfile.emailVerified === false) {
                navigate('/verify-email');
            }

            setChecking(false);
        };

        checkAuth();
    }, [location.pathname, navigate, userProfile.emailVerified]);

    // Mostra schermo pulito durante il check (previene flash di contenuto)
    if (checking) return (
        <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
            <div className="w-8 h-8 rounded-full animate-spin border-[3px] border-slate-700" style={{ borderTopColor: '#ffffff' }} />
        </div>
    );

    return children;
}
