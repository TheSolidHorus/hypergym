import { useMemo } from 'react';
import { useStore } from "../lib/store";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function Analysis() {
    const navigate = useNavigate();
    const { history } = useStore();

    // 1. Muscle Group Distribution Logic
    const muscleData = useMemo(() => {
        const counts = { 'Petto': 0, 'Schiena': 0, 'Gambe': 0, 'Spalle': 0, 'Braccia': 0, 'Addome': 0, 'Altro': 0 };

        const detectMuscle = (name) => {
            const n = name.toLowerCase();
            if (n.match(/panch|chest|pett|croci|push|spinte/)) return 'Petto';
            if (n.match(/squat|leg|affondi|polpacci|pressa|quad|femoral|stacco/)) return 'Gambe'; // Stacco spesso gambe/schiena, qui semplifico
            if (n.match(/lat|pull|remat|traz|dors|back/)) return 'Schiena';
            if (n.match(/curl|bicip|hammer|triceps|french|pushdown|arms/)) return 'Braccia';
            if (n.match(/shoulder|lento|alzate|deltoid|spalle|military/)) return 'Spalle';
            if (n.match(/abs|crunch|plank|addom/)) return 'Addome';
            return 'Altro'; // Cardio etc
        };

        history.forEach(session => {
            session.exercises?.forEach(ex => {
                const muscle = detectMuscle(ex.name);
                // Weight sets by "volume" (sets count) logic? Or just occurrence?
                // Let's count SETS done.
                const setsDone = ex.setsData?.filter(s => s.done).length || 0;
                counts[muscle] += setsDone;
            });
        });

        return Object.keys(counts)
            .filter(k => counts[k] > 0)
            .map(k => ({ name: k, value: counts[k] }));
    }, [history]);

    // 2. Weekly Volume Trend (Last 12 weeks)
    const volumeData = useMemo(() => {
        const weeks = {};

        history.forEach(session => {
            const date = new Date(session.completedAt || session.startedAt); // fallback
            // Get week number/year key
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
            const key = weekStart.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

            if (!weeks[key]) weeks[key] = 0;

            // Calc total volume
            const vol = session.exercises?.reduce((acc, ex) => {
                // TODO: Here it needs to be ex.setsData.reduce... wait:
                const exVol = ex.setsData?.filter(s => s.done).reduce((sAcc, s) => sAcc + (parseFloat(s.kg || 0) * parseFloat(s.reps || 0)), 0) || 0;
                return acc + exVol;
            }, 0) || 0;

            weeks[key] += vol;
        });

        // Convert to array and take last 8 entries
        return Object.entries(weeks)
            .map(([name, volume]) => ({ name, volume: Math.round(volume) })) // in kg
            .slice(-8);
    }, [history]);

    // Titanium stealth theme palette
    const COLORS = ['#ffffff', '#38bdf8', '#a78bfa', '#34d399', '#f43f5e', '#fbbf24', '#94a3b8'];

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pt-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center bg-card border border-border shadow-sm rounded-full text-slate-400 hover:text-foreground hover:bg-slate-800 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <h1 className="text-3xl font-black uppercase tracking-tight">Analisi Dati</h1>
            </div>

            <div className="space-y-6">

                {/* 1. Muscle Split Pie Chart */}
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border shadow-inner">
                            <span className="material-symbols-outlined text-foreground text-[20px]">donut_small</span>
                        </div>
                        <div>
                            <h2 className="font-black text-lg uppercase tracking-tight text-foreground leading-tight">Focus Muscolare</h2>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Basato sui set totali</p>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        {muscleData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={muscleData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {muscleData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,1)" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                                        itemStyle={{ color: '#0f172a', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' }}
                                    />
                                    <Legend
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">pie_chart</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Dati insufficienti</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Volume Trend Bar Chart */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-inner">
                            <span className="material-symbols-outlined text-blue-500 text-[20px]">bar_chart</span>
                        </div>
                        <div>
                            <h2 className="font-black text-lg uppercase italic tracking-tighter text-slate-900 leading-tight">Volume Settimanale</h2>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Trend in KG totali sollevati</p>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        {volumeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={volumeData}>
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} width={35} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ color: '#3b82f6', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic' }}
                                    />
                                    <Bar dataKey="volume" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">insert_chart</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Nessun dato recente</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tips */}
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <span className="material-symbols-outlined text-[80px] text-white">lightbulb</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                        <span className="material-symbols-outlined text-[20px] text-slate-300" style={{ fontVariationSettings: "'FILL' 1" }}>tips_and_updates</span>
                        <h3 className="font-black uppercase tracking-wider text-foreground text-lg">Hyper Tip</h3>
                    </div>
                    <p className="text-slate-300 font-medium text-sm leading-relaxed relative z-10">
                        Per bilanciare il fisico, cerca di allenare i gruppi muscolari opposti (es. Petto e Schiena) con volumi simili. Monitora questo grafico settimanale per capire dove spingere di più!
                    </p>
                </div>

            </div>
        </div>
    );
}
