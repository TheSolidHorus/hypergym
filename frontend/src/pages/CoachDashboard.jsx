import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CoachDashboard() {
    const navigate = useNavigate();
    const { userProfile, logout } = useStore();

    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(true);

    // Data
    const [requests, setRequests] = useState([]);
    const [myAthletes, setMyAthletes] = useState([]);
    const [exerciseVideos, setExerciseVideos] = useState([]);
    const [stats, setStats] = useState({ requests: 0, athletes: 0, videos: 0 });

    // Notifiche scadenza schede
    const [expiryNotifications, setExpiryNotifications] = useState([]);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);

    // Video upload
    const [newVideoFile, setNewVideoFile] = useState(null);
    const [newVideoExerciseName, setNewVideoExerciseName] = useState('');
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [newRequestToast, setNewRequestToast] = useState(false);

    // Templates State
    const [templates, setTemplates] = useState([]);

    // Exercise Library State
    const [exerciseLibrary, setExerciseLibrary] = useState([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [newExercise, setNewExercise] = useState({ name: '', muscle_group: 'petto', description: '' });
    const [newExerciseVideoFile, setNewExerciseVideoFile] = useState(null);
    const [savingExercise, setSavingExercise] = useState(false);
    const [exerciseVideoPreview, setExerciseVideoPreview] = useState(null);
    const [libraryFilter, setLibraryFilter] = useState('');

    // ── Auth guard: aspetta che il ruolo sia caricato dal server prima di redirigere
    useEffect(() => {
        if (userProfile.role === undefined) return; // Aspetta caricamento ruolo
        if (userProfile.role !== 'trainer' && userProfile.role !== 'coach') {
            navigate('/');
        }
    }, [userProfile.role]);

    // ── Realtime: nuove richieste coaching
    useEffect(() => {
        const channel = supabase
            .channel('coach-requests')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coaching_requests' }, () => {
                fetchData();
                setNewRequestToast(true);
                setTimeout(() => setNewRequestToast(false), 6000);
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    // ── Realtime: nuove notifiche scadenza schede
    useEffect(() => {
        let coachId;
        supabase.auth.getUser().then(({ data }) => {
            coachId = data?.user?.id;
            if (!coachId) return;
            const ch = supabase
                .channel('coach-expiry-notifs')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'coach_notifications',
                    filter: `coach_id=eq.${coachId}`
                }, (payload) => {
                    setExpiryNotifications(prev => [payload.new, ...prev]);
                    setUnreadNotifCount(prev => prev + 1);
                })
                .subscribe();
            return () => supabase.removeChannel(ch);
        });
    }, []);

    // ── Fetch notifiche scadenza
    const fetchExpiryNotifications = async () => {
        const { data } = await supabase
            .from('coach_notifications')
            .select('*')
            .eq('type', 'plan_expiry')
            .order('created_at', { ascending: false })
            .limit(20);
        if (data) {
            setExpiryNotifications(data);
            setUnreadNotifCount(data.filter(n => !n.read).length);
        }
    };

    const markNotifRead = async (notifId) => {
        await supabase.from('coach_notifications').update({ read: true }).eq('id', notifId);
        setExpiryNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
        setUnreadNotifCount(prev => Math.max(0, prev - 1));
    };

    const markAllNotifsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('coach_notifications').update({ read: true }).eq('coach_id', user.id).eq('read', false);
        setExpiryNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadNotifCount(0);
    };

    // ── Fetch templates
    const fetchTemplates = async () => {
        const { data } = await supabase
            .from('workout_templates')
            .select('*')
            .order('created_at', { ascending: false });
        setTemplates(data || []);
    };

    const handleDeleteTemplate = async (templateId, templateName) => {
        if (!confirm(`Sei sicuro di voler eliminare definitivamente il modello "${templateName}"?`)) return;
        try {
            const { error } = await supabase.from('workout_templates').delete().eq('id', templateId);
            if (error) throw error;
            setTemplates(prev => prev.filter(t => t.id !== templateId));
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
                alert("Copia creata!");
            }
        } catch (err) {
            console.error("Duplicate template error:", err);
            alert("Errore duplicazione: " + err.message);
        }
    };

    const MUSCLE_GROUPS = [
        'petto', 'schiena', 'spalle', 'bicipiti', 'tricipiti',
        'gambe', 'glutei', 'addome', 'polpacci', 'full body', 'cardio'
    ];

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchData(); fetchExpiryNotifications(); fetchTemplates(); fetchExerciseLibrary(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: reqData } = await supabase
                .from('coaching_requests')
                .select('*')
                .eq('trainer_id', user.id)
                .neq('status', 'completed')
                .order('created_at', { ascending: false });

            let enrichedRequests = [];
            if (reqData && reqData.length > 0) {
                const userIds = [...new Set(reqData.map(r => r.user_id))];
                const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url, email').in('id', userIds);
                enrichedRequests = reqData.map(req => ({ ...req, user: profiles?.find(p => p.id === req.user_id) }));
            }

            const { data: athleteIds } = await supabase.from('coaching_requests').select('user_id').eq('trainer_id', user.id);
            let athletes = [];
            if (athleteIds && athleteIds.length > 0) {
                const ids = [...new Set(athleteIds.map(r => r.user_id))];
                const { data: athleteProfiles } = await supabase.from('profiles').select('*').in('id', ids);
                athletes = athleteProfiles || [];
            }

            const { data: videosData } = await supabase.from('exercise_videos').select('*').order('created_at', { ascending: false });

            setRequests(enrichedRequests);
            setMyAthletes(athletes);
            setExerciseVideos(videosData || []);
            setStats({
                requests: enrichedRequests.filter(r => r.status === 'pending').length,
                athletes: athletes.length,
                videos: videosData?.length || 0
            });
        } catch (e) {
            console.error("Coach fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRequest = async (id) => {
        if (!confirm("Vuoi cancellare questa richiesta?")) return;
        const { error } = await supabase.from('coaching_requests').delete().eq('id', id);
        if (!error) {
            setRequests(prev => prev.filter(r => r.id !== id));
            setStats(prev => ({ ...prev, requests: Math.max(0, prev.requests - 1) }));
        } else alert("Errore: " + error.message);
    };

    const handleMarkCompleted = async (id) => {
        const { error } = await supabase.from('coaching_requests').update({ status: 'completed' }).eq('id', id);
        if (!error) {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' } : r));
            setStats(prev => ({ ...prev, requests: Math.max(0, prev.requests - 1) }));
        }
    };

    const handleUploadVideo = async () => {
        if (!newVideoFile || !newVideoExerciseName.trim()) return alert("Inserisci nome esercizio e seleziona un video.");
        setUploadingVideo(true);
        try {
            const fileExt = newVideoFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('exercise-videos').upload(fileName, newVideoFile);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('exercise-videos').getPublicUrl(fileName);
            const { data: videoData, error: dbError } = await supabase
                .from('exercise_videos')
                .insert({ exercise_name: newVideoExerciseName, video_url: publicUrl, filename: fileName })
                .select().single();
            if (dbError) throw dbError;
            setExerciseVideos(prev => [videoData, ...prev]);
            setStats(prev => ({ ...prev, videos: prev.videos + 1 }));
            setNewVideoFile(null);
            setNewVideoExerciseName('');
            alert("✅ Video caricato con successo!");
        } catch (e) {
            alert("Errore upload: " + e.message);
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleDeleteVideo = async (video) => {
        if (!confirm(`Eliminare il video di ${video.exercise_name}?`)) return;
        let filename = video.filename || video.video_url?.split('/').pop();
        if (filename) await supabase.storage.from('exercise-videos').remove([filename]);
        const { error } = await supabase.from('exercise_videos').delete().eq('id', video.id);
        if (!error) {
            setExerciseVideos(prev => prev.filter(v => v.id !== video.id));
            setStats(prev => ({ ...prev, videos: prev.videos - 1 }));
        } else alert("Errore: " + error.message);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="w-10 h-10 rounded-full animate-spin border-4 border-slate-700" style={{ borderTopColor: '#ffffff' }} />
            </div>
        );
    }

    // ── RENDER CONTENT
    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        {/* Hero */}
                        <div>
                            <h1 className="text-4xl font-bold text-slate-900 uppercase leading-tight">
                                CIAO, {userProfile.name?.split(' ')[0]?.toUpperCase()}
                            </h1>
                            <p className="text-slate-500 mt-1 font-medium">Ecco un riepilogo della tua attività</p>
                        </div>

                    {/* ── Notifiche Scadenza Schede ─────────────────────────────── */}
                        {expiryNotifications.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-500 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                                        Avvisi Schede
                                        {unreadNotifCount > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{unreadNotifCount}</span>
                                        )}
                                    </h3>
                                    {unreadNotifCount > 0 && (
                                        <button onClick={markAllNotifsRead} className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-wider">
                                            Segna tutti letti
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {expiryNotifications.slice(0, 5).map(notif => {
                                        const d = notif.metadata?.days_left;
                                        const color = d <= 1
                                            ? { border: 'border-red-200', bg: 'bg-red-50', dot: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border-red-300' }
                                            : d <= 3
                                            ? { border: 'border-orange-200', bg: 'bg-orange-50', dot: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700 border-orange-300' }
                                            : { border: 'border-amber-200', bg: 'bg-amber-50', dot: 'bg-amber-400', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-300' };
                                        return (
                                            <div
                                                key={notif.id}
                                                onClick={() => !notif.read && markNotifRead(notif.id)}
                                                className={`${color.bg} border ${color.border} rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-opacity ${notif.read ? 'opacity-60' : 'opacity-100'}`}
                                            >
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${notif.read ? 'bg-slate-300' : color.dot}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-black text-sm ${notif.read ? 'text-slate-500' : 'text-slate-900'}`}>{notif.title}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(notif.created_at).toLocaleString('it-IT')}</p>
                                                </div>
                                                {!notif.read && (
                                                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${color.badge}`}>
                                                        Nuovo
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="glass-card rounded-xl p-5 flex items-center justify-between shadow-sm border-l-4 border-l-primary">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Richieste in attesa</p>
                                    <h3 className="text-4xl font-bold text-slate-900">{stats.requests}</h3>
                                </div>
                                <div className="bg-primary/10 p-3 rounded-lg">
                                    <span className="material-symbols-outlined text-primary text-3xl">chat</span>
                                </div>
                            </div>

                            <div className="glass-card rounded-xl p-5 flex items-center justify-between shadow-sm border-l-4 border-l-primary">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">I tuoi atleti</p>
                                    <h3 className="text-4xl font-bold text-slate-900">{stats.athletes}</h3>
                                </div>
                                <div className="bg-primary/10 p-3 rounded-lg">
                                    <span className="material-symbols-outlined text-primary text-3xl">group</span>
                                </div>
                            </div>

                            <div className="glass-card rounded-xl p-5 flex items-center justify-between shadow-sm border-l-4 border-l-primary">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Video Esercizi</p>
                                    <h3 className="text-4xl font-bold text-slate-900">{stats.videos}</h3>
                                </div>
                                <div className="bg-primary/10 p-3 rounded-lg">
                                    <span className="material-symbols-outlined text-primary text-3xl">play_circle</span>
                                </div>
                            </div>
                        </div>

                        {/* Latest Requests */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900">Ultime Richieste</h3>
                                <button onClick={() => setActiveTab('requests')} className="text-primary text-sm font-semibold hover:underline">Vedi tutte</button>
                            </div>

                            {requests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-6 bg-white/40 rounded-xl border-2 border-dashed border-primary/20">
                                    <div className="w-24 h-24 mb-4 bg-primary/5 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary/40 text-5xl">inbox</span>
                                    </div>
                                    <p className="text-slate-600 font-medium">Nessuna nuova richiesta</p>
                                    <p className="text-slate-400 text-xs mt-1 text-center">Ti avviseremo quando un nuovo atleta vorrà allenarsi con te.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {requests.slice(0, 5).map(req => (
                                        <div key={req.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                    {req.user?.name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{req.user?.name || 'Utente'}</p>
                                                    <p className="text-xs text-slate-400">{req.location === 'home' ? '🏠 Casa' : '🏋️ Palestra'}</p>
                                                </div>
                                            </div>
                                            {req.status === 'pending'
                                                ? <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">In Attesa</span>
                                                : <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase rounded border border-green-200">Completata</span>
                                            }
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Quick Action */}
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={() => navigate('/plans/new')}
                                className="bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-full flex items-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined">add</span>
                                NUOVO PROGRAMMA
                            </button>
                        </div>
                    </div>
                );

            case 'requests':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <h2 className="text-2xl font-bold text-slate-900 uppercase">Richieste Schede</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {requests.map(req => (
                                <div key={req.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg text-primary flex-shrink-0">
                                            {req.user?.name?.[0] || '?'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-slate-900 text-base">{req.user?.name || 'Utente'}</h3>
                                                {req.status === 'pending' && <span className="w-2 h-2 rounded-full animate-pulse bg-primary inline-block" />}
                                            </div>
                                            <p className="text-slate-500 text-sm mt-0.5">
                                                Richiesta per <span className="font-bold text-slate-700">{req.location === 'home' ? '🏠 Casa' : '🏋️ Palestra'}</span>
                                            </p>
                                            {req.details && (
                                                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 mt-2 max-w-md">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {req.details.goal && <p><strong className="text-slate-400 uppercase text-[10px]">Obiettivo:</strong><br /><span className="text-slate-700 capitalize">{req.details.goal}</span></p>}
                                                        {req.details.days && <p><strong className="text-slate-400 uppercase text-[10px]">Frequenza:</strong><br /><span className="text-slate-700">{req.details.days} gg/sett</span></p>}
                                                    </div>
                                                    {req.details.injuries && <p className="pt-2 border-t border-slate-200"><strong className="text-red-400 uppercase text-[10px]">Infortuni:</strong><br /><span className="text-slate-600">{req.details.injuries}</span></p>}
                                                    {req.details.notes && <p className="pt-2 border-t border-slate-200"><strong className="text-slate-400 uppercase text-[10px]">Note:</strong><br /><span className="text-slate-600">{req.details.notes}</span></p>}
                                                </div>
                                            )}
                                            <p className="text-[10px] text-slate-400 font-mono mt-1">{new Date(req.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto flex-wrap">
                                        <button onClick={() => handleDeleteRequest(req.id)} className="p-3 bg-red-50 text-red-500 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                        <button
                                            onClick={() => navigate(`/plans/new?userId=${req.user_id}&requestId=${req.id}`)}
                                            className="px-4 py-3 font-bold uppercase text-xs rounded-xl flex items-center gap-2 transition-all text-white bg-primary shadow-lg shadow-primary/20"
                                        >
                                            <span className="material-symbols-outlined text-sm">fitness_center</span> Crea Scheda
                                        </button>
                                        <button
                                            onClick={() => navigate(`/chat/${req.user_id}`)}
                                            className="px-4 py-3 bg-slate-100 text-slate-700 font-bold uppercase text-xs rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-sm">chat</span> Chat
                                        </button>
                                        {req.status === 'pending' && (
                                            <button
                                                onClick={() => handleMarkCompleted(req.id)}
                                                className="px-4 py-3 bg-green-50 text-green-600 border border-green-200 font-bold uppercase text-xs rounded-xl hover:bg-green-100 transition-colors flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">check_circle</span> Completa
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {requests.length === 0 && (
                                <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl text-slate-400">
                                    Nessuna richiesta assegnata a te.
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'athletes':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <h2 className="text-2xl font-bold text-slate-900 uppercase">Miei Atleti</h2>
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Atleta</th>
                                            <th className="px-6 py-4">Email</th>
                                            <th className="px-6 py-4 text-right">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {myAthletes.map(athlete => (
                                            <tr key={athlete.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                            {athlete.name?.[0] || '?'}
                                                        </div>
                                                        <span className="font-bold text-slate-900 text-sm">{athlete.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{athlete.email}</td>
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/plans/new?userId=${athlete.id}`)}
                                                        className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold uppercase rounded-lg transition-colors"
                                                    >
                                                        Scheda
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/profile/${athlete.id}`)}
                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-lg transition-colors"
                                                    >
                                                        Profilo
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/chat/${athlete.id}`)}
                                                        className="p-1.5 bg-slate-100 text-slate-400 hover:text-primary rounded-lg transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">chat</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {myAthletes.length === 0 && (
                                            <tr><td colSpan="3" className="p-8 text-center text-slate-400 text-sm">Nessun atleta assegnato.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );

            case 'programs':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        <h2 className="text-2xl font-bold text-slate-900 uppercase">Video Esercizi</h2>

                        {/* Upload Form */}
                        <div className="bg-white rounded-xl border border-primary/20 p-6 space-y-4 shadow-sm">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">upload</span> Carica Nuovo Video
                            </h3>
                            <div className="flex flex-col md:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="Nome esercizio (es. Squat)"
                                    value={newVideoExerciseName}
                                    onChange={e => setNewVideoExerciseName(e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-primary placeholder-slate-400"
                                />
                                <label className="flex-1 md:flex-none cursor-pointer">
                                    <div className="bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-4 py-3 text-sm font-medium hover:border-primary transition-colors flex items-center gap-2 justify-center">
                                        <span className="material-symbols-outlined text-sm">movie</span>
                                        {newVideoFile ? newVideoFile.name.substring(0, 20) + '...' : 'Scegli video'}
                                    </div>
                                    <input type="file" accept="video/*" onChange={e => setNewVideoFile(e.target.files[0])} className="hidden" />
                                </label>
                                <button
                                    onClick={handleUploadVideo}
                                    disabled={uploadingVideo}
                                    className="px-6 py-3 font-bold uppercase text-sm rounded-xl text-white bg-primary disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                                >
                                    {uploadingVideo ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Carico...</> : <><span className="material-symbols-outlined text-sm">upload</span> Carica</>}
                                </button>
                            </div>
                        </div>

                        {/* Video Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {exerciseVideos.map(video => (
                                <div key={video.id} className="rounded-xl border border-slate-100 bg-white overflow-hidden group shadow-sm">
                                    <div className="relative aspect-video bg-slate-100">
                                        <video src={video.video_url} className="w-full h-full object-cover" muted />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                            <span className="material-symbols-outlined text-white text-4xl">play_circle</span>
                                        </div>
                                    </div>
                                    <div className="p-4 flex items-center justify-between">
                                        <p className="font-bold text-slate-900 text-sm truncate">{video.exercise_name}</p>
                                        <button onClick={() => handleDeleteVideo(video)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors ml-2 flex-shrink-0">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {exerciseVideos.length === 0 && (
                                <div className="col-span-3 p-12 text-center border border-dashed border-slate-200 rounded-xl text-slate-400">
                                    Nessun video caricato.
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'templates':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-end mb-6 border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 uppercase">Archivio Schede</h2>
                                <p className="text-slate-500 text-xs font-semibold mt-1">Schede pre-impostate rapide</p>
                            </div>
                            <button
                                onClick={() => navigate('/plans/new?isTemplate=true')}
                                className="bg-primary text-white px-5 py-2.5 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-primary/20"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span> Nuovo Modello
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {templates.map(tpl => (
                                <div key={tpl.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-primary/30 transition-all shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-xl text-slate-900 uppercase italic tracking-tighter w-[85%]">{tpl.name}</h3>
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
                                            <button
                                                onClick={() => handleDuplicateTemplate(tpl)}
                                                className="text-slate-400 hover:text-blue-500 flex items-center gap-1 text-[10px] uppercase font-bold transition-colors"
                                                title="Copia Modello"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                Copia
                                            </button>
                                            <button
                                                onClick={() => navigate(`/plans/new?tplId=${tpl.id}&isTemplate=true`)}
                                                className="text-primary hover:text-primary/70 flex items-center gap-1 text-[10px] uppercase font-bold transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                                Modifica
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                                                className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-[10px] uppercase font-bold transition-colors"
                                                title="Elimina Modello"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">inventory_2</span>
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Nessun modello creato.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'exercises': {
                const muscleGroups = [...new Set(exerciseLibrary.map(e => e.muscle_group))].sort();
                const filteredLibrary = exerciseLibrary.filter(e =>
                    !libraryFilter || e.muscle_group === libraryFilter
                );
                return (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 uppercase">Archivio Esercizi</h2>
                                <p className="text-slate-500 text-xs font-semibold mt-1">{exerciseLibrary.length} esercizi nell&apos;archivio</p>
                            </div>
                        </div>

                        {/* Form aggiungi esercizio */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-primary">Aggiungi Nuovo Esercizio</h3>

                            <div className="grid grid-cols-1 gap-4">
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
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors truncate">
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
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border flex-shrink-0 ${!libraryFilter ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                            >
                                Tutti ({exerciseLibrary.length})
                            </button>
                            {muscleGroups.map(g => (
                                <button
                                    key={g}
                                    onClick={() => setLibraryFilter(g)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border flex-shrink-0 ${libraryFilter === g ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                >
                                    {g.charAt(0).toUpperCase() + g.slice(1)} ({exerciseLibrary.filter(e => e.muscle_group === g).length})
                                </button>
                            ))}
                        </div>

                        {/* Lista esercizi */}
                        {loadingLibrary ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-10 h-10 rounded-full animate-spin border-4 border-slate-700" style={{ borderTopColor: '#ffffff' }} />
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
                                                    <h3 className="font-bold text-slate-900 uppercase text-sm tracking-tight">{ex.name}</h3>
                                                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded border border-primary/20">
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

            default:
                return null;
        }
    };


    // ✅ FIX: Spinner mentre il ruolo è ancora undefined
    if (userProfile.role === undefined) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="w-10 h-10 rounded-full animate-spin border-4 border-slate-700" style={{ borderTopColor: '#ffffff' }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-slate-900 font-display flex flex-col">
            {/* ✅ FIX: Toast non-bloccante per nuove richieste (sostituisce alert()) */}
            {newRequestToast && (
                <div className="fixed top-4 right-4 z-[99999] flex items-center gap-3 bg-white border border-primary/30 rounded-2xl shadow-xl px-4 py-3 animate-in slide-in-from-top-2">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <p className="font-black text-slate-900 text-sm">Nuova richiesta di scheda!</p>
                        <p className="text-slate-500 text-xs font-medium">Controlla la sezione Richieste</p>
                    </div>
                    <button onClick={() => setNewRequestToast(false)} className="ml-2 text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}
            {/* Header */}
            <header className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-primary/10">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary">
                        {userProfile.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="Coach" className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-bold text-primary text-sm">{userProfile.name?.[0]}</span>
                        )}
                    </div>
                    <h2 className="text-foreground text-xl font-black uppercase tracking-wider">HYPER</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/notifications')} className="p-2 rounded-full hover:bg-primary/10 text-slate-700 transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-primary/10 text-slate-700 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <button onClick={handleLogout} className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full pb-24">
                {renderContent()}
            </main>

            {/* Bottom Nav */}
            <nav className="sticky bottom-0 w-full bg-white border-t border-primary/10 px-6 py-3 pb-6">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-primary' : 'text-slate-400 hover:text-primary'} transition-colors`}>
                        <span className="material-symbols-outlined" style={activeTab === 'home' ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">Home</span>
                    </button>
                    <button onClick={() => setActiveTab('athletes')} className={`flex flex-col items-center gap-1 ${activeTab === 'athletes' ? 'text-primary' : 'text-slate-400 hover:text-primary'} transition-colors`}>
                        <span className="material-symbols-outlined">group</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">Atleti</span>
                    </button>
                    <button onClick={() => setActiveTab('requests')} className={`flex flex-col items-center gap-1 ${activeTab === 'requests' ? 'text-primary' : 'text-slate-400 hover:text-primary'} transition-colors`}>
                        <span className="material-symbols-outlined">list_alt</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">Richieste</span>
                    </button>
                    <button onClick={() => setActiveTab('templates')} className={`flex flex-col items-center gap-1 ${activeTab === 'templates' ? 'text-primary' : 'text-slate-400 hover:text-primary'} transition-colors`}>
                        <span className="material-symbols-outlined" style={activeTab === 'templates' ? { fontVariationSettings: "'FILL' 1" } : {}}>fitness_center</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">Modelli</span>
                    </button>
                    <button onClick={() => setActiveTab('exercises')} className={`flex flex-col items-center gap-1 ${activeTab === 'exercises' ? 'text-primary' : 'text-slate-400 hover:text-primary'} transition-colors`}>
                        <span className="material-symbols-outlined" style={activeTab === 'exercises' ? { fontVariationSettings: "'FILL' 1" } : {}}>exercise</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">Esercizi</span>
                    </button>
                    <button onClick={() => setActiveTab('programs')} className={`flex flex-col items-center gap-1 ${activeTab === 'programs' ? 'text-primary' : 'text-slate-400 hover:text-primary'} transition-colors`}>
                        <span className="material-symbols-outlined">person</span>
                        <span className="text-[10px] font-bold uppercase tracking-tight">Video</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
