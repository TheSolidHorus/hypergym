import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useStore } from "../lib/store";
import ChallengeModal from "./ChallengeModal";

export default function ChallengesTab() {
    const { userProfile } = useStore();
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [participations, setParticipations] = useState({}); // challenge_id -> boolean
    const [myUserId, setMyUserId] = useState(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setMyUserId(user.id);
            fetchChallenges(user?.id);
        };
        init();
    }, []);

    const fetchChallenges = async (userId) => {
        setLoading(true);
        try {
            // Fetch challenges
            const { data, error } = await supabase
                .from('community_challenges')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setChallenges(data);
                
                // Fetch user participations
                if (userId) {
                    const { data: parts } = await supabase
                        .from('challenge_participants')
                        .select('challenge_id')
                        .eq('user_id', userId);
                    
                    if (parts) {
                        const map = {};
                        parts.forEach(p => map[p.challenge_id] = true);
                        setParticipations(map);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleJoin = async (challengeId) => {
        if (!myUserId) return;
        
        // Optimistic
        setParticipations(prev => ({ ...prev, [challengeId]: true }));
        
        try {
            const { error } = await supabase.from('challenge_participants').insert({
                challenge_id: challengeId,
                user_id: myUserId,
                progress: 0
            });
            if (error) {
                // Revert
                setParticipations(prev => ({ ...prev, [challengeId]: false }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (challengeId) => {
        if (!confirm("Sei sicuro di voler eliminare questa sfida? I progressi degli atleti andranno persi.")) return;
        
        try {
            const { error } = await supabase.from('community_challenges').delete().eq('id', challengeId);
            if (error) throw error;
            setChallenges(prev => prev.filter(c => c.id !== challengeId));
        } catch (error) {
            console.error(error);
            alert("Errore durante l'eliminazione della sfida");
        }
    };

    const formatMetric = (metric, value) => {
        switch(metric) {
            case 'volume': return `${value.toLocaleString('it-IT')} kg`;
            case 'workouts': return `${value} sessioni`;
            case 'pr': return `${value} kg`;
            default: return value;
        }
    };

    const getDaysLeft = (endDate) => {
        const diff = new Date(endDate).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        if (days < 0) return 'Scaduta';
        if (days === 0) return 'Scade oggi';
        return `${days} giorni rimanenti`;
    };

    return (
        <div className="space-y-4 pb-8">
            <div className="flex justify-between items-center mb-6 px-1">
                <div>
                    <h2 className="text-xl font-black italic uppercase text-slate-900 drop-shadow-sm tracking-tighter">Sfide Attive</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mettiti alla prova ed entra in classifica</p>
                </div>
                {userProfile?.role === 'admin' && (
                    <button onClick={() => setShowCreateModal(true)}
                        className="bg-primary text-white p-2 rounded-xl shadow-md shadow-primary/20 hover:scale-105 transition-transform flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                    </button>
                )}
            </div>

            {loading ? (
                 <div className="text-center py-10">
                 <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
             </div>
            ) : challenges.length === 0 ? (
                <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 shadow-sm">
                    <span className="material-symbols-outlined text-4xl mb-3 text-slate-300">verified</span>
                    <p className="font-bold text-sm uppercase text-slate-500">Nessuna sfida attiva</p>
                    <p className="text-[10px] mt-2 tracking-widest font-bold uppercase">Torna più tardi</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {challenges.map(c => {
                        const isJoined = participations[c.id];
                        const daysLeft = getDaysLeft(c.end_date);
                        const isExpired = daysLeft === 'Scaduta';

                        return (
                            <div key={c.id} className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
                                {/* Decorazione */}
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                                
                                <div className="flex justify-between items-start mb-3 relative">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                            <h3 className="text-lg font-black uppercase text-slate-900 tracking-tighter leading-tight">{c.title}</h3>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">{c.description}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end shrink-0 relative z-10">
                                        {userProfile?.role === 'admin' && (
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-slate-300 hover:text-red-500 transition-colors p-1 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-slate-100 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        )}
                                        <div className="bg-white border border-slate-100 shadow-sm rounded-lg px-2.5 py-1 text-center">
                                            <span className={`text-[10px] uppercase font-black tracking-wider block ${isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                                                {isExpired ? 'Chiusa' : 'Scadenza'}
                                            </span>
                                            <span className={`text-[10px] font-bold ${isExpired ? 'text-red-400' : 'text-slate-600'}`}>
                                                {isExpired ? new Date(c.end_date).toLocaleDateString() : daysLeft}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center justify-between shadow-inner mt-4 mb-4 relative relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined text-lg">flag</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Obiettivo Sfida</p>
                                            <p className="text-sm font-black text-slate-900 leading-tight">{formatMetric(c.target_metric, c.target_value)}</p>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleJoin(c.id)}
                                    disabled={isJoined || isExpired}
                                    className={`w-full py-3.5 rounded-xl font-black uppercase tracking-widest textxs flex items-center justify-center gap-2 transition-all relative z-10
                                        ${isJoined ? 'bg-green-50 text-green-600 border border-green-200' : 
                                          isExpired ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 
                                          'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95'}`}
                                >
                                    {isJoined ? (
                                        <><span className="material-symbols-outlined text-[18px]">check_circle</span> Iscritto (Agg. Auto)</>
                                    ) : isExpired ? (
                                        <><span className="material-symbols-outlined text-[18px]">lock</span> Sfida Terminata</>
                                    ) : (
                                        <><span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span> Partecipa alla sfida</>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <ChallengeModal 
                open={showCreateModal} 
                onClose={() => setShowCreateModal(false)} 
                onCreated={(newChallenge) => setChallenges([newChallenge, ...challenges])} 
            />
        </div>
    );
}
