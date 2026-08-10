import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { BADGE_THRESHOLDS } from "../lib/store";

export default function Badges() {
    const navigate = useNavigate();
    const { badges } = useStore();

    const badgeMap = {};
    badges.forEach(b => { if (!badgeMap[b.badge_type]) badgeMap[b.badge_type] = {}; badgeMap[b.badge_type][b.level] = b; });

    const allBadgeTypes = [
        { type: 'panca', label: 'Panca Piana', icon: '🏋️' },
        { type: 'squat', label: 'Squat', icon: '🦵' },
        { type: 'stacco', label: 'Stacco da Terra', icon: '💪' }
    ];

    const getLevelColor = (level) => {
        switch (level) {
            case 'bronze': return 'from-amber-600 to-amber-800';
            case 'silver': return 'from-slate-400 to-slate-600';
            case 'gold': return 'from-yellow-400 to-yellow-600';
            case 'platinum': return 'from-cyan-400 to-blue-500';
            default: return 'from-slate-100 to-slate-200';
        }
    };
    const getLevelName = (level) => ({ bronze: 'Bronzo', silver: 'Argento', gold: 'Oro', platinum: 'Platino' }[level] || level);

    return (
        <div className="flex flex-col min-h-screen bg-background text-slate-900 p-4 pb-24">

            <div className="flex items-center gap-4 mb-8 pt-6">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight">Badge</h1>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-8 text-center">
                <span className="material-symbols-outlined text-primary text-5xl mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                <h2 className="text-4xl font-black text-slate-900 mb-1">{badges.length}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Badge Sbloccati</p>
            </div>

            <div className="space-y-8">
                {allBadgeTypes.map(({ type, label, icon }) => (
                    <div key={type}>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="text-2xl">{icon}</span> {label}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {BADGE_THRESHOLDS[type].map((badge) => {
                                const unlocked = badgeMap[type]?.[badge.level];
                                return (
                                    <div key={badge.level}
                                        className={`relative rounded-2xl p-5 border-2 transition-all ${unlocked
                                            ? `bg-gradient-to-br ${getLevelColor(badge.level)} border-white/30 shadow-lg text-white`
                                            : 'bg-white border-slate-200 opacity-60'}`}>
                                        <div className={`text-5xl mb-3 text-center ${unlocked ? '' : 'grayscale opacity-30'}`}>{badge.emoji}</div>
                                        <h4 className={`text-sm font-bold uppercase text-center mb-1 ${unlocked ? 'text-white' : 'text-slate-400'}`}>{getLevelName(badge.level)}</h4>
                                        <p className={`text-xs font-bold text-center ${unlocked ? 'text-white/70' : 'text-slate-300'}`}>{badge.weight}kg+</p>
                                        {!unlocked && (
                                            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/50 backdrop-blur-[1px]">
                                                <span className="material-symbols-outlined text-slate-300 text-3xl">lock</span>
                                            </div>
                                        )}
                                        {unlocked && (
                                            <div className="mt-2 pt-2 border-t border-white/20">
                                                <p className={`text-[10px] font-mono text-white/50 text-center`}>
                                                {unlocked.achieved_at ? new Date(unlocked.achieved_at).toLocaleDateString('it-IT') : '—'}
                                            </p>
                                                <p className="text-xs font-bold text-white/70 text-center">{unlocked.weight_achieved}kg</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {badges.length === 0 && (
                <div className="mt-12 text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-400 font-bold text-sm mb-2">Nessun badge ancora</p>
                    <p className="text-slate-300 text-xs">Completa un allenamento per iniziare a sbloccarli!</p>
                </div>
            )}
        </div>
    );
}
