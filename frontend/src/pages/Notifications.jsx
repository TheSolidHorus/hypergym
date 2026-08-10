import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";

export default function Notifications() {
    const navigate = useNavigate();
    const { notifications, fetchNotifications, markNotificationsRead, markNotificationRead } = useStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchNotifications().then(() => setLoading(false)); }, []);
    const handleMarkRead = async () => { await markNotificationsRead(); fetchNotifications(); };

    const handleNotificationClick = async (notif) => {
        markNotificationRead(notif.id);
        if (notif.data?.url) { navigate(notif.data.url); return; }
        if (notif.type === 'like' || notif.type === 'comment') navigate('/community');
        else if (notif.type === 'assign_plan' || notif.type === 'plan_assigned') navigate('/plans');
        else if (notif.type === 'message') navigate(notif.data?.sender_id ? `/chat/${notif.data.sender_id}` : '/chat');
    };

    const getIconFor = (type) => {
        switch (type) {
            case 'like': return { icon: 'favorite', bg: 'bg-red-50', color: 'text-red-500' };
            case 'assign_plan': case 'plan_assigned': return { icon: 'fitness_center', bg: 'bg-green-50', color: 'text-green-500' };
            case 'comment': case 'message': return { icon: 'chat', bg: 'bg-blue-50', color: 'text-blue-500' };
            case 'certificate': return { icon: 'description', bg: 'bg-orange-50', color: 'text-orange-500' };
            default: return { icon: 'notifications', bg: 'bg-slate-50', color: 'text-slate-500' };
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-slate-900 p-4">
            <div className="flex items-center justify-between mb-8 pt-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-primary"><span className="material-symbols-outlined">arrow_back</span></button>
                    <h1 className="text-2xl font-bold uppercase text-slate-900 tracking-tight">Notifiche</h1>
                </div>
                {notifications.length > 0 && (
                    <button onClick={handleMarkRead} className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1 hover:underline">
                        <span className="material-symbols-outlined text-sm">done_all</span> Leggi tutte
                    </button>
                )}
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">notifications</span>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nessuna nuova notifica</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notif) => {
                        const { icon, bg, color } = getIconFor(notif.type);
                        return (
                            <div key={notif.id} onClick={() => handleNotificationClick(notif)}
                                className="p-4 rounded-xl border border-slate-100 flex items-start gap-4 transition-all bg-white shadow-sm active:scale-[0.98] cursor-pointer hover:border-primary/20">
                                <div className={`mt-1 p-2 rounded-full ${bg} ${color}`}>
                                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-800">
                                        {notif.message || notif.title || (
                                            notif.type === 'like' ? "Qualcuno ha messo Mi Piace!" :
                                            notif.type === 'assign_plan' ? "Nuova scheda assegnata!" :
                                            notif.type === 'comment' ? "Nuovo commento." : "Nuova notifica."
                                        )}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1 font-mono">{new Date(notif.created_at).toLocaleString()}</p>
                                </div>
                                {!notif.read && <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
