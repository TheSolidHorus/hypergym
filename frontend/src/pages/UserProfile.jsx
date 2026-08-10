import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useStore } from "../lib/store";

export default function UserProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { userProfile: myProfile } = useStore(); // Current user (Admin/Trainer)
    const [profile, setProfile] = useState(null);
    const [badges, setBadges] = useState([]);
    const [userPlans, setUserPlans] = useState([]); // Plans allocated to this user
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        // 1. Fetch Profile Data
        const { data: userData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !userData) {
            alert("Utente non trovato");
            navigate(-1);
            return;
        }
        setProfile(userData);

        // 2. Fetch Badges
        const { data: userBadges } = await supabase
            .from('achievements')
            .select('*')
            .eq('user_id', userId)
            .order('weight_achieved', { ascending: false });
        setBadges(userBadges || []);

        // 3. Fetch Follow Status
        if (user && user.id !== userId) {
            const { data: followData } = await supabase
                .from('follows')
                .select('*')
                .eq('follower_id', user.id)
                .eq('following_id', userId)
                .single();
            setIsFollowing(!!followData);
        }

        // 4. Fetch User Plans (Visible to Admin/Trainer)
        const { data: plansData } = await supabase
            .from('workout_plans')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        setUserPlans(plansData || []);

        setLoading(false);
    };

    const handleFollow = async () => {
        if (!currentUserId) return;

        if (isFollowing) {
            // Unfollow
            await supabase
                .from('follows')
                .delete()
                .eq('follower_id', currentUserId)
                .eq('following_id', userId);
            setIsFollowing(false);
        } else {
            // Follow
            await supabase
                .from('follows')
                .insert({
                    follower_id: currentUserId,
                    following_id: userId
                });
            setIsFollowing(true);

            // Notify
            await supabase.from('notifications').insert({
                user_id: userId,
                sender_id: currentUserId,
                type: 'message', // Generic type if 'follow' not in enum check
                message: 'Ha iniziato a seguirti!'
            });
        }
    };

    const handleDeletePlan = async (planId, planName) => {
        if (!confirm(`Sei sicuro di voler eliminare la scheda "${planName}" di questo utente?`)) return;

        const { error } = await supabase
            .from('workout_plans')
            .delete()
            .eq('id', planId);

        if (error) {
            alert("Errore eliminazione: " + error.message);
        } else {
            setUserPlans(prev => prev.filter(p => p.id !== planId));
            alert("Scheda eliminata correttamente.");
        }
    };

    const getBadgeEmoji = (level) => {
        switch (level) {
            case 'bronze': return '🥉';
            case 'silver': return '🥈';
            case 'gold': return '🥇';
            case 'platinum': return '💎';
            default: return '🏅';
        }
    };

    const getBadgeName = (type) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    if (loading) return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-black uppercase tracking-widest text-foreground text-sm tracking-widest">Caricamento Profilo...</p>
        </div>
    );

    const isMe = currentUserId === userId;

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pt-4">
                <button
                    onClick={() => {
                        if (window.history.length > 2) {
                            navigate(-1);
                        } else {
                            if (myProfile?.role === 'admin') navigate('/admin');
                            else if (myProfile?.role === 'trainer' || myProfile?.role === 'coach') navigate('/coach');
                            else navigate('/');
                        }
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div className="flex-1 pr-14 text-center">
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Profilo Atleta</h1>
                </div>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center mb-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-[120px]">fitness_center</span>
                </div>

                <div className="w-32 h-32 rounded-3xl bg-slate-100 border-[6px] border-white shadow-xl flex items-center justify-center mb-6 overflow-hidden relative z-10 transition-transform hover:scale-105 duration-300">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-5xl font-black text-slate-400 uppercase italic">
                            {profile.name?.[0] || '?'}
                        </span>
                    )}
                    {/* Level Indicator (Fake based on stats) */}
                    <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl shadow-md border-2 border-white">
                        LVL {Math.floor((profile.workouts_completed || 0) / 10) + 1}
                    </div>
                </div>

                <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-1 relative z-10">{profile.name}</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest relative z-10 flex items-center gap-1 mt-1 mb-4">
                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                    Membro dal {new Date(profile.created_at).toLocaleDateString('it-IT')}
                </p>

                {!isMe && (
                    <button
                        onClick={handleFollow}
                        className={`relative z-10 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isFollowing ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-orange-600 active:scale-95'}`}
                    >
                        {isFollowing ? 'Seguito ✓' : 'Segui Atleta +'}
                    </button>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-[64px]">trophy</span>
                    </div>
                    <span className="material-symbols-outlined text-amber-500 text-[28px] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
                    <p className="text-3xl font-black italic tracking-tighter text-slate-900 mb-1">{badges.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Badge</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-5 text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-[64px]">fitness_center</span>
                    </div>
                    <span className="material-symbols-outlined text-primary text-[28px] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                    <p className="text-3xl font-black italic tracking-tighter text-slate-900 mb-1">{profile.workouts_completed || 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Workout</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-5 text-center shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-[64px]">local_fire_department</span>
                    </div>
                    <span className="material-symbols-outlined text-orange-500 text-[28px] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    <p className="text-3xl font-black italic tracking-tighter text-slate-900 mb-1">{profile.streak || 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Streak</p>
                </div>
            </div>

            {/* Coach Actions: Assign Plan */}
            {myProfile?.role === 'trainer' && !isMe && (
                <div className="mb-8 animate-in slide-in-from-bottom-4">
                    <button
                        onClick={() => navigate(`/plans/new?userId=${userId}`)}
                        className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-3xl flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-xl shadow-primary/20 active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span> Assegna Nuova Scheda
                    </button>
                </div>
            )}

            {/* Admin/Coach Plans Management Section */}
            {(userPlans.length > 0 && (isMe || myProfile?.role === 'admin' || myProfile?.role === 'trainer')) && (
                <div className="mb-10 animate-in slide-in-from-bottom-6 duration-500">
                    <div className="flex justify-between items-end mb-5 ml-2">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[28px]">description</span> Schede Attive
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-[36px]">{userPlans.length} Piani di Allenamento</span>
                            </h3>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {userPlans.map(plan => (
                            <div key={plan.id} className="bg-white border border-slate-200 p-5 rounded-3xl flex items-center justify-between shadow-sm group hover:border-slate-300 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-[24px]">assignment</span>
                                    </div>
                                    <div>
                                        <h4 className="font-black italic uppercase tracking-tight text-slate-900 text-lg">{plan.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                                            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">fitness_center</span> {plan.exercises?.length || 0} Ex</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">event</span> {plan.days || '3gg'}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">date_range</span> {plan.duration_weeks || 4} Set.</span>
                                        </p>
                                    </div>
                                </div>
                                {myProfile?.role === 'trainer' && (
                                    <button
                                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                                        className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 border border-red-100"
                                        title="Elimina Scheda Utente"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Badges Collection */}
            <div className="mb-5 ml-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span> Bacheca Trofei
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-[36px]">Traguardi raggiunti</p>
            </div>

            {badges.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed flex flex-col items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3 block">sentiment_dissatisfied</span>
                    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Nessun badge sbloccato ancora.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {badges.map(badge => (
                        <div key={badge.id} className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-col items-center text-center shadow-sm relative overflow-hidden group hover:border-amber-200 transition-colors">
                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10">
                                <span className="material-symbols-outlined text-[48px]">workspace_premium</span>
                            </div>
                            <div className="text-4xl filter drop-shadow-md mb-3 group-hover:scale-110 transition-transform">
                                {getBadgeEmoji(badge.level)}
                            </div>
                            <div>
                                <p className="font-black italic uppercase tracking-tighter text-slate-900 text-sm">
                                    {getBadgeName(badge.badge_type)}
                                </p>
                                <div className="inline-flex items-center justify-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 text-amber-700 mt-2 mb-2">
                                    <span className="material-symbols-outlined text-[10px]">fitness_center</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{badge.weight_achieved} kg</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                                    <span className="material-symbols-outlined text-[10px]">history</span>
                                    {new Date(badge.achieved_at).toLocaleDateString('it-IT')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
