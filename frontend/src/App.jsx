import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Plans from "./pages/Plans";
import PlanEditor from "./pages/PlanEditor";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import Analysis from "./pages/Analysis";
import Privacy from "./pages/Privacy";
import Certificate from "./pages/Certificate";
import History from "./pages/History";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import WorkoutSession from "./pages/WorkoutSession";
import Badges from "./pages/Badges";
import Progress from "./pages/Progress";
import Community from "./pages/Community";
import BattlePass from "./pages/BattlePass";
import AdminDashboard from "./pages/AdminDashboard";
import CoachDashboard from "./pages/CoachDashboard";
import Notifications from "./pages/Notifications";
import Chat from "./pages/Chat";
import BadgeUnlockedModal from "./components/BadgeUnlockedModal";
import SplashScreen from "./components/SplashScreen";
import BroadcastPopup from "./components/BroadcastPopup";
import VerifyEmail from "./pages/VerifyEmail";
import AuthGuard from "./components/AuthGuard";
import ErrorBoundary from "./components/ErrorBoundary";
import InstallPrompt from "./components/InstallPrompt";
import AuthCallback from "./pages/AuthCallback";
import GymCodeSetup from "./pages/GymCodeSetup";
import { useStore } from "./lib/store";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
    const [showSplash, setShowSplash] = useState(true);
    const { fetchUserData, fetchNotifications, isDarkMode } = useStore();

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    useEffect(() => {
        // Force Sync Data on Load
        fetchUserData();
        
        // Sync hardware health (se autorizzato in precedenza)
        useStore.getState().syncHealthData();

        // 🕒 Controlla scadenze schede (Lazy Job)
        setTimeout(async () => {
            const { error } = await supabase.rpc('check_plan_expirations');
            if (error) console.warn("Check expirations warning", error);
        }, 3000);


        // 🔔 NOTIFICATION SOUND LISTENER
        const setupSound = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            // ... rest of setupSound

            const channel = supabase.channel('realtime_notifications')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                    (payload) => {
                        try {
                            // Cerca il file 'notification.mp3' nella cartella public/
                            const audio = new Audio('/notification.mp3');
                            audio.volume = 0.5;
                            audio.play().catch(e => console.log("Audio play blocked", e));
                        } catch (e) { console.error("Audio error", e); }

                        // Aggiorna UI istantaneamente
                        fetchNotifications();
                        // Se è una richiesta, aggiorna anche UserData per il badge
                        if (payload.new.type === 'request' || payload.new.type === 'message' || payload.new.type === 'plan_assigned') {
                            fetchUserData();
                        }
                    }
                )
                .subscribe();

            return () => supabase.removeChannel(channel);
        };

        setupSound();
    }, []);

    if (showSplash) {
        return <SplashScreen onFinish={() => setShowSplash(false)} />;
    }

    return (
        <BrowserRouter>
            {/* Broadcast Popup - Comunicazioni Admin */}
            <BroadcastPopup />
            {/* Global Badge Unlock Modal */}
            <BadgeUnlockedModal />

            <AuthGuard>
                {/* Install Prompt for PWA */}
            <InstallPrompt />

            <Routes>
                    {/* Auth */}
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    {/* Google OAuth callback — DEVE essere fuori dall'AuthGuard */}
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/gym-code" element={<GymCodeSetup />} />

                    {/* Main Application with Bottom Bar */}
                    <Route element={<Layout />}>
                        <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
                        <Route path="/plans" element={<ErrorBoundary><Plans /></ErrorBoundary>} />
                        <Route path="/community" element={<ErrorBoundary><Community /></ErrorBoundary>} />
                        <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
                        <Route path="/profile/:userId" element={<ErrorBoundary><UserProfile /></ErrorBoundary>} />
                        <Route path="/history" element={<ErrorBoundary><History /></ErrorBoundary>} />
                    </Route>


                    {/* Fullscreen Modes */}
                    <Route path="/plans/new" element={<ErrorBoundary><PlanEditor /></ErrorBoundary>} />
                    <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/certificate" element={<ErrorBoundary><Certificate /></ErrorBoundary>} />
                    <Route path="/badges" element={<ErrorBoundary><Badges /></ErrorBoundary>} />
                    <Route path="/analysis" element={<ErrorBoundary><Analysis /></ErrorBoundary>} />
                    <Route path="/progress" element={<ErrorBoundary><Progress /></ErrorBoundary>} />
                    <Route path="/progress/:exerciseName" element={<ErrorBoundary><Progress /></ErrorBoundary>} />
                    <Route path="/battlepass" element={<ErrorBoundary><BattlePass /></ErrorBoundary>} />
                    <Route path="/admin" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
                    <Route path="/coach" element={<ErrorBoundary><CoachDashboard /></ErrorBoundary>} />
                    <Route path="/notifications" element={<ErrorBoundary><Notifications /></ErrorBoundary>} />
                    <Route path="/workout/active" element={<ErrorBoundary><WorkoutSession /></ErrorBoundary>} />
                    <Route path="/chat" element={<ErrorBoundary><Chat /></ErrorBoundary>} />
                    <Route path="/chat/:contactId" element={<ErrorBoundary><Chat /></ErrorBoundary>} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthGuard>
        </BrowserRouter>
    );
}
