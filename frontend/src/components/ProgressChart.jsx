import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Componente grafico per mostrare progressione nel tempo
 */
export default function ProgressChart({ data, exerciseName, metric = 'weight' }) {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-64 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">monitoring</span>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nessun dato disponibile</p>
            </div>
        );
    }

    const isVolume = metric === 'volume';
    const dataKey = isVolume ? 'volume' : 'weight';
    const color = isVolume ? '#38bdf8' : '#ffffff'; // sky blue for volume, titanium white for weight
    const label = isVolume ? 'Volume (kg)' : 'Carico Max (kg)';

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 border-b border-border pb-1">
                        {payload[0].payload.date}
                    </p>
                    <p className="text-2xl font-black italic tracking-tighter" style={{ color: color }}>
                        {payload[0].value} {isVolume ? 'kg' : 'kg'}
                    </p>
                    {!isVolume && payload[0].payload.reps && (
                        <p className="text-xs text-slate-400 font-bold bg-background px-2 py-1 rounded-lg mt-2 inline-block shadow-inner">
                            {payload[0].payload.reps} reps
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h3 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">{exerciseName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                        {isVolume ? 'Volume Totale (Set × Reps × Kg)' : 'Record massimale sollevato'}
                    </p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isVolume ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-card text-foreground border border-border'}`}>
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isVolume ? 'analytics' : 'fitness_center'}
                    </span>
                </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 pt-6 shadow-inner">
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#94a3b8"
                            style={{ fontSize: '10px', fontWeight: 'bold' }}
                            tick={{ fill: '#94a3b8' }}
                            tickMargin={10}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            style={{ fontSize: '10px', fontWeight: 'bold' }}
                            tick={{ fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '3 3' }} />
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={4}
                            dot={{ fill: '#ffffff', stroke: color, strokeWidth: 3, r: 6 }}
                            activeDot={{ r: 8, fill: color, stroke: '#ffffff', strokeWidth: 3 }}
                            name={label}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white border text-center border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <p className="text-3xl font-black italic tracking-tighter" style={{ color: color }}>
                        {Math.max(...data.map(d => d[dataKey]))}
                    </p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Record</p>
                </div>
                <div className="bg-white border text-center border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <p className="text-3xl font-black text-slate-800 italic tracking-tighter">
                        {data.length}
                    </p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Sessioni</p>
                </div>
                <div className="bg-white border text-center border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <p className="text-3xl font-black text-slate-800 italic tracking-tighter flex justify-center items-center gap-1">
                        {data.length > 1
                            ? `${((data[data.length - 1][dataKey] - data[0][dataKey]) / data[0][dataKey] * 100).toFixed(1)}%`
                            : '0%'}
                        {data.length > 1 && ((data[data.length - 1][dataKey] - data[0][dataKey]) > 0) && (
                            <span className="material-symbols-outlined text-green-500 text-2xl font-bold">arrow_upward</span>
                        )}
                    </p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Crescita</p>
                </div>
            </div>
        </div>
    );
}
