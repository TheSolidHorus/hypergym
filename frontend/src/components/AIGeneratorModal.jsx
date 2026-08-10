import { useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const GOALS = [
    { value: "ipertrofia", label: "💪 Ipertrofia", desc: "Crescita muscolare" },
    { value: "dimagrimento", label: "🔥 Dimagrimento", desc: "Perdita di grasso" },
    { value: "forza", label: "🏋️ Forza Pura", desc: "Massima intensità" },
    { value: "tonificazione", label: "✨ Tonificazione", desc: "Definizione fisica" },
    { value: "resistenza", label: "🏃 Resistenza", desc: "Cardio & endurance" },
];

const LEVELS = [
    { value: "principiante", label: "🌱 Principiante", desc: "0-6 mesi" },
    { value: "intermedio", label: "⚡ Intermedio", desc: "6-24 mesi" },
    { value: "avanzato", label: "🔥 Avanzato", desc: "2+ anni" },
];

const EQUIPMENT = [
    { value: "palestra", label: "🏋️ Palestra", desc: "Attrezzi completi" },
    { value: "casa", label: "🏠 Casa", desc: "Manubri & elastici" },
    { value: "minima", label: "🤸 Solo Corpo", desc: "Nessun attrezzo" },
];

export default function AIGeneratorModal({ onClose, onPlanGenerated }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        goal: "ipertrofia",
        days: 3,
        level: "intermedio",
        equipment: "palestra",
        injuries: "",
    });

    const handleGenerate = async () => {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            setError("Credenziali Supabase mancanti in ambiente.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-plan`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(form)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Errore Server (${res.status}): ${errText.substring(0, 200)}`);
            }

            const data = await res.json();
            
            if (data.error) {
                 throw new Error(data.error);
            }

            const plan = data.plan;

            if (!plan || !plan.workout_days || !Array.isArray(plan.workout_days)) {
                throw new Error("Piano AI malformato o risposta non valida.");
            }

            onPlanGenerated(plan);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

    return (
        <div
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-t-3xl w-full max-w-lg mx-auto flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl relative"
                style={{ maxHeight: "92vh" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full pointer-events-none" />

                {/* Header */}
                <div className="px-6 pt-10 pb-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-lg shadow-md bg-slate-900 border border-slate-700"
                        >
                            ✨
                        </div>
                        <div>
                            <h2 className="text-lg font-black italic uppercase text-slate-900 tracking-tighter">
                                Genera con AI
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Powered by Gemini
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Goal */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                            Obiettivo
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {GOALS.map((g) => (
                                <button
                                    key={g.value}
                                    onClick={() => set("goal", g.value)}
                                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${form.goal === g.value
                                        ? "border-white bg-card shadow-md ring-1 ring-white/20"
                                        : "border-border bg-card/60 hover:border-slate-500"
                                        }`}
                                >
                                    <span className="text-xl w-7 text-center">{g.label.split(" ")[0]}</span>
                                    <div>
                                        <p className={`text-sm font-black uppercase tracking-tight ${form.goal === g.value ? "text-foreground" : "text-slate-400"}`}>
                                            {g.label.split(" ").slice(1).join(" ")}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold">{g.desc}</p>
                                    </div>
                                    {form.goal === g.value && (
                                        <span className="material-symbols-outlined text-white ml-auto text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            check_circle
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Days */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex justify-between items-center">
                            <span>Giorni a settimana</span>
                            <span className="text-white font-black text-sm">{form.days} gg</span>
                        </label>
                        <input
                            type="range" min={2} max={6} step={1}
                            value={form.days}
                            onChange={(e) => set("days", parseInt(e.target.value))}
                            className="w-full accent-white h-2 bg-border rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1.5 uppercase">
                            <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
                        </div>
                    </div>

                    {/* Level */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                            Livello
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {LEVELS.map((l) => (
                                <button
                                    key={l.value}
                                    onClick={() => set("level", l.value)}
                                    className={`p-3 rounded-2xl border text-center transition-all ${form.level === l.value
                                        ? "border-white bg-card shadow-md ring-1 ring-white/20"
                                        : "border-border bg-card/60 hover:border-slate-500"
                                        }`}
                                >
                                    <span className="text-xl block mb-1">{l.label.split(" ")[0]}</span>
                                    <p className={`text-[10px] font-black uppercase ${form.level === l.value ? "text-foreground" : "text-slate-400"}`}>
                                        {l.label.split(" ").slice(1).join(" ")}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{l.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Equipment */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                            Attrezzatura disponibile
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {EQUIPMENT.map((eq) => (
                                <button
                                    key={eq.value}
                                    onClick={() => set("equipment", eq.value)}
                                    className={`p-3 rounded-2xl border text-center transition-all ${form.equipment === eq.value
                                        ? "border-white bg-card shadow-md ring-1 ring-white/20"
                                        : "border-border bg-card/60 hover:border-slate-500"
                                        }`}
                                >
                                    <span className="text-xl block mb-1">{eq.label.split(" ")[0]}</span>
                                    <p className={`text-[10px] font-black uppercase ${form.equipment === eq.value ? "text-foreground" : "text-slate-400"}`}>
                                        {eq.label.split(" ").slice(1).join(" ")}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{eq.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Injuries */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
                            Limitazioni / Infortuni (opzionale)
                        </label>
                        <textarea
                            value={form.injuries}
                            onChange={(e) => set("injuries", e.target.value)}
                            placeholder="Es. Dolore al ginocchio sinistro, spalla sinistra..."
                            rows={2}
                            className="w-full bg-card border border-border rounded-2xl p-4 text-sm text-foreground placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white transition-all resize-none"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-950/40 border border-red-800/50 text-red-300 rounded-2xl p-4 text-sm font-bold flex items-start gap-2">
                            <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">error</span>
                            <div>
                                <p className="font-black text-xs uppercase mb-1">Errore</p>
                                <p className="font-medium text-xs">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer CTA */}
                <div className="px-6 py-5 border-t border-border flex-shrink-0">
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-black bg-white hover:bg-slate-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-white/10"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                Generazione in corso...
                            </>
                        ) : (
                            <>
                                <span className="text-lg">✨</span>
                                Genera Scheda
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-bold mt-3 uppercase tracking-wide">
                        La scheda verrà caricata nell&apos;editor per la revisione
                    </p>
                </div>
            </div>
        </div>
    );
}
