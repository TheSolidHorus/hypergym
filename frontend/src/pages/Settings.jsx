import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";

export default function Settings() {
    const navigate = useNavigate();
    const { userProfile, setTrainingDays, resetStats, resetBadges, isDarkMode, toggleDarkMode, isHealthConnected, connectHealth, disconnectHealth } = useStore();
    const [days, setDays] = useState(userProfile.trainingDaysGoal);
    const [connectingHealth, setConnectingHealth] = useState(false);

    const handleHealthToggle = async () => {
        if (isHealthConnected) {
            if(confirm("Vuoi scollegare l'app Salute?")) disconnectHealth();
        } else {
            setConnectingHealth(true);
            const success = await connectHealth();
            setConnectingHealth(false);
            if (!success) alert("Impossibile connettere Apple Health / Google Fit. Controlla i permessi.");
        }
    };

    const handleSave = () => { setTrainingDays(days); alert("Impostazioni salvate!"); navigate("/profile"); };

    const handleReset = async () => {
        if (confirm("SEI SICURO? Questo cancellerà tutti i record, lo storico e lo streak. Non puoi annullare.")) {
            await resetStats(); alert("Dati azzerati. L'app verrà riavviata."); window.location.reload();
        }
    };

    const handleResetBadges = async () => {
        if (confirm("Vuoi davvero cancellare tutti i badge ottenuti? Non si può annullare.")) {
            await resetBadges(); alert("Badge eliminati. L'app verrà riavviata."); window.location.reload();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background text-slate-900 p-4">

            <div className="flex items-center gap-4 mb-8 pt-6">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight">Impostazioni</h1>
            </div>

            <div className="space-y-8">
                {userProfile?.role === 'client' && (
                    <div className="space-y-4">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-primary">Obiettivi</h2>
                        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between mb-4">
                                <span className="font-bold text-slate-900 text-sm">Giorni a settimana</span>
                                <span className="font-mono text-primary font-bold text-lg">{days}</span>
                            </div>
                            <input type="range" min="1" max="7" value={days}
                                onChange={async (e) => { const newDays = parseInt(e.target.value); setDays(newDays); await setTrainingDays(newDays); }}
                                className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-2">
                                <span>Relax</span><span>Beast Mode</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-slate-200">Aspetto</h2>
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">{isDarkMode ? 'dark_mode' : 'light_mode'}</span>
                            <span className="font-bold text-slate-900 text-sm">Tema Scuro</span>
                        </div>
                        <button onClick={toggleDarkMode}
                            className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${isDarkMode ? 'bg-primary' : 'bg-slate-200'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-slate-200">Dispositivi</h2>
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isHealthConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <span className="material-symbols-outlined">{isHealthConnected ? 'favorite' : 'watch'}</span>
                            </div>
                            <div>
                                <span className="font-bold text-slate-900 text-sm block leading-tight">Apple Health / Fit</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    {isHealthConnected ? 'Connesso' : 'Disconnesso'}
                                </span>
                            </div>
                        </div>
                        <button onClick={handleHealthToggle} disabled={connectingHealth}
                            className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${isHealthConnected ? 'bg-emerald-500' : 'bg-slate-200'} ${connectingHealth ? 'opacity-50' : ''}`}>
                            <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${isHealthConnected ? 'translate-x-6' : 'translate-x-0'} ${connectingHealth ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-slate-200">Privacy & Dati</h2>
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-slate-400">info</span>
                                <span className="text-sm font-bold text-slate-600">Versione App</span>
                            </div>
                            <span className="text-xs font-mono text-slate-400">v3.0.0</span>
                        </div>
                    </div>
                </div>

                {userProfile?.role === 'client' && (
                    <div className="pt-8 border-t border-slate-200 space-y-3">
                        <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4">Area Pericolosa</h2>
                        <button onClick={handleResetBadges}
                            className="w-full py-4 bg-orange-50 border border-orange-200 text-orange-500 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-orange-100 transition-colors">
                            <span className="material-symbols-outlined text-lg">shield</span> Azzera Badge
                        </button>
                        <button onClick={handleReset}
                            className="w-full py-4 bg-red-50 border border-red-200 text-red-500 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                            <span className="material-symbols-outlined text-lg">delete_forever</span> Azzera Streak & Stats
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-auto pb-6">
                <button onClick={handleSave}
                    className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-lg">save</span> Salva Modifiche
                </button>
            </div>
        </div>
    );
}
