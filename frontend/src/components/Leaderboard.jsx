import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Leaderboard() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { fetchLeaderboard(); }, []);

    const fetchLeaderboard = async () => {
        const { data, error } = await supabase.from('profiles').select('id, name, badges_count, avatar_url').order('badges_count', { ascending: false }).limit(50);
        if (!error && data) setLeaders(data);
        setLoading(false);
    };

    if (loading) return <div className="text-center py-12 text-slate-400 uppercase font-bold text-xs"><span className="animate-pulse block mb-2 material-symbols-outlined text-4xl">hourglass_empty</span> Caricamento classifica...</div>;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-500 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                <h2 className="text-xl font-black text-amber-900 uppercase tracking-tight">Top Badges</h2>
            </div>

            <div className="divide-y divide-slate-100">
                {leaders.map((user, index) => (
                    <div key={user.id} onClick={() => navigate(`/profile/${user.id}`)}
                        className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer active:bg-slate-100 group">
                        
                        {/* Rank */}
                        <div className={`w-10 h-10 flex items-center justify-center font-black italic text-lg rounded-full shrink-0 border-2
                            ${index === 0 ? 'bg-amber-100 border-amber-400 text-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.3)]' :
                            index === 1 ? 'bg-slate-100 border-slate-300 text-slate-600' :
                            index === 2 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-transparent border-slate-200 text-slate-400'}`}>
                            {index + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0 border border-slate-200 flex items-center justify-center overflow-hidden">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-slate-400 font-bold uppercase text-lg">{user.name?.substring(0, 1)}</span>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 overflow-hidden">
                            <h3 className="text-slate-900 font-bold truncate group-hover:text-primary transition-colors text-base">{user.name || "Atleta"}</h3>
                            <p className="text-xs text-amber-600 font-bold uppercase flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                                {user.badges_count || 0} Trofei
                            </p>
                        </div>

                        {/* Medal for Top 3 */}
                        {index < 3 && (
                            <span className={`material-symbols-outlined text-3xl shrink-0 drop-shadow-sm ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-400' : 'text-orange-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        )}
                    </div>
                ))}
                {leaders.length === 0 && (
                    <div className="p-12 text-center border-2 border-dashed border-slate-100 m-4 rounded-xl bg-slate-50">
                        <span className="material-symbols-outlined text-slate-300 text-4xl block mb-2">military_tech</span>
                        <p className="text-slate-500 font-bold uppercase text-xs">Nessun atleta in classifica. Sblocca il primo badge!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
