import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import FeedbackModal from "../components/FeedbackModal";

export default function Home() {
    const navigate = useNavigate();
    const { userProfile, plans, startWorkout, history, authToken, notifications, isHealthConnected, healthData } = useStore();
    const [currentUserId, setCurrentUserId] = useState(null);
    const unreadCount = notifications ? notifications.filter(n => !n.read).length : 0;
    const [isCertBannerVisible, setIsCertBannerVisible] = useState(!sessionStorage.getItem('cert-dismissed'));
    const [showFeedback, setShowFeedback] = useState(false);

    useEffect(() => {
        if (!authToken || !userProfile.email) {
            navigate("/login");
        }
        // Carica ID utente reale per FeedbackModal
        supabase.auth.getUser().then(({ data }) => { if (data?.user) setCurrentUserId(data.user.id); });
    }, [authToken, userProfile.email, navigate]);

    const suggestedPlan = plans[0];

    const handleStartSuggested = () => {
        if (suggestedPlan) {
            const isSplit = suggestedPlan.exercises?.length > 0 && suggestedPlan.exercises[0].exercises;
            if (isSplit) {
                navigate("/plans");
            } else {
                startWorkout(suggestedPlan.id);
                navigate("/workout/active");
            }
        } else {
            navigate("/plans/new");
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Buongiorno";
        if (hour < 18) return "Buon pomeriggio";
        return "Buonasera";
    };

    return (
        <div className="max-w-md mx-auto bg-background min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex items-center p-6 justify-between">
                <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full overflow-hidden border-2 border-primary/20 bg-primary/10 flex items-center justify-center">
                        {userProfile.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-bold text-primary text-lg">{userProfile.name?.substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{getGreeting()}</p>
                        <h2 className="text-xl font-bold leading-tight tracking-tight text-slate-900">
                            CIAO, {userProfile.name?.split(' ')[0]?.toUpperCase()}
                        </h2>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFeedback(true)}
                        className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">chat_bubble</span>
                    </button>
                    <button
                        onClick={() => navigate('/notifications')}
                        className="relative flex size-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] flex items-center justify-center text-white font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Certificate Banner */}
            {!userProfile.certificate_uploaded && isCertBannerVisible && userProfile.role !== 'admin' && userProfile.role !== 'trainer' && (
                <div className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-xl"></div>
                    <span className="material-symbols-outlined text-amber-600 shrink-0 mt-0.5">warning</span>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-amber-700 mb-1">Certificato Mancante</h3>
                        <p className="text-xs text-amber-600 mb-2 leading-relaxed">
                            Ricordati di caricare il certificato medico per accedere alla palestra.
                        </p>
                        <button
                            onClick={() => navigate('/certificate')}
                            className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 hover:bg-amber-200 transition-colors"
                        >
                            Carica documento
                        </button>
                    </div>
                    <button
                        onClick={() => { sessionStorage.setItem('cert-dismissed', 'true'); setIsCertBannerVisible(false); }}
                        className="text-amber-400 hover:text-amber-600 p-1 -mt-1 -mr-1"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 px-6 pb-24">

                {/* Admin/Coach CTA Card */}
                {(userProfile.role === 'admin' || userProfile.role === 'trainer') ? (
                    <section className="mb-8">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">Pannello di Gestione</h3>
                        <div
                            onClick={() => navigate(userProfile.role === 'admin' ? '/admin' : '/coach')}
                            className="relative overflow-hidden rounded-xl bg-slate-900 aspect-[16/10] group cursor-pointer active:scale-[0.98] transition-transform"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-1">
                                <span className="text-primary font-bold text-xs uppercase tracking-widest">Gestione</span>
                                <h4 className="text-white text-2xl font-bold mb-4">
                                    {userProfile.role === 'admin' ? 'PANNELLO ADMIN' : 'PANNELLO COACH'}
                                </h4>
                                <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <span>Entra</span>
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </section>
                ) : (
                    <>
                        {/* Today's Workout Card */}
                        <section className="mb-8">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">Allenamento di Oggi</h3>
                            <div
                                onClick={handleStartSuggested}
                                className="relative overflow-hidden rounded-xl bg-slate-900 aspect-[16/10] group cursor-pointer active:scale-[0.98] transition-transform"
                            >
                                <img
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2JTCFyDyZ01UdkAfsqSDUIeVi5GJP_ZJn4MJ_ichL2C6jIAMevLTVazuD-2rIwwPkf2vARZoVKTzWnmCeirPrtlvZQ3VLAAQxotVRbls9myCNtsM7Ud0GMJAHJXrK2dRex5GbHWuo33QPrso9F-FcI1_jILhGVu28cL210TP0o-EsMr_GnIPD018zFQjlVrLX6HJW64eVmxqg94Bk4EOT42uC-02wFFd1V-LXdhNVoWOVCFkhAYAFZ09PalYa0_YyD_OkTsJA4fs"
                                    alt="Workout"
                                    className="absolute inset-0 w-full h-full object-cover opacity-60 blur-[1px]"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-1">
                                    <span className="text-primary font-bold text-xs uppercase tracking-widest">
                                        {suggestedPlan ? 'Power Session' : 'Inizia'}
                                    </span>
                                    <h4 className="text-white text-2xl font-bold mb-4">
                                        {suggestedPlan ? suggestedPlan.name.toUpperCase() : 'CREA LA TUA SCHEDA'}
                                    </h4>
                                    <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <span>Inizia</span>
                                        <span className="material-symbols-outlined text-sm">play_arrow</span>
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Health Widget */}
                        {isHealthConnected && healthData && (
                            <section className="mb-8 animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-500 text-lg">favorite</span> Salute e Recupero
                                </h3>
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-3xl p-6 shadow-lg shadow-emerald-500/20 text-white flex flex-col gap-5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4">
                                        <span className="material-symbols-outlined text-9xl">watch</span>
                                    </div>
                                    <div className="flex justify-between items-end relative z-10">
                                        <div>
                                            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-1">Stato Fisico</p>
                                            <h4 className="text-4xl font-black italic tracking-tighter">
                                                {healthData.recoveryScore}%
                                            </h4>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-1">Qualità Sonno</p>
                                            <h4 className="text-2xl font-bold tracking-tight">
                                                {healthData.sleepHours}h
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-emerald-900/30 rounded-full overflow-hidden relative z-10">
                                        <div className={`h-full rounded-full ${healthData.recoveryScore > 80 ? 'bg-white' : healthData.recoveryScore > 50 ? 'bg-amber-300' : 'bg-red-400'}`} style={{ width: `${healthData.recoveryScore}%` }} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 relative z-10 pt-2 border-t border-emerald-400/30">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-200">local_fire_department</span>
                                            <div>
                                                <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wide">Attive</p>
                                                <p className="font-bold">{healthData.calories} kcal</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-200">directions_walk</span>
                                            <div>
                                                <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wide">Passi</p>
                                                <p className="font-bold">{(healthData.steps / 1000).toFixed(1)}k</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Battle Pass Widget */}
                        <section className="mb-8">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-300 text-lg">trophy</span> HYPER Engage
                            </h3>
                            <div 
                                onClick={() => navigate('/battlepass')}
                                className="bg-gradient-to-br from-violet-600 to-indigo-750 rounded-3xl p-5 shadow-lg shadow-violet-500/20 text-white flex justify-between items-center relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-symbols-outlined text-9xl">military_tech</span>
                                </div>
                                <div className="flex-1 relative z-10">
                                    <p className="text-violet-100 text-[10px] font-black uppercase tracking-widest mb-1">Stagione Attiva</p>
                                    <h4 className="text-xl font-black italic uppercase tracking-tight text-white mb-2 leading-tight">SUMMER SHRED 2026</h4>
                                    <div className="flex items-center gap-1.5 text-xs text-violet-200">
                                        <span className="material-symbols-outlined text-[16px] text-amber-300" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                                        Livello Pass: <strong>Attivo</strong>
                                    </div>
                                </div>
                                <div className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shrink-0 text-white flex items-center gap-1 relative z-10">
                                    <span>Apri</span>
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </div>
                            </div>
                        </section>

                        {/* Progress Grid */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900">I Tuoi Progressi</h3>
                                <button onClick={() => navigate('/progress')} className="text-primary text-sm font-semibold">Vedi tutto</button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Workouts Card */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                    <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-blue-500">monitoring</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold tracking-tight text-slate-900">{userProfile.workoutsCompleted}</p>
                                        <p className="text-slate-500 text-sm">Workout Totali</p>
                                    </div>
                                </div>

                                {/* Streak Card */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                    <div className="size-10 rounded-lg bg-orange-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary">flare</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold tracking-tight text-slate-900">{userProfile.streak || 0} Giorni</p>
                                        <p className="text-slate-500 text-sm">Streak</p>
                                    </div>
                                </div>

                                {/* Active Plans Card */}
                                <div className="col-span-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                                    <div className="size-12 rounded-lg bg-green-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-green-500">schedule</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-2xl font-bold tracking-tight text-slate-900">{plans.length}</p>
                                        <p className="text-slate-500 text-sm">Schede Attive</p>
                                    </div>
                                    <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(plans.length * 25, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Recent History */}
                        <section className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900">Recenti</h3>
                                <button onClick={() => navigate('/history')} className="text-primary text-sm font-semibold">Vedi tutti</button>
                            </div>
                            <div className="space-y-3">
                                {history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 px-6 bg-white/40 rounded-xl border-2 border-dashed border-primary/20">
                                        <div className="w-16 h-16 mb-4 bg-primary/5 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary/40 text-3xl">inbox</span>
                                        </div>
                                        <p className="text-slate-600 font-medium">Nessun allenamento</p>
                                        <p className="text-slate-400 text-xs mt-1 text-center">Completa il tuo primo workout per vederlo qui.</p>
                                    </div>
                                ) : (
                                    history.slice(0, 3).map((session, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                    {session.name}
                                                    {session.feeling === 'facile' && <span>🟢</span>}
                                                    {session.feeling === 'giusto' && <span>🟡</span>}
                                                    {session.feeling === 'estremo' && <span>🔴</span>}
                                                </h4>
                                                <p className="text-xs text-slate-400">{new Date(session.startedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </>
                )}
            </main>

            {/* Floating Chat */}
            <button
                onClick={() => navigate('/chat')}
                className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center"
            >
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
            </button>

            {/* Feedback Modal */}
            {showFeedback && (
                <FeedbackModal
                    onClose={() => setShowFeedback(false)}
                    userId={currentUserId}
                />
            )}
        </div>
    );
}
