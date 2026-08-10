import { saveAs } from 'file-saver';
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";

export default function Profile() {
    const navigate = useNavigate();
    const { userProfile, medicalCertificate, logout, updateProfile, badges, history } = useStore();
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(userProfile.name);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    const handleExport = () => {
        try {
            if (!history || history.length === 0) return alert("Nessun dato da esportare.");
            const headers = ["Data", "Workout", "Esercizio", "Set", "KG", "Reps"];
            const rows = [];
            history.forEach(w => {
                if (w.exercises) {
                    w.exercises.forEach(ex => {
                        if (ex.setsData) {
                            ex.setsData.forEach((s, idx) => {
                                if (s.done) {
                                    rows.push([new Date(w.completedAt || w.startedAt).toLocaleDateString(), w.name, ex.name, idx + 1, s.kg || 0, s.reps || 0].join(","));
                                }
                            });
                        }
                    });
                }
            });
            const csvContent = [headers.join(","), ...rows].join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
            saveAs(blob, `hypergym_history_export_${new Date().toISOString().split('T')[0]}.csv`);
        } catch (e) { console.error("Export error", e); alert("Errore durante l'export"); }
    };

    const handleSaveName = () => { if (!newName.trim()) return; updateProfile({ name: newName.trim() }); setIsEditingName(false); };
    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert("Seleziona un'immagine valida."); return; }
        if (file.size > 5 * 1024 * 1024) { alert("Immagine troppo grande (max 5MB)."); return; }
        setUploadingAvatar(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utente non autenticato");
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            await updateProfile({ avatar_url: publicUrl });
        } catch (error) { console.error("Avatar upload error:", error); alert("Errore caricamento foto profilo."); }
        finally { setUploadingAvatar(false); }
    };

    const handleLogout = () => {
        if (confirm("Davvero vuoi uscire? Potrai rifare login quando vuoi.")) { logout(); navigate("/login"); }
    };

    const isStaff = userProfile.role === 'admin' || userProfile.role === 'trainer';

    const menuItems = [
        { icon: 'settings', label: "Impostazioni Generali", to: "/settings" },
        { icon: 'shield', label: "Privacy & Sicurezza", to: "/privacy" },
        ...(!isStaff ? [
            { icon: 'description', label: "Certificato Medico", to: "/certificate", badge: !medicalCertificate.uploaded ? "!" : null },
            { icon: 'calendar_month', label: "Storico Allenamenti", to: "/history" },
            { icon: 'trending_up', label: "Progressione", to: "/progress" },
            { icon: 'emoji_events', label: "Badge & Traguardi", to: "/badges", badge: badges.length > 0 ? badges.length : null },
        ] : []),
    ];

    return (
        <div className="p-4 pt-12 pb-24 max-w-md mx-auto min-h-screen">

            {/* Header Profile */}
            <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-primary mb-4 relative overflow-hidden flex items-center justify-center shadow-lg shadow-primary/10 group cursor-pointer"
                    onClick={handleAvatarClick}>
                    {uploadingAvatar ? (
                        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (userProfile.avatar_url || userProfile.avatarUrl) ? (
                        <img src={userProfile.avatar_url || userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-3xl font-black text-primary">{userProfile.name?.substring(0, 2).toUpperCase() || "?"}</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 items-center justify-center hidden group-hover:flex">
                        <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
                    </div>
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

                {isEditingName ? (
                    <div className="flex items-center gap-2 mt-2">
                        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus
                            className="bg-white border border-primary rounded-lg px-4 py-2 text-xl font-bold text-slate-900 text-center focus:outline-none w-48 shadow-sm" />
                        <button onClick={handleSaveName} className="p-2 bg-primary text-white rounded-lg"><span className="material-symbols-outlined text-lg">check</span></button>
                        <button onClick={() => setIsEditingName(false)} className="p-2 bg-slate-100 text-slate-400 rounded-lg"><span className="material-symbols-outlined text-lg">close</span></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{userProfile.name || "Utente"}</h2>
                        <button onClick={() => setIsEditingName(true)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                    </div>
                )}
                {userProfile.email && <p className="text-xs text-slate-400 mt-1">{userProfile.email}</p>}
                <span className="text-xs font-bold bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-primary mt-2 uppercase tracking-wide">Pro Member</span>
            </div>

            {/* Stats Grid */}
            {!isStaff && (
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-white border border-slate-100 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="text-2xl font-black text-slate-900">{userProfile.workoutsCompleted}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Workout</span>
                    </div>
                    {userProfile.role !== 'trainer' && (
                        <div className="bg-white border border-slate-100 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                            <span className="text-2xl font-black text-slate-900">{userProfile.trainingDaysGoal}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Giorni/Sett</span>
                        </div>
                    )}
                </div>
            )}

            {/* Admin / Coach Section */}
            {(isStaff || userProfile.role === 'coach') && (
                <div className="space-y-2 mb-6">
                    <h3 className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gestione (Ruolo: {userProfile.role})</h3>
                    {userProfile.role === 'admin' && (
                        <button onClick={() => navigate('/admin')}
                            className="w-full bg-primary/5 border border-primary/20 hover:border-primary active:bg-primary/10 p-4 rounded-xl flex items-center justify-between transition-all group">
                            <div className="flex items-center gap-3 text-slate-700">
                                <span className="text-primary"><span className="material-symbols-outlined">shield</span></span>
                                <span className="text-sm font-bold">Dashboard Admin</span>
                            </div>
                            <span className="material-symbols-outlined text-primary text-lg">chevron_right</span>
                        </button>
                    )}
                    {(userProfile.role === 'trainer' || userProfile.role === 'coach') && (
                        <button onClick={() => navigate('/coach')}
                            className="w-full bg-primary/5 border border-primary/20 hover:border-primary p-4 rounded-xl flex items-center justify-between transition-all group">
                            <div className="flex items-center gap-3 text-slate-700">
                                <span className="text-primary">🏋️</span>
                                <span className="text-sm font-bold">Pannello Coach</span>
                            </div>
                            <span className="material-symbols-outlined text-primary text-lg">chevron_right</span>
                        </button>
                    )}
                </div>
            )}

            {/* Chat Coach */}
            {!isStaff && (
                <div onClick={() => navigate("/chat")}
                    className="w-full bg-white border border-slate-100 rounded-2xl p-4 mb-8 active:scale-[0.98] transition-all cursor-pointer group hover:border-primary/30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-2xl">chat</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">Supporto Coach</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Chat diretta</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">chevron_right</span>
                    </div>
                </div>
            )}

            {/* Stats & Data */}
            {!isStaff && (
                <div className="space-y-1 mb-6">
                    <h3 className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Statistiche & Dati</h3>
                    <button onClick={() => navigate('/analysis')} className="w-full bg-white border border-slate-100 hover:border-primary/30 p-4 rounded-xl flex items-center justify-between transition-all group shadow-sm">
                        <div className="flex items-center gap-3 text-slate-600 group-hover:text-slate-900">
                            <span className="text-blue-500 bg-blue-50 p-2 rounded-lg"><span className="material-symbols-outlined text-lg">pie_chart</span></span>
                            <span className="text-sm font-bold">Analisi Avanzata</span>
                        </div>
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary text-lg">chevron_right</span>
                    </button>
                    <button onClick={handleExport} className="w-full bg-white border border-slate-100 hover:border-primary/30 p-4 rounded-xl flex items-center justify-between transition-all group shadow-sm mt-2">
                        <div className="flex items-center gap-3 text-slate-600 group-hover:text-slate-900">
                            <span className="text-green-500 bg-green-50 p-2 rounded-lg"><span className="material-symbols-outlined text-lg">download</span></span>
                            <span className="text-sm font-bold">Esporta CSV</span>
                        </div>
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary text-lg">chevron_right</span>
                    </button>
                </div>
            )}

            {/* Menu Items */}
            <div className="space-y-1 mb-6">
                <h3 className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Account</h3>
                {menuItems.map((item, i) => (
                    <button key={i} onClick={() => navigate(item.to)}
                        className="w-full bg-white border border-slate-100 hover:border-primary/30 p-4 rounded-xl flex items-center justify-between transition-all group shadow-sm">
                        <div className="flex items-center gap-3 text-slate-600 group-hover:text-slate-900 transition-colors">
                            <span className="text-slate-400 group-hover:text-primary transition-colors relative">
                                <span className="material-symbols-outlined">{item.icon}</span>
                                {item.badge && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full text-[10px] font-bold flex items-center justify-center">{item.badge}</span>
                                )}
                            </span>
                            <span className="text-sm font-bold">{item.label}</span>
                        </div>
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-lg">chevron_right</span>
                    </button>
                ))}
            </div>

            {/* Logout */}
            <button onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 active:scale-[0.98] transition-all text-sm font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-lg">logout</span> Logout
            </button>

            <div className="mt-8 text-center">
                <p className="text-[10px] text-slate-400 font-mono">HYPERGYM v3.0.0</p>
            </div>
        </div>
    );
}
