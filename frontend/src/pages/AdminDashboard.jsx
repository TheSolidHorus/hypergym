import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";
import VideoManagementSection from "../components/VideoManagementSection";
import FeedbackModal from "../components/FeedbackModal";
import AIGeneratorModal from "../components/AIGeneratorModal";

// --- SUB-COMPONENTS ---

const BadgeManagerModal = ({ user, badges, onClose, onAdd, onRemove }) => {
    const [type, setType] = useState('panca');
    const [level, setLevel] = useState('bronze');

    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-slate-100 w-full max-w-md rounded-3xl p-6 relative animate-in zoom-in-95 shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full p-2 transition-all">
                    <span className="material-symbols-outlined text-lg block">close</span>
                </button>
                <h3 className="text-2xl font-black italic text-slate-900 mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span> BADGE ATLETA
                </h3>
                <p className="text-slate-500 mb-6 font-bold uppercase tracking-wider text-xs">{user.name}</p>

                {/* List */}
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {badges.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <span className="text-3xl drop-shadow-sm">{
                                b.level === 'bronze' ? '🥉' : b.level === 'silver' ? '🥈' : b.level === 'gold' ? '🥇' : '💎'
                            }</span>
                            <div className="flex-1 ml-3">
                                <p className="font-black text-slate-900 uppercase text-sm">{b.badge_type}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase">{b.level}</p>
                            </div>
                            <button onClick={() => onRemove(b.id)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                        </div>
                    ))}
                    {badges.length === 0 && <p className="text-slate-400 text-center text-xs font-bold uppercase py-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">Nessun badge assegnato.</p>}
                </div>

                {/* Add Form */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Assegna Nuovo</label>
                    <div className="flex gap-2">
                        <select value={type} onChange={e => setType(e.target.value)} className="flex-1 bg-white text-slate-900 text-sm font-bold rounded-xl p-3 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                            <option value="panca">Panca</option>
                            <option value="squat">Squat</option>
                            <option value="stacco">Stacco</option>
                        </select>
                        <select value={level} onChange={e => setLevel(e.target.value)} className="flex-1 bg-white text-slate-900 text-sm font-bold rounded-xl p-3 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                            <option value="bronze">Bronze 🥉</option>
                            <option value="silver">Silver 🥈</option>
                            <option value="gold">Gold 🥇</option>
                            <option value="platinum">Platinum 💎</option>
                        </select>
                    </div>
                    <button onClick={() => onAdd(type, level)} className="w-full py-3 bg-primary text-white mt-2 font-black uppercase rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">add</span> Assegna Badge
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminSidebar = ({ active, setActive, mobileOpen, setMobileOpen, onLogout, onFeedback }) => {
    const menuItems = [
        { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
        { id: 'clients', label: 'Utenti & Coach', icon: 'group' },
        { id: 'schede', label: 'Schede Assegnate', icon: 'article' },
        { id: 'templates', label: 'Archivio Schede', icon: 'fitness_center' },
        { id: 'esercizi', label: 'Archivio Esercizi', icon: 'exercise' },
        { id: 'comunicazioni', label: 'Comunicazioni', icon: 'campaign' },
        { id: 'videos', label: 'Video Esercizi', icon: 'videocam' },
        { id: 'feedback', label: 'Feedback Utenti', icon: 'rate_review' },
        { id: 'settings', label: 'Impostazioni', icon: 'settings' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 flex flex-col bg-white border-r border-slate-200 shadow-sm
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:static
            `}>
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner" style={{ background: 'linear-gradient(135deg, #ff6a00, #ffb000)' }}>
                        <span className="material-symbols-outlined text-white text-[20px]">security</span>
                    </div>
                    <div>
                        <span className="font-black italic text-xl text-slate-900 tracking-tighter block leading-none">ADMIN</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pannello</span>
                    </div>
                </div>

                <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { setActive(item.id); setMobileOpen(false); }}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm border
                                ${active === item.id
                                    ? 'bg-primary/5 text-primary border-primary/20 shadow-sm'
                                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-100'}
                            `}
                        >
                            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: active === item.id ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 space-y-1.5 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={onFeedback}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent text-slate-500 hover:bg-white hover:text-primary hover:border-slate-200 hover:shadow-sm transition-all font-bold text-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">feedback</span> Invia Feedback
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent text-slate-500 hover:bg-white hover:text-slate-900 hover:border-slate-200 hover:shadow-sm transition-all font-bold text-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        Torna all&apos;App
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all font-bold text-sm mt-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Disconnetti
                    </button>
                </div>
            </div>
        </>
    );
};

// --- MAIN PAGE ---

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { userProfile, authToken, logout, isDarkMode, toggleDarkMode } = useStore();
    const [activeTab, setActiveTab] = useState('overview');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    void loading;
    const [feedbackToast, setFeedbackToast] = useState(null);

    // Data State
    const [stats, setStats] = useState({ clients: 0, coaches: 0, videos: 0 });
    const [clients, setClients] = useState([]);
    const [allPlans, setAllPlans] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [feedbackList, setFeedbackList] = useState([]);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    // Video Management State
    const [exerciseVideos, setExerciseVideos] = useState([]);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [newVideoFile, setNewVideoFile] = useState(null);
    const [newVideoExerciseName, setNewVideoExerciseName] = useState('');

    // Exercise Library State
    const [exerciseLibrary, setExerciseLibrary] = useState([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [newExercise, setNewExercise] = useState({ name: '', muscle_group: 'petto', description: '' });
    const [newExerciseVideoFile, setNewExerciseVideoFile] = useState(null);
    const [savingExercise, setSavingExercise] = useState(false);
    const [exerciseVideoPreview, setExerciseVideoPreview] = useState(null);
    const [libraryFilter, setLibraryFilter] = useState('');

    // Badge Management
    const [selectedClientForBadges, setSelectedClientForBadges] = useState(null);
    const [clientBadges, setClientBadges] = useState([]);

    // Feedback Detail state
    const [selectedFeedback, setSelectedFeedback] = useState(null);

    // Certificate Viewer
    const [certPreview, setCertPreview] = useState(null);

    // AI Generator
    const [showAIModal, setShowAIModal] = useState(false);

    // Codice Palestra (Activation Code)
    const [gymId, setGymId] = useState(null);
    const [gymAccessCode, setGymAccessCode] = useState("");
    const [savingGymCode, setSavingGymCode] = useState(false);

    const fetchGymCode = async () => {
        const { data } = await supabase.from('gyms').select('id, access_code').limit(1).single();
        if (data) {
            setGymId(data.id);
            setGymAccessCode(data.access_code || "");
        }
    };

    const handleSaveGymCode = async () => {
        if (!gymAccessCode.trim()) return alert("Inserisci un codice valido");
        if (!gymId) return alert("Gym ID non caricato");
        setSavingGymCode(true);
        const { error } = await supabase.from('gyms').update({
            access_code: gymAccessCode.trim().toUpperCase()
        }).eq('id', gymId);
        setSavingGymCode(false);
        if (error) {
            console.error(error);
            alert("Errore durante il salvataggio del codice: " + error.message);
        } else {
            alert("Codice di sblocco salvato con successo!");
        }
    };

    // Comunicazioni (Broadcasts)
    const [broadcastList, setBroadcastList] = useState([]);
    const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
    const [broadcastForm, setBroadcastForm] = useState({
        title: '',
        message: '',
        type: 'annuncio',
        target: 'all',
        image_url: ''
    });
    const [broadcastImageFile, setBroadcastImageFile] = useState(null);
    const [sendingBroadcast, setSendingBroadcast] = useState(false);
    const [broadcastStats, setBroadcastStats] = useState({}); // { broadcastId: readCount }

    const handleViewCertificate = async (client) => {
        const filePath = client.certificate_url || `${client.id}/${client.certificate_filename}`;
        const { data, error } = await supabase.storage
            .from('certificates')
            .createSignedUrl(filePath, 300); // 5 min
        if (error || !data?.signedUrl) {
            alert('Errore caricamento certificato: ' + (error?.message || 'URL non generato'));
            return;
        }
        setCertPreview({ url: data.signedUrl, name: client.name });
    };

    useEffect(() => {
        if (selectedClientForBadges) {
            fetchClientBadges();
        }
    }, [selectedClientForBadges]);

    const fetchClientBadges = async () => {
        if (!selectedClientForBadges) return;
        const { data } = await supabase.from('achievements').select('*').eq('user_id', selectedClientForBadges.id);
        setClientBadges(data || []);
    };

    const handleAddBadge = async (type, level) => {
        if (!selectedClientForBadges) return;
        const { error } = await supabase.from('achievements').insert({
            user_id: selectedClientForBadges.id,
            badge_type: type,
            level: level,
            weight_achieved: 0
        });
        if (!error) fetchClientBadges();
        else alert("Errore assegnazione badge: " + error.message);
    };

    const handleRemoveBadge = async (id) => {
        if (!confirm("Rimuovere questo badge?")) return;
        const { error } = await supabase.from('achievements').delete().eq('id', id);
        if (!error) fetchClientBadges();
        else alert("Errore rimozione: " + error.message);
    };

    useEffect(() => {
        const channelFeedback = supabase
            .channel('admin-feedback')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_feedback' }, (payload) => {
                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(e => console.log("Audio play blocked", e));
                } catch (e) {
                    console.debug("Audio play error", e);
                }
                // ✅ FIX: Toast non-bloccante invece di alert()
                setFeedbackToast({
                    type: payload.new.type?.toUpperCase(),
                    message: payload.new.message
                });
                setTimeout(() => setFeedbackToast(null), 8000);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channelFeedback);
        };
    }, []);

    // ✅ FIX RACE CONDITION: aspetta che il ruolo sia caricato dal server (get_my_role RPC)
    // prima di decidere se mostrare il pannello o redirigere
    useEffect(() => {
        if (userProfile.role === undefined) return; // Ruolo non ancora caricato
        if (userProfile.role === 'trainer' || userProfile.role === 'coach') {
            navigate('/coach');
            return;
        }
        if (userProfile.role !== 'admin') {
            navigate('/');
            return;
        }
        // Ruolo confermato come 'admin' → carica i dati
        fetchDashboardData();
    }, [userProfile.role]);

    // Carica dati in base al tab attivo
    useEffect(() => {
        if (activeTab === 'comunicazioni') {
            fetchBroadcasts();
        }
        if (activeTab === 'settings') {
            fetchGymCode();
        }
        if (activeTab === 'esercizi') {
            fetchExerciseLibrary();
        }
    }, [activeTab]);

    const fetchExerciseLibrary = async () => {
        setLoadingLibrary(true);
        const { data, error } = await supabase
            .from('exercise_library')
            .select('*')
            .order('muscle_group')
            .order('name');
        if (!error) setExerciseLibrary(data || []);
        setLoadingLibrary(false);
    };

    const MUSCLE_GROUPS = [
        'petto', 'schiena', 'spalle', 'bicipiti', 'tricipiti',
        'gambe', 'glutei', 'addome', 'polpacci', 'full body', 'cardio'
    ];

    const handleAddExercise = async () => {
        if (!newExercise.name.trim()) return alert('Inserisci il nome dell\'esercizio.');
        setSavingExercise(true);
        try {
            let videoUrl = null;
            if (newExerciseVideoFile) {
                const ext = newExerciseVideoFile.name.split('.').pop();
                const fileName = `ex_${Math.random().toString(36).substring(2)}.${ext}`;
                const { error: uploadErr } = await supabase.storage
                    .from('exercise-videos')
                    .upload(fileName, newExerciseVideoFile);
                if (uploadErr) throw uploadErr;
                const { data: { publicUrl } } = supabase.storage.from('exercise-videos').getPublicUrl(fileName);
                videoUrl = publicUrl;
            }
            const { data, error } = await supabase
                .from('exercise_library')
                .insert({
                    name: newExercise.name.trim(),
                    muscle_group: newExercise.muscle_group,
                    description: newExercise.description.trim() || null,
                    video_url: videoUrl
                })
                .select()
                .single();
            if (error) throw error;
            setExerciseLibrary(prev => [data, ...prev]);
            setNewExercise({ name: '', muscle_group: 'petto', description: '' });
            setNewExerciseVideoFile(null);
            alert('✅ Esercizio aggiunto all\'archivio!');
        } catch (e) {
            alert('Errore: ' + e.message);
        } finally {
            setSavingExercise(false);
        }
    };

    const handleDeleteExercise = async (exercise) => {
        if (!confirm(`Eliminare "${exercise.name}" dall'archivio?`)) return;
        try {
            if (exercise.video_url) {
                const filename = exercise.video_url.split('/').pop();
                if (filename) await supabase.storage.from('exercise-videos').remove([filename]);
            }
            const { error } = await supabase.from('exercise_library').delete().eq('id', exercise.id);
            if (error) throw error;
            setExerciseLibrary(prev => prev.filter(e => e.id !== exercise.id));
        } catch (e) {
            alert('Errore eliminazione: ' + e.message);
        }
    };

    // Fetch lista comunicazioni (solo admin)
    const fetchBroadcasts = async () => {
        setLoadingBroadcasts(true);
        const { data, error } = await supabase
            .from('broadcasts')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setBroadcastList(data || []);

        // Fetch statistiche lettura per ogni broadcast
        if (data && data.length > 0) {
            const ids = data.map(b => b.id);
            const { data: reads } = await supabase
                .from('broadcast_reads')
                .select('broadcast_id')
                .in('broadcast_id', ids);

            // Conta quante letture per ogni broadcast
            const stats = {};
            (reads || []).forEach(r => {
                stats[r.broadcast_id] = (stats[r.broadcast_id] || 0) + 1;
            });
            setBroadcastStats(stats);
        }
        setLoadingBroadcasts(false);
    };

    const handleDeleteBroadcast = async (id) => {
        if (!confirm('Vuoi eliminare questa comunicazione?')) return;
        const { error } = await supabase.from('broadcasts').delete().eq('id', id);
        if (!error) setBroadcastList(prev => prev.filter(b => b.id !== id));
        else alert('Errore eliminazione: ' + error.message);
    };

    const handleSendBroadcast = async () => {
        if (!broadcastForm.title.trim()) return alert('Inserisci un titolo.');
        if (!broadcastForm.message.trim()) return alert('Inserisci un messaggio.');

        setSendingBroadcast(true);
        let imageUrl = broadcastForm.image_url || null;

        // Upload immagine su Supabase Storage se è stato selezionato un file
        if (broadcastImageFile) {
            const ext = broadcastImageFile.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from('broadcasts')
                .upload(fileName, broadcastImageFile, { upsert: false });

            if (uploadError) {
                setSendingBroadcast(false);
                return alert('Errore upload immagine: ' + uploadError.message + '\n\nAssicurati di aver creato il bucket "broadcasts" in Supabase Storage (pubblico).');
            }
            const { data: urlData } = supabase.storage.from('broadcasts').getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSendingBroadcast(false); return; }

        const { error } = await supabase.from('broadcasts').insert({
            created_by: user.id,
            title: broadcastForm.title.trim(),
            message: broadcastForm.message.trim(),
            image_url: imageUrl,
            type: broadcastForm.type,
            target: broadcastForm.target
        });

        setSendingBroadcast(false);
        if (error) {
            alert('Errore invio: ' + error.message);
        } else {
            alert('✅ Comunicazione inviata!');
            setBroadcastForm({ title: '', message: '', type: 'annuncio', target: 'all', image_url: '' });
            setBroadcastImageFile(null);
            fetchBroadcasts();
        }
    };

    const handleAITemplateGenerated = async (plan) => {
        if (!plan || !Array.isArray(plan.workout_days)) return;
        if (!window.confirm(`✨ L'AI ha generato "${plan.name}". Vuoi salvarlo direttamente in archivio come template?`)) return;
        const { error } = await supabase.from('workout_templates').insert({
            name: plan.name,
            description: `${plan.duration_weeks || 8} settimane • Generato da AI`,
            days: plan.days_summary || `${plan.workout_days.length} gg/sett`,
            exercises: plan.workout_days
        });
        if (error) {
            alert('Errore salvataggio template AI: ' + error.message);
        } else {
            alert(`✅ Template "${plan.name}" salvato in archivio!`);
            fetchDashboardData();
        }
    };

    const handleDownloadCSV = () => {
        const headers = ['Nome', 'Email', 'Telefono', 'Iscritto il', 'Workout Completati', 'Schede Assegnate', 'Stato Certificato'];

        const rows = clients.map(c => {
            const clientPlans = allPlans.filter(p => p.client?.email === c.email || p.client?.name === c.name).length;
            const certStatus = c.certificate_uploaded
                ? (c.certificate_expires_at && new Date(c.certificate_expires_at) < new Date() ? 'Scaduto' : 'Valido')
                : (c.role === 'trainer' || c.role === 'admin' ? 'Non richiesto' : 'Mancante');

            return [
                `"${c.name || ''}"`,
                `"${c.email || ''}"`,
                `"${c.phone || ''}"`,
                `"${new Date(c.created_at).toLocaleDateString()}"`,
                `"${c.workouts_completed || 0}"`,
                `"${clientPlans}"`,
                `"${certStatus}"`
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "atleti_hypergym.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const { data: clientsData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            const { data: videosData } = await supabase.from('exercise_videos').select('*').order('created_at', { ascending: false });
            const { data: assignedData, error: assignedError } = await supabase
                .from('assigned_workouts')
                .select(`
                    id, created_at,
                    workout_plans (id, name, days, exercises, last_used_at),
                    client:client_id (name, email),
                    trainer:trainer_id (name)
                `)
                .order('created_at', { ascending: false });

            if (assignedError) console.error('[ADMIN] Error fetching assigned plans:', assignedError.message);

            const { data: feedbackData } = await supabase.from('app_feedback').select('*').order('created_at', { ascending: false });
            const { data: profilesData } = await supabase.from('profiles').select('id, name, email');
            const profilesMap = (profilesData || []).reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
            }, {});
            const mappedFeedback = (feedbackData || []).map(fb => ({
                ...fb,
                senderName: profilesMap[fb.user_id]?.name || 'Utente Sconosciuto',
                senderEmail: profilesMap[fb.user_id]?.email || ''
            }));

            const { data: templatesData } = await supabase.from('workout_templates').select('*').order('created_at', { ascending: false });

            setClients(clientsData || []);
            setExerciseVideos(videosData || []);
            setAllPlans(assignedData || []);
            setFeedbackList(mappedFeedback);
            setTemplates(templatesData || []);
            setStats({
                clients: clientsData?.filter(c => c.role === 'client').length || 0,
                coaches: clientsData?.filter(c => c.role === 'trainer').length || 0,
                videos: videosData?.length || 0
            });

        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleCoachRole = async (userId, currentRole) => {
        const newRole = currentRole === 'trainer' ? 'client' : 'trainer';
        const confirmMsg = newRole === 'trainer'
            ? 'Vuoi promuovere questo utente a Coach?'
            : 'Vuoi rimuovere il ruolo Coach da questo utente?';
        if (!confirm(confirmMsg)) return;

        const { error } = await supabase.rpc('set_user_role', { target_user_id: userId, new_role: newRole });

        if (error) {
            alert('Errore: ' + error.message);
        } else {
            alert(newRole === 'trainer' ? '✅ Utente promosso a Coach!' : '✅ Ruolo Coach rimosso.');
            fetchDashboardData();
        }
    };

    const handleUploadVideo = async () => {
        if (!newVideoFile || !newVideoExerciseName) return;
        setUploadingVideo(true);

        try {
            const fileExt = newVideoFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage.from('exercise-videos').upload(filePath, newVideoFile);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('exercise-videos').getPublicUrl(filePath);

            const { data: videoData, error: dbError } = await supabase.from('exercise_videos').insert({
                exercise_name: newVideoExerciseName,
                video_url: publicUrl,
                filename: filePath
            }).select().single();

            if (dbError) throw dbError;

            setExerciseVideos([videoData, ...exerciseVideos]);
            setStats(prev => ({ ...prev, videos: prev.videos + 1 }));
            setNewVideoFile(null);
            setNewVideoExerciseName('');
            alert("✅ Video caricato con successo!");
        } catch (error) {
            console.error("Upload error:", error);
            alert("Errore caricamento video: " + error.message);
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleDeleteVideo = async (video) => {
        if (!confirm(`Eliminare il video di ${video.exercise_name}?`)) return;

        try {
            let filename = video.filename;
            if (!filename && video.video_url) {
                filename = video.video_url.split('/').pop();
            }

            if (filename) await supabase.storage.from('exercise-videos').remove([filename]);
            const { error } = await supabase.from('exercise_videos').delete().eq('id', video.id);
            if (error) throw error;

            setExerciseVideos(prev => prev.filter(v => v.id !== video.id));
            setStats(prev => ({ ...prev, videos: prev.videos - 1 }));

        } catch (error) {
            console.error("Delete error:", error);
            alert("Errore eliminazione: " + error.message);
        }
    };

    const handleDeleteCertificate = async (clientId, filename) => {
        if (!confirm(`Sei sicuro di voler ELIMINARE il certificato di questo utente? Dovrà ricaricarlo.`)) return;
        try {
            if (filename) {
                const filePath = `${clientId}/${filename}`;
                await supabase.storage.from('certificates').remove([filePath]);
            }
            const { error } = await supabase.from('profiles').update({
                certificate_uploaded: false,
                certificate_filename: null,
                certificate_url: null,
                certificate_expires_at: null
            }).eq('id', clientId);

            if (error) throw error;

            setClients(prev => prev.map(c => c.id === clientId ? {
                ...c,
                certificate_uploaded: false,
                certificate_filename: null,
                certificate_url: null,
                certificate_expires_at: null
            } : c));
            alert("Certificato eliminato correttamente.");
        } catch (err) {
            console.error("Delete cert error:", err);
            alert("Errore eliminazione certificato: " + err.message);
        }
    };
    const handleDeleteTemplate = async (templateId, templateName) => {
        if (!confirm(`Sei sicuro di voler eliminare definitivamente il modello "${templateName}"?`)) return;
        try {
            const { error } = await supabase.from('workout_templates').delete().eq('id', templateId);
            if (error) throw error;
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            alert("Modello eliminato con successo!");
        } catch (err) {
            console.error("Delete template error:", err);
            alert("Errore eliminazione: " + err.message);
        }
    };

    const handleDuplicateTemplate = async (template) => {
        if (!confirm(`Vuoi creare una copia di "${template.name}"?`)) return;
        try {
            const templateData = { ...template };
            delete templateData.id;
            delete templateData.created_at;
            const { data, error } = await supabase.from('workout_templates').insert({
                ...templateData,
                name: `${template.name} - Copia`
            }).select();
            
            if (error) throw error;
            if (data && data[0]) {
                setTemplates(prev => [data[0], ...prev]);
                alert("Modello duplicato con successo!");
            }
        } catch (err) {
            console.error("Duplicate template error:", err);
            alert("Errore duplicazione: " + err.message);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        logout();
        navigate('/login');
    };

    // --- RENDER CONTENT BASED ON TAB ---

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div>
                            <h1 className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter">
                                Dashboard <span className="text-primary tracking-tighter">Admin</span>
                            </h1>
                            <p className="text-slate-500 font-bold uppercase tracking-wider text-xs flex items-center gap-1 mt-1">
                                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> Pannello di controllo palestra
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Stat: Atleti */}
                            <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex items-center justify-between group">
                                <div className="relative z-10">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Atleti Totali</p>
                                    <h3 className="text-4xl font-black text-slate-900 leading-none">{stats.clients}</h3>
                                </div>
                                <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 relative z-10 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined text-3xl block" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 blur-[40px] rounded-full pointer-events-none bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                            </div>
                            {/* Stat: Coach Attivi */}
                            <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex items-center justify-between group">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Coach Attivi</p>
                                    <h3 className="text-4xl font-black text-slate-900 leading-none">{stats.coaches}</h3>
                                </div>
                                <div className="p-4 rounded-2xl bg-amber-100 text-amber-600 border border-amber-200 relative z-10 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined text-3xl block" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                                </div>
                            </div>
                            {/* Stat: Video */}
                            <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex items-center justify-between group">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Video Esercizi</p>
                                    <h3 className="text-4xl font-black text-slate-900 leading-none">{stats.videos}</h3>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-100 text-slate-500 border border-slate-200 relative z-10 group-hover:scale-110 group-hover:bg-slate-800 group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined text-3xl block" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
                                </div>
                            </div>
                        </div>

                        {/* Ultimi atleti */}
                        <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-black text-lg text-slate-900 uppercase italic tracking-tighter">Ultimi Iscritti</h3>
                                <button onClick={() => setActiveTab('clients')} className="text-[10px] font-black uppercase tracking-wider hover:text-primary transition-colors flex items-center text-slate-500">
                                    Vedi tutti <span className="material-symbols-outlined ml-1 text-base">arrow_forward</span>
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {clients.slice(0, 5).map(c => (
                                    <div key={c.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-inner font-black text-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg,#ff6a00,#ffb000)' }}>
                                            {c.name?.[0] || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 text-sm tracking-tight">{c.name}</p>
                                            <p className="text-xs text-slate-400 font-medium">{c.email}</p>
                                        </div>
                                        {c.certificate_uploaded
                                            ? <span className="text-[10px] font-black text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm"><span className="material-symbols-outlined text-[12px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Cert.</span>
                                            : (c.role === 'trainer' || c.role === 'admin')
                                                ? <span className="text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded uppercase tracking-wider shadow-sm">Staff</span>
                                                : <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded uppercase tracking-wider shadow-sm">Manca cert.</span>
                                        }
                                    </div>
                                ))}
                                {clients.length === 0 && <div className="p-8 text-center text-slate-500 text-sm font-bold uppercase tracking-wider border-2 border-dashed border-slate-100 m-4 rounded-xl">Nessun atleta iscritto.</div>}
                            </div>
                        </div>
                    </div>
                );

            case 'clients':
                return (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-in fade-in shadow-sm">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Atleti</h2>
                            <button onClick={handleDownloadCSV}
                                className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 font-black uppercase text-xs rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95 border border-slate-200 hover:border-primary">
                                <span className="material-symbols-outlined text-lg block">download</span> Scarica CSV
                            </button>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Atleta</th>
                                        <th className="px-6 py-4">Ruolo</th>
                                        <th className="px-6 py-4">Iscritto il</th>
                                        <th className="px-6 py-4 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {clients.map(client => (
                                        <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-black text-lg shadow-inner group-hover:text-primary transition-colors">
                                                        {client.name?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 text-sm block tracking-tight">{client.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 block">{client.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border shadow-sm ${client.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                    client.role === 'trainer' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                        'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}>
                                                    {client.role === 'admin' ? '👑 Admin' : client.role === 'trainer' ? '🏋️ Coach' : '👤 Utente'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-500 tracking-wide">
                                                {new Date(client.created_at).toLocaleDateString()}
                                                <div className="mt-1">
                                                    {client.certificate_uploaded ? (
                                                        <div className="inline-flex items-center gap-1 bg-green-50 text-green-600 px-2 py-0.5 rounded text-[10px] uppercase font-black border border-green-200 shadow-sm">
                                                            <span className="material-symbols-outlined text-[12px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Cert.
                                                            <button title="Visualizza certificato" onClick={() => handleViewCertificate(client)} className="ml-1 text-slate-400 hover:text-primary transition-colors p-0.5 aspect-square rounded hover:bg-green-100">
                                                                <span className="material-symbols-outlined text-[14px] block">visibility</span>
                                                            </button>
                                                            <button title="Elimina certificato" onClick={() => handleDeleteCertificate(client.id, client.certificate_filename)} className="text-slate-400 hover:text-red-500 transition-colors p-0.5 aspect-square rounded hover:bg-green-100">
                                                                <span className="material-symbols-outlined text-[14px] block">delete</span>
                                                            </button>
                                                        </div>
                                                    ) : (client.role === 'trainer' || client.role === 'admin') ? (
                                                        <span className="inline-block bg-slate-50 text-slate-500 px-2 py-0.5 rounded text-[10px] uppercase font-black border border-slate-200 shadow-sm">Non richiesto</span>
                                                    ) : (
                                                        <span className="inline-block bg-red-50 text-red-500 px-2 py-0.5 rounded text-[10px] uppercase font-black border border-red-200 shadow-sm">Manca Cert.</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end items-center gap-1">
                                                    {client.role !== 'admin' && (
                                                        <button onClick={() => handleToggleCoachRole(client.id, client.role)}
                                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm border ${client.role === 'trainer'
                                                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:scale-105 active:scale-95'
                                                                : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:scale-105 active:scale-95'
                                                                }`}>
                                                            {client.role === 'trainer' ? 'Rimuovi Coach' : 'Rendi Coach'}
                                                        </button>
                                                    )}

                                                    {client.role === 'client' && (
                                                        <button onClick={() => setSelectedClientForBadges(client)}
                                                            className="w-8 h-8 flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500 hover:text-white text-xs rounded-lg transition-all shadow-sm hover:shadow-md hover:scale-110 active:scale-90"
                                                            title="Gestisci Badge">
                                                            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                                                        </button>
                                                    )}
                                                    <button onClick={() => navigate(`/chat`)}
                                                        className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-800 text-xs rounded-lg transition-all shadow-sm hover:shadow-md hover:scale-110 active:scale-90"
                                                        title="Apri Chat">
                                                        <span className="material-symbols-outlined text-[18px]">chat</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {clients.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-500 text-sm font-bold uppercase tracking-wider">Nessun utente trovato.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'schede': {
                // ── Calcola scadenza per ogni scheda ─────────────────────────────
                const getDaysRemaining = (plan) => {
                    const durationWeeks = plan.workout_plans?.duration_weeks || 4;
                    const expiresAt = new Date(plan.created_at).getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000;
                    return Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
                };
                const expiringPlans = allPlans
                    .filter(p => p.workout_plans)
                    .map(p => ({ ...p, daysLeft: getDaysRemaining(p) }))
                    .filter(p => p.daysLeft <= 7 && p.daysLeft >= -30)
                    .sort((a, b) => a.daysLeft - b.daysLeft);

                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-white p-6 pb-2 rounded-t-2xl border-x border-t border-slate-200 mx-px mt-px -mb-4 relative z-10 before:absolute before:content-[''] before:left-0 before:top-0 before:w-full before:h-1 before:bg-gradient-to-r before:from-primary before:to-amber-400 before:rounded-t-xl opacity-100">
                             <h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Schede Assegnate</h2>
                             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Monitora i workout dei tuoi atleti</p>
                        </div>

                        {/* ── Sezione Schede in Scadenza ─────────────────────────── */}
                        {expiringPlans.length > 0 && (
                            <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm relative z-0 animate-in fade-in">
                                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                                    <h3 className="font-black text-white uppercase tracking-widest text-xs">⚠️ Schede in Scadenza — {expiringPlans.length} {expiringPlans.length === 1 ? 'scheda' : 'schede'}</h3>
                                </div>
                                <div className="divide-y divide-amber-50">
                                    {expiringPlans.map(plan => {
                                        const d = plan.daysLeft;
                                        const urgency = d <= 1
                                            ? { bg: 'bg-red-50', badge: 'bg-red-100 text-red-700 border-red-300', label: d <= 0 ? 'SCADUTA' : '⚠️ DOMANI', icon: 'error' }
                                            : d <= 3
                                            ? { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700 border-orange-300', label: `${d} GIORNI`, icon: 'schedule' }
                                            : { bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700 border-amber-300', label: `${d} GIORNI`, icon: 'calendar_today' };
                                        return (
                                            <div key={plan.id} className={`${urgency.bg} px-5 py-4 flex items-center justify-between gap-4`}>
                                                <div className="flex items-center gap-3">
                                                    <span className={`material-symbols-outlined text-[22px] ${d <= 1 ? 'text-red-500' : d <= 3 ? 'text-orange-500' : 'text-amber-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{urgency.icon}</span>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm">{plan.workout_plans?.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase">👤 {plan.client?.name || 'N/D'} • Assegnata il {new Date(plan.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <span className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${urgency.badge}`}>
                                                    {urgency.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm relative z-0">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Nome Scheda</th>
                                            <th className="px-6 py-4">Destinatario</th>
                                            <th className="px-6 py-4">Assegnata da</th>
                                            <th className="px-6 py-4">Creata il</th>
                                            <th className="px-6 py-4">Ultimo Allenamento</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {allPlans.map(plan => (
                                            <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-900 text-sm tracking-tight">{plan.workout_plans?.name || 'Scheda Eliminata'}</span>
                                                    <div className="text-[10px] text-slate-400 font-black uppercase mt-1">
                                                        {plan.workout_plans?.days ? `${plan.workout_plans.days} GIORNI/SETT` : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-inner font-black text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg,#ff6a00,#ffb000)' }}>
                                                            {plan.client?.name?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 tracking-tight">{plan.client?.name || 'Sconosciuto'}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 block">{plan.client?.email || ''}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {plan.trainer?.name ? (
                                                        <div className="inline-flex items-center gap-2 bg-amber-50 pr-3 rounded-full border border-amber-100 shadow-sm p-0.5">
                                                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-amber-500 shadow-sm">
                                                                {plan.trainer.name[0]}
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider pt-px">{plan.trainer.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200 uppercase tracking-wider">Auto-creata</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500 tracking-wide">
                                                    {new Date(plan.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {plan.workout_plans?.last_used_at ? (
                                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-green-50 text-green-700 px-2.5 py-1 rounded border border-green-200 uppercase tracking-wider shadow-sm">
                                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                            {new Date(plan.workout_plans.last_used_at).toLocaleDateString()}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 tracking-wider">
                                                           <span className="w-2 h-2 rounded-full bg-slate-300"></span> Mai usata
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {allPlans.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-slate-500 text-sm font-bold uppercase tracking-wider border-2 border-dashed border-slate-100 m-4 rounded-xl">Nessuna scheda assegnata trovata.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            }

            case 'templates':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-end mb-6 border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Archivio Schede</h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Schede pre-impostate rapide</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowAIModal(true)}
                                    className="text-white px-4 py-2.5 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
                                    style={{ background: 'linear-gradient(135deg, #7c3aed, #ff6a00)' }}
                                >
                                    ✨ Genera con AI
                                </button>
                                <button onClick={() => navigate('/plans/new?isTemplate=true')} 
                                    className="bg-primary text-white px-5 py-2.5 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-primary/20">
                                    <span className="material-symbols-outlined text-[18px]">add</span> Nuovo Modello
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templates.map(tpl => (
                                <div key={tpl.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-primary/30 transition-all shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-black text-xl text-slate-900 uppercase italic tracking-tighter transition-colors w-[85%]">{tpl.name}</h3>
                                            <span className="bg-primary/10 text-primary text-[10px] px-2.5 py-1 rounded-md uppercase font-black tracking-widest border border-primary/20 shadow-sm">{tpl.days || 'N/A'}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-5 font-medium leading-relaxed">{tpl.description}</p>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                            {new Date(tpl.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => handleDuplicateTemplate(tpl)} 
                                                className="text-slate-400 hover:text-blue-500 flex items-center gap-1 text-[10px] uppercase font-black transition-colors" title="Copia Modello">
                                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                Copia
                                            </button>
                                            <button onClick={() => navigate(`/plans/new?tplId=${tpl.id}&isTemplate=true`)} 
                                                className="text-primary hover:text-primary/70 flex items-center gap-1 text-[10px] uppercase font-black transition-colors">
                                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                                Modifica
                                            </button>
                                            <button onClick={() => handleDeleteTemplate(tpl.id, tpl.name)} 
                                                className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-[10px] uppercase font-black transition-colors" title="Elimina Modello">
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="col-span-full border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">inventory_2</span>
                                    <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Nessun modello creato.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'esercizi': {
                const muscleGroups = [...new Set(exerciseLibrary.map(e => e.muscle_group))].sort();
                const filteredLibrary = exerciseLibrary.filter(e =>
                    !libraryFilter || e.muscle_group === libraryFilter
                );
                return (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Archivio Esercizi</h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">{exerciseLibrary.length} esercizi nell&apos;archivio</p>
                            </div>
                        </div>

                        {/* Form aggiungi esercizio */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-primary">Aggiungi Nuovo Esercizio</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Nome */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nome Esercizio *</label>
                                    <input
                                        type="text"
                                        value={newExercise.name}
                                        onChange={e => setNewExercise(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Es. Panca Piana con bilanciere"
                                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                                {/* Gruppo muscolare */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Gruppo Muscolare</label>
                                    <select
                                        value={newExercise.muscle_group}
                                        onChange={e => setNewExercise(p => ({ ...p, muscle_group: e.target.value }))}
                                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                                    >
                                        {MUSCLE_GROUPS.map(g => (
                                            <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Descrizione */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Descrizione / Note (opzionale)</label>
                                <textarea
                                    value={newExercise.description}
                                    onChange={e => setNewExercise(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Tecnica di esecuzione, varianti, consigli..."
                                    rows={2}
                                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                />
                            </div>

                            {/* Video opzionale */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Video Dimostrativo (opzionale)</label>
                                <label className="flex items-center gap-4 border-2 border-dashed border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (file.size > 100 * 1024 * 1024) return alert('Video troppo grande (max 100MB)');
                                            setNewExerciseVideoFile(file);
                                        }}
                                    />
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            {newExerciseVideoFile ? 'videocam' : 'add_circle'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-700 group-hover:text-primary transition-colors">
                                            {newExerciseVideoFile ? newExerciseVideoFile.name : 'Carica video (MP4, MOV, AVI)'}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Max 100MB</p>
                                    </div>
                                    {newExerciseVideoFile && (
                                        <button
                                            type="button"
                                            onClick={e => { e.preventDefault(); setNewExerciseVideoFile(null); }}
                                            className="ml-auto text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    )}
                                </label>
                            </div>

                            <button
                                onClick={handleAddExercise}
                                disabled={savingExercise || !newExercise.name.trim()}
                                className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {savingExercise ? (
                                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvataggio...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span> Aggiungi all&apos;Archivio</>
                                )}
                            </button>
                        </div>

                        {/* Filtro per muscolo */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => setLibraryFilter('')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border flex-shrink-0 ${!libraryFilter ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                            >
                                Tutti ({exerciseLibrary.length})
                            </button>
                            {muscleGroups.map(g => (
                                <button
                                    key={g}
                                    onClick={() => setLibraryFilter(g)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border flex-shrink-0 ${libraryFilter === g ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                >
                                    {g.charAt(0).toUpperCase() + g.slice(1)} ({exerciseLibrary.filter(e => e.muscle_group === g).length})
                                </button>
                            ))}
                        </div>

                        {/* Lista esercizi */}
                        {loadingLibrary ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-10 h-10 rounded-full animate-spin border-4 border-slate-200" style={{ borderTopColor: '#ff6a00' }} />
                            </div>
                        ) : filteredLibrary.length === 0 ? (
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                                <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">exercise</span>
                                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nessun esercizio trovato.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredLibrary.map(ex => (
                                    <div key={ex.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col">
                                        {/* Video preview se disponibile */}
                                        {ex.video_url && (
                                            <div
                                                className="relative bg-slate-900 h-32 cursor-pointer group"
                                                onClick={() => setExerciseVideoPreview(ex)}
                                            >
                                                <video
                                                    src={ex.video_url}
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                    muted
                                                    preload="metadata"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:bg-white/30 transition-all">
                                                        <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">{ex.name}</h3>
                                                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded border border-primary/20">
                                                        {ex.muscle_group}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteExercise(ex)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex-shrink-0"
                                                    title="Elimina esercizio"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                            {ex.description && (
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed flex-1 mt-1">{ex.description}</p>
                                            )}
                                            {!ex.video_url && (
                                                <p className="text-[10px] text-slate-300 font-bold uppercase mt-2 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">videocam_off</span> Nessun video
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Modal video preview */}
                        {exerciseVideoPreview && (
                            <div
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in"
                                onClick={() => setExerciseVideoPreview(null)}
                            >
                                <div
                                    className="relative max-w-2xl w-full bg-black rounded-3xl overflow-hidden shadow-2xl"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between p-4 bg-slate-900/80 absolute top-0 left-0 right-0 z-10">
                                        <div>
                                            <p className="font-black text-white uppercase text-sm">{exerciseVideoPreview.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{exerciseVideoPreview.muscle_group}</p>
                                        </div>
                                        <button onClick={() => setExerciseVideoPreview(null)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                            <span className="material-symbols-outlined text-[24px]">close</span>
                                        </button>
                                    </div>
                                    <video
                                        src={exerciseVideoPreview.video_url}
                                        controls
                                        autoPlay
                                        className="w-full max-h-[70vh] object-contain"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            case 'videos':
                return (
                    <VideoManagementSection
                        exerciseVideos={exerciseVideos}
                        newVideoExerciseName={newVideoExerciseName}
                        setNewVideoExerciseName={setNewVideoExerciseName}
                        newVideoFile={newVideoFile}
                        setNewVideoFile={setNewVideoFile}
                        uploadingVideo={uploadingVideo}
                        handleUploadVideo={handleUploadVideo}
                        handleDeleteVideo={handleDeleteVideo}
                    />
                );

            case 'settings':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white p-6 pb-4 rounded-2xl border-x border-t border-slate-200 mx-px mt-px -mb-4 relative z-10 shadow-sm before:absolute before:content-[''] before:left-0 before:top-0 before:w-full before:h-2 before:bg-slate-900 before:rounded-t-2xl">
                            <h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter mt-1">IMPOSTAZIONI ADMIN</h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Gestisci la piattaforma</p>
                        </div>

                        <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm relative z-0">
                            <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-lg mb-6 flex items-center gap-2 pb-2 border-b border-slate-100">
                                <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span> Accesso & Sicurezza
                            </h3>
                            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner group transition-colors hover:bg-white hover:border-slate-300 cursor-pointer" onClick={toggleDarkMode}>
                                <div>
                                    <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Tema App (Chiaro/Scuro)</p>
                                    <p className="text-xs text-slate-500 font-bold mt-1">Passa tra la modalità chiara e scura in tutta l&apos;app</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${isDarkMode ? 'bg-primary border border-primary' : 'bg-slate-300 border border-slate-400/20'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${isDarkMode ? 'right-1' : 'left-1'}`}></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner group transition-colors hover:bg-white hover:border-slate-300">
                                <div>
                                    <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Modalità Manutenzione</p>
                                    <p className="text-xs text-slate-500 font-bold mt-1">Blocca l&apos;accesso agli utenti non admin</p>
                                </div>
                                <div className="w-12 h-6 bg-slate-300 rounded-full relative cursor-not-allowed shadow-inner border border-slate-400/20">
                                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 shadow-sm"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner group transition-colors hover:bg-white hover:border-slate-300">
                                <div>
                                    <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Nuove Registrazioni</p>
                                    <p className="text-xs text-slate-500 font-bold mt-1">Permetti ai nuovi utenti di iscriversi</p>
                                </div>
                                <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer shadow-inner border border-green-600/20">
                                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 shadow-sm"></div>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner group transition-colors hover:bg-white hover:border-slate-300">
                                <div>
                                    <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Codice Sblocco Registrazione (PWA / Store)</p>
                                    <p className="text-xs text-slate-500 font-bold mt-1">I nuovi utenti dovranno inserire questo codice per potersi registrare all&apos;app</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={gymAccessCode} 
                                        onChange={(e) => setGymAccessCode(e.target.value.toUpperCase())}
                                        placeholder="Caricamento..."
                                        className="bg-white border border-slate-200 rounded-xl p-3 text-xs font-black uppercase text-center w-36 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm"
                                    />
                                    <button 
                                        onClick={handleSaveGymCode}
                                        disabled={savingGymCode}
                                        className="bg-primary text-white text-xs font-black uppercase px-4 py-3 rounded-xl hover:bg-primary/95 transition-colors shadow-md shadow-primary/20 disabled:opacity-50 active:scale-95 transition-transform"
                                    >
                                        {savingGymCode ? '...' : 'Salva'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                            <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-lg mb-6 flex items-center gap-2 pb-2 border-b border-slate-100">
                                <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span> Comunicazioni
                            </h3>
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner group transition-colors hover:bg-white hover:border-slate-300 focus-within:bg-white focus-within:border-slate-300">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Invia Notifica Globale</label>
                                <textarea className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none mb-3 resize-none shadow-sm font-medium" rows="3" placeholder="Scrivi un messaggio per tutti gli utenti..."></textarea>
                                <button disabled className="bg-slate-200 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider w-full transition-colors cursor-not-allowed border border-slate-300 border-dashed">Invia (Attualmente Disabilitato)</button>
                            </div>
                        </div>
                    </div>
                );

            case 'feedback':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-white p-6 pb-2 rounded-t-2xl border-x border-t border-slate-200 mx-px mt-px -mb-4 relative z-10 before:absolute before:content-[''] before:left-0 before:top-0 before:w-full before:h-1 before:bg-gradient-to-r before:from-primary before:to-amber-400 before:rounded-t-xl opacity-100">
                             <h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Feedback Utenti</h2>
                             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Idee, bug segnalati e supporto</p>
                        </div>
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm relative z-0">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Mittente</th>
                                            <th className="px-6 py-4">Tipo</th>
                                            <th className="px-6 py-4">Messaggio</th>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Stato</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {feedbackList.map(fb => (
                                            <tr key={fb.id} 
                                                onClick={async () => {
                                                    setSelectedFeedback(fb);
                                                    if (fb.status === 'new') {
                                                        const { error } = await supabase.from('app_feedback').update({ status: 'read' }).eq('id', fb.id);
                                                        if (!error) {
                                                            setFeedbackList(prev => prev.map(item => item.id === fb.id ? { ...item, status: 'read' } : item));
                                                        }
                                                    }
                                                }}
                                                className={`transition-colors group cursor-pointer ${fb.status === 'new' ? 'bg-orange-50/50 hover:bg-orange-50 font-semibold' : 'hover:bg-slate-50'}`}
                                                title="Clicca per aprire i dettagli"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:text-primary transition-colors">
                                                            {fb.senderName?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-900 text-xs block leading-tight">{fb.senderName}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{fb.senderEmail}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border shadow-sm ${fb.type === 'bug' ? 'bg-red-50 text-red-600 border-red-200' :
                                                        fb.type === 'idea' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                            'bg-blue-50 text-blue-600 border-blue-200'
                                                        }`}>
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            {fb.type === 'bug' ? 'bug_report' : fb.type === 'idea' ? 'lightbulb' : 'chat_bubble'}
                                                        </span>
                                                        {fb.type === 'bug' ? 'Bug' : fb.type === 'idea' ? 'Idea' : 'Altro'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-700 font-medium max-w-xs group-hover:text-slate-900 transition-colors">
                                                    <p className="truncate">{fb.message}</p>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500 tracking-wide">
                                                    {new Date(fb.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {fb.status === 'new'
                                                        ? <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-primary tracking-wider px-2 py-1 bg-primary/10 rounded border border-primary/20 shadow-sm"><span className="w-2 h-2 rounded-full animate-pulse bg-primary" />Nuovo</span>
                                                        : <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Letto</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                        {feedbackList.length === 0 && (
                                            <tr><td colSpan="5" className="p-8 text-center text-slate-500 text-sm font-bold uppercase tracking-wider border-2 border-dashed border-slate-100 m-4 rounded-xl">Nessun feedback ricevuto.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );

            case 'comunicazioni':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div>
                            <h1 className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter">
                                Comunicazioni <span className="text-primary">Palestra</span>
                            </h1>
                            <p className="text-slate-500 font-bold uppercase tracking-wider text-xs flex items-center gap-1 mt-1">
                                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                                Invia notifiche in-app a tutto il tuo staff e clienti
                            </p>
                        </div>

                        {/* FORM NUOVA COMUNICAZIONE */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-primary">
                                Nuova Comunicazione
                            </h2>

                            {/* Tipo */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                        { value: 'annuncio', label: '📢 Annuncio', gradient: 'from-blue-500 to-blue-600' },
                                        { value: 'offerta', label: '🎁 Offerta', gradient: 'from-orange-400 to-primary' },
                                        { value: 'avviso', label: '⚠️ Avviso', gradient: 'from-amber-400 to-amber-600' },
                                        { value: 'novita', label: '✅ Novità', gradient: 'from-emerald-500 to-green-600' },
                                    ].map(t => (
                                        <button
                                            key={t.value}
                                            onClick={() => setBroadcastForm(p => ({ ...p, type: t.value }))}
                                            className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black uppercase tracking-wide transition-all ${broadcastForm.type === t.value
                                                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Destinatari */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Destinatari</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'all', label: '👥 Tutti' },
                                        { value: 'clients', label: '🏋️ Solo Clienti' },
                                        { value: 'trainers', label: '🎓 Solo Coach' },
                                    ].map(t => (
                                        <button
                                            key={t.value}
                                            onClick={() => setBroadcastForm(p => ({ ...p, target: t.value }))}
                                            className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black uppercase tracking-wide transition-all ${broadcastForm.target === t.value
                                                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Titolo */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Titolo *</label>
                                <input
                                    value={broadcastForm.title}
                                    onChange={e => setBroadcastForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Es. Chiusura Straordinaria Domenica"
                                    maxLength={80}
                                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                                <p className="text-right text-[10px] text-slate-300 mt-1">{broadcastForm.title.length}/80</p>
                            </div>

                            {/* Messaggio */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Messaggio *</label>
                                <textarea
                                    value={broadcastForm.message}
                                    onChange={e => setBroadcastForm(p => ({ ...p, message: e.target.value }))}
                                    placeholder="Scrivi il testo completo della comunicazione..."
                                    rows={4}
                                    maxLength={500}
                                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                />
                                <p className="text-right text-[10px] text-slate-300 mt-1">{broadcastForm.message.length}/500</p>
                            </div>

                            {/* Immagine */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                    Immagine (opzionale)
                                </label>
                                <div className="flex gap-3 items-start">
                                    <label className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        return alert('Immagine troppo grande (max 5MB)');
                                                    }
                                                    setBroadcastImageFile(file);
                                                    setBroadcastForm(p => ({ ...p, image_url: '' }));
                                                }
                                            }}
                                        />
                                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-3xl block mb-1">
                                            {broadcastImageFile ? 'check_circle' : 'add_photo_alternate'}
                                        </span>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                                            {broadcastImageFile ? broadcastImageFile.name : 'Carica immagine (max 5MB)'}
                                        </p>
                                    </label>
                                    {broadcastImageFile && (
                                        <button onClick={() => setBroadcastImageFile(null)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mt-2">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Preview */}
                            {(broadcastForm.title || broadcastForm.message) && (
                                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Anteprima</p>
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                        <div className={`px-4 py-3 text-white text-xs font-black uppercase tracking-wider ${
                                            broadcastForm.type === 'annuncio' ? 'bg-blue-500' :
                                            broadcastForm.type === 'offerta' ? 'bg-orange-500' :
                                            broadcastForm.type === 'avviso' ? 'bg-amber-500' : 'bg-emerald-500'
                                        }`}>
                                            {broadcastForm.type === 'annuncio' ? '📢 Annuncio' :
                                             broadcastForm.type === 'offerta' ? '🎁 Offerta' :
                                             broadcastForm.type === 'avviso' ? '⚠️ Avviso' : '✅ Novità'}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-black text-slate-900 text-sm uppercase">{broadcastForm.title || '–'}</h3>
                                            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{broadcastForm.message || '–'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bottone Invia */}
                            <button
                                onClick={handleSendBroadcast}
                                disabled={sendingBroadcast || !broadcastForm.title.trim() || !broadcastForm.message.trim()}
                                className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {sendingBroadcast ? (
                                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Invio in corso...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span> Invia Comunicazione</>
                                )}
                            </button>
                        </div>

                        {/* LISTA COMUNICAZIONI INVIATE */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-200">
                                    Cronologia ({broadcastList.length})
                                </h2>
                                <button onClick={fetchBroadcasts} className="text-xs text-slate-400 hover:text-primary font-bold flex items-center gap-1 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                                    Aggiorna
                                </button>
                            </div>

                            {loadingBroadcasts ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 rounded-full animate-spin border-4 border-slate-200" style={{ borderTopColor: '#ff6a00' }} />
                                </div>
                            ) : broadcastList.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                                    <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">campaign</span>
                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nessuna comunicazione inviata.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {broadcastList.map(b => {
                                        const typeEmoji = b.type === 'annuncio' ? '📢' : b.type === 'offerta' ? '🎁' : b.type === 'avviso' ? '⚠️' : '✅';
                                        const typeColor = b.type === 'annuncio' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                            b.type === 'offerta' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                            b.type === 'avviso' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-200';
                                        const targetLabel = b.target === 'all' ? '👥 Tutti' : b.target === 'clients' ? '🏋️ Clienti' : '🎓 Coach';
                                        const readCount = broadcastStats[b.id] || 0;

                                        return (
                                            <div key={b.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                                                {b.image_url && (
                                                    <img src={b.image_url} alt={b.title} className="w-full h-32 object-cover" />
                                                )}
                                                <div className="p-5 flex-1 flex flex-col gap-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${typeColor}`}>
                                                            {typeEmoji} {b.type}
                                                        </span>
                                                        <button onClick={() => handleDeleteBroadcast(b.id)} className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                    <h3 className="font-black text-slate-900 text-sm uppercase leading-tight">{b.title}</h3>
                                                    <p className="text-slate-500 text-xs leading-relaxed flex-1">{b.message}</p>
                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        <span>{new Date(b.created_at).toLocaleDateString('it-IT')}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span>{targetLabel}</span>
                                                            <span className="flex items-center gap-1 text-primary">
                                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                                {readCount} lett{readCount === 1 ? 'o' : 'i'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                );

            default:
                return <div className="p-10 text-center text-slate-500 font-bold uppercase">Sezione non trovata</div>;
        }
    };

    // ✅ FIX: Spinner mentre il ruolo è ancora undefined (prevenzione race condition)
    if (userProfile.role === undefined) {
        return (
            <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
                <div className="w-10 h-10 rounded-full animate-spin border-[3px] border-slate-200" style={{ borderTopColor: '#ff6a00' }} />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background text-slate-900 font-sans overflow-hidden">
            {/* ✅ FIX: Toast non-bloccante per nuovi feedback (sostituisce alert()) */}
            {feedbackToast && (
                <div className="fixed top-4 right-4 z-[99999] flex items-start gap-3 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 max-w-sm animate-in slide-in-from-top-2">
                    <span className="material-symbols-outlined text-primary text-2xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>bug_report</span>
                    <div className="flex-1">
                        <p className="font-black text-slate-900 text-sm uppercase tracking-wide">🐛 Nuovo Feedback — {feedbackToast.type}</p>
                        <p className="text-slate-500 text-xs mt-1 font-medium line-clamp-2">{feedbackToast.message}</p>
                    </div>
                    <button onClick={() => setFeedbackToast(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}
            <AdminSidebar
                active={activeTab}
                setActive={setActiveTab}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
                onLogout={handleLogout}
                onFeedback={() => setShowFeedbackModal(true)}
            />

            <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
                {selectedClientForBadges && (
                    <BadgeManagerModal
                        user={selectedClientForBadges}
                        badges={clientBadges}
                        onClose={() => setSelectedClientForBadges(null)}
                        onAdd={handleAddBadge}
                        onRemove={handleRemoveBadge}
                    />
                )}
                {showFeedbackModal && (
                    <FeedbackModal
                        onClose={() => setShowFeedbackModal(false)}
                        userId={userProfile?.id || (authToken ? JSON.parse(atob(authToken.split('.')[1])).sub : null)}
                    />
                )}
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-sm z-20">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[24px]">security</span>
                        <span className="font-black italic text-slate-900 text-lg tracking-tighter">ADMIN</span>
                    </div>
                    <button onClick={() => setMobileOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                        <span className="material-symbols-outlined text-[28px]">menu</span>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar">
                    {/* Component Rendering */}
                    <div className="relative z-10 max-w-6xl mx-auto min-h-full pb-16">
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* Certificate Preview Modal */}
            {certPreview && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px] animate-in fade-in"
                    onClick={() => setCertPreview(null)}
                >
                    <div
                        className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter drop-shadow-sm">Certificato Medico</h3>
                                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-[0.2em]">{certPreview.name}</p>
                            </div>
                            <button onClick={() => setCertPreview(null)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shadow-sm bg-white border border-slate-200">
                                <span className="material-symbols-outlined block text-[24px]">close</span>
                            </button>
                        </div>
                        <div className="p-4 bg-slate-100 flex-1 flex items-center justify-center overflow-auto custom-scrollbar shadow-inner">
                            <img
                                src={certPreview.url}
                                alt={`Certificato di ${certPreview.name}`}
                                className="max-w-full h-auto object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                            />
                        </div>
                    </div>
                </div>
            )}
            {/* AI Generator Modal */}
            {showAIModal && (
                <AIGeneratorModal
                    onClose={() => setShowAIModal(false)}
                    onPlanGenerated={handleAITemplateGenerated}
                />
            )}

            {/* Selected Feedback Details Modal */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedFeedback(null)}>
                    <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[28px]">rate_review</span> Dettaglio Feedback
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 ml-[36px]">Gestione Segnalazione</p>
                            </div>
                            <button onClick={() => setSelectedFeedback(null)} className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-800 border border-slate-200 shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 shadow-inner">
                                <div className="flex justify-between items-center">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border shadow-sm ${selectedFeedback.type === 'bug' ? 'bg-red-50 text-red-600 border-red-200' :
                                        selectedFeedback.type === 'idea' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                            'bg-blue-50 text-blue-600 border-blue-200'
                                        }`}>
                                        <span className="material-symbols-outlined text-[14px]">
                                            {selectedFeedback.type === 'bug' ? 'bug_report' : selectedFeedback.type === 'idea' ? 'lightbulb' : 'chat_bubble'}
                                        </span>
                                        {selectedFeedback.type === 'bug' ? 'Bug' : selectedFeedback.type === 'idea' ? 'Idea' : 'Altro'}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">{new Date(selectedFeedback.created_at).toLocaleString()}</span>
                                </div>
                                
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Mittente</p>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedFeedback.senderName}</p>
                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">{selectedFeedback.senderEmail}</p>
                                </div>

                                <div className="pt-3 border-t border-slate-200/60">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-1">Messaggio</p>
                                    <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed bg-white border border-slate-100 rounded-xl p-4 shadow-sm max-h-48 overflow-y-auto custom-scrollbar">{selectedFeedback.message}</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const userId = selectedFeedback.user_id;
                                        setSelectedFeedback(null);
                                        navigate(`/chat/${userId}`);
                                    }}
                                    className="flex-1 py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-md shadow-primary/20 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chat</span> Rispondi in Chat
                                </button>
                                <button
                                    onClick={async () => {
                                        const nextStatus = selectedFeedback.status === 'done' ? 'read' : 'done';
                                        const { error } = await supabase.from('app_feedback').update({ status: nextStatus }).eq('id', selectedFeedback.id);
                                        if (!error) {
                                            setFeedbackList(prev => prev.map(item => item.id === selectedFeedback.id ? { ...item, status: nextStatus } : item));
                                            setSelectedFeedback(prev => ({ ...prev, status: nextStatus }));
                                        }
                                    }}
                                    className={`px-4 rounded-xl border font-black uppercase text-[10px] tracking-wider transition-all active:scale-95 shadow-sm ${selectedFeedback.status === 'done'
                                        ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                        : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                    }`}
                                >
                                    {selectedFeedback.status === 'done' ? 'Riapri' : 'Risolvi'}
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm("Vuoi davvero eliminare definitivamente questo feedback?")) {
                                            const { error } = await supabase.from('app_feedback').delete().eq('id', selectedFeedback.id);
                                            if (!error) {
                                                setFeedbackList(prev => prev.filter(item => item.id !== selectedFeedback.id));
                                                setSelectedFeedback(null);
                                            } else {
                                                alert("Errore durante l'eliminazione: " + error.message);
                                            }
                                        }
                                    }}
                                    className="px-4 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 font-black uppercase text-[10px] tracking-wider transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1"
                                    title="Elimina definitivo"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
