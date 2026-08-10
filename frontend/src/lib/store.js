import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

// ─── BADGE THRESHOLDS (esportata come costante, non dentro lo store) ───────────
export const BADGE_THRESHOLDS = {
    panca: [
        { level: 'bronze', weight: 60, emoji: '🥉' },
        { level: 'silver', weight: 80, emoji: '🥈' },
        { level: 'gold', weight: 100, emoji: '🥇' },
        { level: 'platinum', weight: 150, emoji: '💎' }
    ],
    squat: [
        { level: 'bronze', weight: 100, emoji: '🥉' },
        { level: 'silver', weight: 120, emoji: '🥈' },
        { level: 'gold', weight: 160, emoji: '🥇' },
        { level: 'platinum', weight: 200, emoji: '💎' }
    ],
    stacco: [
        { level: 'bronze', weight: 80, emoji: '🥉' },
        { level: 'silver', weight: 100, emoji: '🥈' },
        { level: 'gold', weight: 150, emoji: '🥇' },
        { level: 'platinum', weight: 200, emoji: '💎' }
    ]
};



export const useStore = create(
    persist(
        (set, get) => ({
            // AUTH
            isRegistered: false,
            authToken: null,

            // PROFILO UTENTE
            userProfile: {
                name: "",
                email: "",
                phone: "",
                trainingDaysGoal: 3,
                streak: 0,
                workoutsCompleted: 0,
                tonnage: 0,
                createdAt: null
            },

            // CERTIFICATO MEDICO
            medicalCertificate: {
                uploaded: false,
                fileName: null,
                uploadedAt: null,
                expiresAt: null,
                fileData: null
            },

            // SCHEDE (PLANS)
            plans: [],
            // STORICO
            history: [],
            // WORKOUT ATTIVO
            activeWorkout: null,
            // BADGES/ACHIEVEMENTS
            badges: [],
            newBadges: [], // Badge appena sbloccati (per animazione)
            // VIDEO ESERCIZI
            exerciseVideos: [],
            // SYNC
            lastSyncAt: null,
            // NOTIFICHE
            notifications: [],
            // IMPOSTAZIONI APP
            isDarkMode: true,
            // BROADCASTS (comunicazioni admin)
            broadcasts: [],        // comunicazioni non ancora lette
            readBroadcastIds: [],  // IDs già letti (per popup - persistito per non riaprire)
            // WEARABLE & SALUTE
            isHealthConnected: false,
            healthData: null,

            // === APP SETTINGS ACTIONS ===
            toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

            // === WEARABLE ACTIONS ===

            // Richiede permesso e connette Apple Health/Google Fit
            connectHealth: async () => {
                const { default: HealthAdapter } = await import('./healthAdapter.js');
                const granted = await HealthAdapter.requestPermissions();
                if (granted) {
                    set({ isHealthConnected: true });
                    await get().syncHealthData(); // Sincronizza subito i primi dati
                    return true;
                }
                return false;
            },

            // Scollega i wearables
            disconnectHealth: () => set({ isHealthConnected: false, healthData: null }),

            // Legge i passi / recovery della giornata
            syncHealthData: async () => {
                const isConnected = get().isHealthConnected;
                if (!isConnected) return;

                const { default: HealthAdapter } = await import('./healthAdapter.js');
                const data = await HealthAdapter.getDailyStats();
                if (data) {
                    set({ healthData: data });
                }
            },

            // === BROADCAST ACTIONS ===

            // Scarica le comunicazioni destinate a questo utente (non ancora scadute per lettura)
            fetchBroadcasts: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Recupera il ruolo dell'utente
                const myRole = get().userProfile?.role || 'client';

                // Recupera i broadcast già letti da più di 3 giorni
                const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

                // Leggi i propri record di lettura
                const { data: reads } = await supabase
                    .from('broadcast_reads')
                    .select('broadcast_id, read_at')
                    .eq('user_id', user.id);

                // IDs da escludere: letti da più di 3 giorni
                const expiredIds = (reads || [])
                    .filter(r => new Date(r.read_at) < new Date(threeDaysAgo))
                    .map(r => r.broadcast_id);

                // Tutti gli IDs già letti (per non mostrare popup)
                const allReadIds = (reads || []).map(r => r.broadcast_id);

                // Determina il target in base al ruolo
                const targetFilter = myRole === 'trainer' ? ['all', 'trainers'] : ['all', 'clients'];

                // Fetch broadcasts
                let query = supabase
                    .from('broadcasts')
                    .select('*')
                    .in('target', targetFilter)
                    .order('created_at', { ascending: false });

                // Escludi quelli scaduti (letti da più di 3 giorni)
                if (expiredIds.length > 0) {
                    query = query.not('id', 'in', `(${expiredIds.join(',')})`);
                }

                const { data, error } = await query;
                if (error) { console.error('[Broadcasts] Fetch error:', error.message); return; }

                // Filtra lato client: mostra nel popup solo quelli NON ancora letti
                const unread = (data || []).filter(b => !allReadIds.includes(b.id));

                set({ broadcasts: unread, readBroadcastIds: allReadIds });
            },

            // Segna una comunicazione come letta
            markBroadcastRead: async (broadcastId) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Aggiorna UI immediatamente
                set(state => ({
                    broadcasts: state.broadcasts.filter(b => b.id !== broadcastId),
                    readBroadcastIds: [...state.readBroadcastIds, broadcastId]
                }));

                // Salva su DB (upsert sicuro: se già esiste non va in errore)
                await supabase.from('broadcast_reads').upsert({
                    broadcast_id: broadcastId,
                    user_id: user.id,
                    read_at: new Date().toISOString()
                }, { onConflict: 'broadcast_id,user_id' });
            },

            // Admin: invia una nuova comunicazione
            sendBroadcast: async (payload) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return { error: { message: 'Non autenticato' } };

                const { error } = await supabase.from('broadcasts').insert({
                    created_by: user.id,
                    title: payload.title.trim(),
                    message: payload.message.trim(),
                    image_url: payload.image_url || null,
                    type: payload.type || 'annuncio',
                    target: payload.target || 'all'
                });

                return { error };
            },

            // === AUTH ACTIONS ===

            // Registrazione (dopo verifica OTP)
            register: (data) => {
                set({
                    isRegistered: true,
                    authToken: data.token || null,
                    userProfile: {
                        ...get().userProfile,
                        name: data.name,
                        email: data.email || "",
                        phone: data.phone || "",
                        createdAt: new Date().toISOString(),
                        // Recupera dati dal server se disponibili
                        ...(data.serverUser ? {
                            workoutsCompleted: data.serverUser.workouts_completed || 0,
                            streak: data.serverUser.streak || 0,
                            trainingDaysGoal: data.serverUser.training_days_goal || 3,
                        } : {})
                    },
                    medicalCertificate: data.serverUser?.certificate_uploaded ? {
                        uploaded: true,
                        fileName: data.serverUser.certificate_filename,
                        uploadedAt: null,
                        expiresAt: data.serverUser.certificate_expires_at,
                        fileData: null
                    } : get().medicalCertificate
                });
                setTimeout(() => get().syncToServer(), 1000);
            },

            // Login dal server (recupera dati account)

            // Login dal server (recupera dati account)
            loginFromServer: (data) => {
                const user = data.user;
                set({
                    isRegistered: true,
                    authToken: data.access_token,
                    userProfile: {
                        name: user.name,
                        email: user.email || "",
                        phone: user.phone || "",
                        avatarUrl: user.avatar_url || null,
                        trainingDaysGoal: user.training_days_goal || 3,
                        streak: user.streak || 0,
                        workoutsCompleted: user.workouts_completed || 0,
                        tonnage: 0,
                        createdAt: new Date().toISOString()
                    },
                    medicalCertificate: user.certificate_uploaded ? {
                        uploaded: true,
                        fileName: user.certificate_filename,
                        uploadedAt: null,
                        expiresAt: user.certificate_expires_at,
                        fileData: null
                    } : {
                        uploaded: false,
                        fileName: null,
                        uploadedAt: null,
                        expiresAt: null,
                        fileData: null
                    }
                });

                // Scarica dati aggiuntivi (schede, storico)
                get().fetchUserData();
            },

            // Scarica schede e storico da Supabase
            fetchUserData: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 0. ⚡ FETCH ROLE VIA RPC (CRITICO PER ADMIN - NO FLICKER)
                try {
                    const { data: roleData, error: roleError } = await supabase.rpc('get_my_role');
                    if (roleError) console.warn("RPC get_my_role error:", roleError);

                    // Check email verified status
                    const emailVerified = !!user.email_confirmed_at;

                    if (roleData || emailVerified !== undefined) {
                        set(state => ({
                            userProfile: {
                                ...state.userProfile,
                                ...(roleData ? { role: roleData } : {}),
                                emailVerified: emailVerified
                            }
                        }));
                    }
                } catch (e) { console.error("Role/Email fetch error:", e); }

                // 1. Scarica Schede PERSONALI (Create dall'utente)
                let myPlans = [];
                const { data: plansData, error: plansError } = await supabase
                    .from('workout_plans')
                    .select('*')
                    .eq('user_id', user.id); // Solo schede create dall'utente

                if (!plansError && plansData) {
                    myPlans = plansData.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        exercises: p.exercises,
                        lastPerformed: p.last_performed,
                        isAssigned: false // Flag per UI
                    }));
                }

                // 1b. Scarica Schede ASSEGNATE (Dal Trainer)
                let assignedPlans = [];
                const { data: assignedData, error: assignedError } = await supabase
                    .from('assigned_workouts')
                    .select(`
                        plan_id,
                        workout_plans!inner (*)
                    `)
                    .eq('client_id', user.id);

                if (!assignedError && assignedData) {
                    assignedPlans = assignedData
                        .map(item => item.workout_plans)
                        .filter(p => p !== null)
                        .map(p => ({
                            id: p.id,
                            name: `📋 ${p.name}`, // Emoji per distinguere
                            description: p.description || "Scheda assegnata dal Trainer",
                            exercises: p.exercises,
                            lastPerformed: p.last_performed,
                            isAssigned: true // Flag per UI
                        }));
                }

                // Unisci le due liste (senza duplicati se per caso coincidono)
                const allPlans = [...myPlans, ...assignedPlans];
                // Rimuovi duplicati per ID
                const uniquePlans = Array.from(new Map(allPlans.map(item => [item.id, item])).values());

                set({ plans: uniquePlans });

                // 2. Scarica Storico (History)
                const { data: history, error: historyError } = await supabase
                    .from('workout_history')
                    .select('*')
                    .order('completed_at', { ascending: false })
                    .limit(1000);

                if (!historyError && history) {
                    set({
                        history: history.map(h => ({
                            id: h.id,
                            name: h.plan_name,
                            planName: h.plan_name,
                            startedAt: h.started_at,
                            completedAt: h.completed_at,
                            date: h.completed_at,
                            duration: (new Date(h.completed_at) - new Date(h.started_at)) / 1000 / 60,
                            tonnage: h.total_tonnage || 0,
                            exercises: h.exercises
                        }))
                    });
                }

                // 3. Scarica Badges
                const { data: badges, error: badgesError } = await supabase
                    .from('achievements')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('achieved_at', { ascending: false });

                if (!badgesError && badges) {
                    set({ badges });
                }

                // 4. Scarica Video Esercizi (cache locale)
                await get().fetchExerciseVideos();

                // 5. Scarica Notifiche (Non lette)
                get().fetchNotifications();
            },

            // Scarica Notifiche
            fetchNotifications: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id) // Solo le mie
                    .eq('read', false)      // Solo non lette
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    set({ notifications: data });
                }
            },

            // Segna TUTTE le notifiche come lette
            markNotificationsRead: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                set({ notifications: [] }); // Pulisci UI subito

                await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('user_id', user.id);
            },

            // Segna UNA notifica come letta
            markNotificationRead: async (id) => {
                set(state => ({
                    notifications: state.notifications.filter(n => n.id !== id)
                }));

                await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('id', id);
            },

            // Scarica tutti i video esercizi da Supabase
            fetchExerciseVideos: async () => {
                const { data: videos, error } = await supabase
                    .from('exercise_videos')
                    .select('*');

                if (!error && videos) {
                    set({ exerciseVideos: videos });
                }
            },

            // Cerca video per nome esercizio (fuzzy match)
            getVideoForExercise: (exerciseName) => {
                const videos = get().exerciseVideos;
                if (!exerciseName || videos.length === 0) return null;

                const searchTerm = exerciseName.trim().toLowerCase();

                // Cerca match esatto
                let match = videos.find(v =>
                    v.exercise_name.toLowerCase() === searchTerm
                );

                // Se non trova, cerca match parziale (più flessibile)
                if (!match) {
                    match = videos.find(v =>
                        v.exercise_name.toLowerCase().includes(searchTerm) ||
                        searchTerm.includes(v.exercise_name.toLowerCase())
                    );
                }

                // Log per debug
                if (match) {
                    console.log(`[HYPER] Video trovato: "${exerciseName}" -> "${match.exercise_name}"`);
                } else {
                    console.warn(`[HYPER] Video NON trovato: "${exerciseName}"`);
                }

                return match;
            },


            updateProfile: async (data) => {
                set((state) => ({
                    userProfile: { ...state.userProfile, ...data }
                }));

                // Mappa i campi per il DB
                const dbUpdates = {};
                if (data.name !== undefined) dbUpdates.name = data.name;
                if (data.trainingDaysGoal !== undefined) dbUpdates.training_days_goal = data.trainingDaysGoal;
                if (data.streak !== undefined) dbUpdates.streak = data.streak;
                if (data.workoutsCompleted !== undefined) dbUpdates.workouts_completed = data.workoutsCompleted;
                if (data.phone !== undefined) dbUpdates.phone = data.phone;

                if (Object.keys(dbUpdates).length === 0) return;

                // Aggiorna su Supabase
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
                }
            },


            // === SYNC ===
            // Non serve più un sync manuale costante, aggiorniamo puntualmente
            syncToServer: async () => {
                // Legacy support
                get().fetchUserData();
            },

            // === SCHEDE ===

            // === SCHEDE ===
            addPlan: async (plan, targetUserId = null) => {
                const newPlan = { ...plan, id: crypto.randomUUID(), lastPerformed: null };

                const { data: { user } } = await supabase.auth.getUser();

                // Aggiorna UI ottimisticamente (SOLO SE E' PER ME)
                if (!targetUserId || (user && targetUserId === user.id)) {
                    set((state) => ({
                        plans: [...state.plans, newPlan]
                    }));
                }

                // Salva su Supabase
                if (user) {
                    const { error } = await supabase.from('workout_plans').insert({
                        id: newPlan.id,
                        user_id: targetUserId || user.id,
                        created_by: user.id,
                        name: newPlan.name,
                        description: newPlan.description || "",
                        days: newPlan.days,
                        duration_weeks: newPlan.durationWeeks || 4,
                        exercises: newPlan.exercises
                    });

                    if (error) {
                        console.error("ERRORE CREAZIONE SCHEDA:", error);
                        // Revert optimistic update if needed (omitted for simplicity, but good practice)
                        return { error };
                    }

                    // 🔔 NOTIFICA E RECORD ASSEGNAZIONE
                    if (targetUserId && targetUserId !== user.id) {
                        // Inserisci in assigned_workouts
                        await supabase.from('assigned_workouts').insert({
                            plan_id: newPlan.id,
                            client_id: targetUserId,
                            trainer_id: user.id
                        });

                        const { error: notifError } = await supabase.from('notifications').insert({
                            user_id: targetUserId,
                            type: 'plan_assigned',
                            title: 'Nuova Scheda!',
                            message: `Il coach ti ha assegnato la scheda "${newPlan.name}".`,
                            data: { plan_id: newPlan.id }
                        });
                        if (notifError) console.error("ERRORE INVIO NOTIFICA:", notifError);
                    }
                    return { success: true };
                }
                return { error: "Utente non autenticato" };
            },

            updatePlan: async (planId, planData) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return { error: { message: "Non autenticato" } };

                const { error } = await supabase.from('workout_plans').update({
                    name: planData.name,
                    days: planData.days,
                    duration_weeks: planData.durationWeeks || 4,
                    exercises: planData.exercises
                }).eq('id', planId).eq('created_by', user.id);

                if (!error) {
                    set((state) => ({
                        plans: state.plans.map(p => p.id === planId ? { ...p, ...planData, exercises: planData.exercises } : p)
                    }));
                }
                return { error };
            },

            deletePlan: async (planId) => {
                // Aggiorna UI
                set((state) => ({
                    plans: state.plans.filter(p => p.id !== planId)
                }));

                // Elimina da Supabase
                await supabase.from('workout_plans').delete().eq('id', planId);
            },

            deleteHistoryItem: async (historyId) => {
                const { error } = await supabase
                    .from('workout_history')
                    .delete()
                    .eq('id', historyId);

                if (!error) {
                    set((state) => ({
                        history: state.history.filter(h => h.id !== historyId)
                    }));
                }
            },

            // === WORKOUT ===
            startWorkout: (planId, dayIndex = null) => {
                const plan = get().plans.find(p => p.id === planId);
                if (!plan) return;

                let exercisesToLoad = plan.exercises || [];
                let sessionName = plan.name;

                // DETECT SPLIT PLAN (Multi-Day)
                // Check if the first item has a nested 'exercises' array
                const isSplit = exercisesToLoad.length > 0 && exercisesToLoad[0].exercises && Array.isArray(exercisesToLoad[0].exercises);

                if (isSplit) {
                    if (dayIndex === null || dayIndex === undefined) {
                        console.error("Plan is split routine but no day selected");
                        return;
                    }
                    const selectedDay = exercisesToLoad[dayIndex];
                    if (selectedDay) {
                        exercisesToLoad = selectedDay.exercises || [];
                        sessionName = `${plan.name} - ${selectedDay.name}`;
                    }
                }

                const history = get().history || [];

                const newWorkout = {
                    planId: plan.id,
                    name: sessionName,
                    startedAt: new Date().toISOString(),
                    exercises: exercisesToLoad.map(ex => {
                        // Trova l'ultima nota inserita per questo esercizio
                        let prevNote = '';
                        for (const session of history) {
                            const foundEx = session.exercises?.find(e => e.name === ex.name);
                            if (foundEx && foundEx.notes) {
                                prevNote = foundEx.notes;
                                break;
                            }
                        }

                        return {
                            name: ex.name,
                            sets: ex.sets,
                            reps: ex.reps,
                            notes: prevNote, // Pre-compila l'ultima nota
                            setsData: Array.from({ length: parseInt(ex.sets) || 3 }, () => ({ kg: '', reps: '', rpe: '', done: false }))
                        };
                    })
                };

                set({ activeWorkout: newWorkout });

                // ✅ Backup in localStorage (offline resilience)
                try {
                    localStorage.setItem('hypergym_active_workout_backup', JSON.stringify(newWorkout));
                } catch (e) {
                    console.warn("Could not save workout backup:", e);
                }
            },

            finishWorkout: async (feeling = null) => {
                const session = get().activeWorkout;
                if (!session) return;

                const completedSession = {
                    ...session,
                    completedAt: new Date().toISOString(),
                    feeling: feeling // Aggiungo al locale
                };

                // Calcola se lo streak va incrementato (solo se non c'è già un workout oggi)
                const today = new Date().toDateString();
                const lastWorkoutDate = get().history[0]?.completedAt
                    ? new Date(get().history[0].completedAt).toDateString()
                    : null;
                const shouldIncrementStreak = lastWorkoutDate !== today;

                // Aggiorna UI
                set((state) => ({
                    history: [completedSession, ...state.history],
                    activeWorkout: null,
                    userProfile: {
                        ...state.userProfile,
                        streak: shouldIncrementStreak ? state.userProfile.streak + 1 : state.userProfile.streak,
                        workoutsCompleted: state.userProfile.workoutsCompleted + 1
                    }
                }));

                // Salva su Supabase
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // 1. Salva in workout_history
                    const totalReps = session.exercises.reduce((acc, ex) =>
                        acc + ex.setsData.filter(s => s.done).reduce((sAcc, s) => sAcc + (parseInt(s.reps) || 0), 0), 0);
                    const totalTonnage = session.exercises.reduce((acc, ex) =>
                        acc + ex.setsData.filter(s => s.done).reduce((sAcc, s) => sAcc + ((parseInt(s.kg) || 0) * (parseInt(s.reps) || 0)), 0), 0);
                    const totalSets = session.exercises.reduce((acc, ex) =>
                        acc + ex.setsData.filter(s => s.done).length, 0);

                    await supabase.from('workout_history').insert({
                        user_id: user.id,
                        plan_id: session.planId,
                        plan_name: session.name,
                        started_at: session.startedAt,
                        completed_at: completedSession.completedAt,
                        exercises: session.exercises,
                        total_sets: totalSets,
                        total_reps: totalReps,
                        total_tonnage: totalTonnage,
                        feeling: feeling // Salvataggio DB 
                    });

                    // 2. Aggiorna profilo (streak, workouts) - usando rpc increment o update
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('streak, workouts_completed')
                        .eq('id', user.id)
                        .single();

                    if (profile) {
                        // Controlla l'ultimo workout nel DB per evitare streak doppi nello stesso giorno
                        const { data: lastHistory } = await supabase
                            .from('workout_history')
                            .select('completed_at')
                            .eq('user_id', user.id)
                            .order('completed_at', { ascending: false })
                            .limit(2); // limit 2: il primo è quello appena inserito

                        const prevWorkout = lastHistory?.[1]; // Il secondo è il penultimo
                        const alreadyTodayOnDB = prevWorkout &&
                            new Date(prevWorkout.completed_at).toDateString() === new Date().toDateString();

                        await supabase.from('profiles').update({
                            streak: alreadyTodayOnDB ? profile.streak : profile.streak + 1,
                            workouts_completed: profile.workouts_completed + 1
                        }).eq('id', user.id);
                    }

                    // 3. Aggiorna last_performed nel plan
                    await supabase.from('workout_plans').update({
                        last_performed: completedSession.completedAt
                    }).eq('id', session.planId);

                    // 4. Controlla e assegna Badge
                    await get().checkAndAwardBadges(session);

                    // ✅ Rimuovi backup localStorage dopo successo
                    try {
                        localStorage.removeItem('hypergym_active_workout_backup');
                    } catch (e) {
                        console.warn("Could not remove workout backup:", e);
                    }
                }
            },



            cancelWorkout: () => {
                set({ activeWorkout: null });

                // ✅ Rimuovi backup se workout cancellato
                try {
                    localStorage.removeItem('hypergym_active_workout_backup');
                } catch (e) {
                    console.warn("Could not remove workout backup:", e);
                }
            },

            updateSet: (exIndex, setIndex, data) => set((state) => {
                const workout = { ...state.activeWorkout };
                workout.exercises[exIndex].setsData[setIndex] = {
                    ...workout.exercises[exIndex].setsData[setIndex], ...data
                };
                return { activeWorkout: workout };
            }),

            updateExerciseNote: (exIndex, notes) => set((state) => {
                const workout = { ...state.activeWorkout };
                workout.exercises[exIndex].notes = notes;
                
                // Backup locale ogni volta che si scrive una nota
                try { 
                    localStorage.setItem('hypergym_active_workout_backup', JSON.stringify(workout)); 
                } catch(e) { 
                    console.debug("Backup note error", e); 
                }

                return { activeWorkout: workout };
            }),

            // Aggiungi un set extra a un esercizio
            addSet: (exIndex) => set((state) => {
                const workout = { ...state.activeWorkout };
                workout.exercises[exIndex].setsData.push({ kg: 0, reps: 0, rpe: 0, done: false });
                workout.exercises[exIndex].sets = workout.exercises[exIndex].setsData.length;
                return { activeWorkout: workout };
            }),

            // Rimuovi ultimo set di un esercizio
            removeSet: (exIndex) => set((state) => {
                const workout = { ...state.activeWorkout };
                if (workout.exercises[exIndex].setsData.length > 1) {
                    workout.exercises[exIndex].setsData.pop();
                    workout.exercises[exIndex].sets = workout.exercises[exIndex].setsData.length;
                }
                return { activeWorkout: workout };
            }),

            // SMART SWAP: Sostituisci esercizio e ricalcola pesi futuri
            swapExercise: (exIndex, newName, newWeight) => set((state) => {
                const workout = JSON.parse(JSON.stringify(state.activeWorkout)); // Deep clone sicuro
                const exercise = workout.exercises[exIndex];

                // Aggiorna nome
                exercise.name = newName;

                // Aggiorna pesi SOLO per i set non fatti
                if (newWeight > 0) {
                    exercise.setsData.forEach(set => {
                        if (!set.done) {
                            set.kg = newWeight;
                        }
                    });
                }

                // Salva backup
                try {
                    localStorage.setItem('hypergym_active_workout_backup', JSON.stringify(workout));
                } catch (e) {
                    console.debug("Backup swap error", e);
                }

                return { activeWorkout: workout };
            }),

            // === BADGE SYSTEM ===

            // Riferimento alla costante esportata (per retrocompat con Badges.jsx che usa useStore)
            BADGE_THRESHOLDS,

            // Controlla e assegna badge in base ai pesi usati
            checkAndAwardBadges: async (workout) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const newlyUnlockedBadges = [];
                const THRESHOLDS = get().BADGE_THRESHOLDS;

                for (const exercise of workout.exercises) {
                    const exerciseName = exercise.name.toLowerCase();

                    // Determina tipo badge
                    let badgeType = null;
                    if (exerciseName.includes('panca')) badgeType = 'panca';
                    else if (exerciseName.includes('squat')) badgeType = 'squat';
                    else if (exerciseName.includes('stacco')) badgeType = 'stacco';

                    if (!badgeType) continue;

                    // Trova peso massimo nel workout (BUG-2 fix: evita Math.max su array vuoto → -Infinity)
                    const doneSets = exercise.setsData.filter(s => s.done);
                    if (doneSets.length === 0) continue;
                    const maxWeight = Math.max(...doneSets.map(s => parseInt(s.kg) || 0));

                    if (maxWeight <= 0) continue;

                    // Controlla ogni livello di badge
                    for (const badge of THRESHOLDS[badgeType]) {
                        if (maxWeight >= badge.weight) {
                            // Verifica se badge già presente
                            const existingBadges = get().badges;
                            const alreadyHas = existingBadges.some(
                                b => b.badge_type === badgeType && b.level === badge.level
                            );

                            if (!alreadyHas) {
                                // Inserisci badge in Supabase (BUG-3 fix: include achieved_at)
                                const { data: newBadge, error } = await supabase
                                    .from('achievements')
                                    .insert({
                                        user_id: user.id,
                                        badge_type: badgeType,
                                        level: badge.level,
                                        weight_achieved: maxWeight,
                                        achieved_at: new Date().toISOString()
                                    })
                                    .select()
                                    .single();

                                if (!error && newBadge) {
                                    newlyUnlockedBadges.push({
                                        ...newBadge,
                                        emoji: badge.emoji
                                    });
                                }
                            }
                        }
                    }
                }

                // Aggiorna store con nuovi badge
                if (newlyUnlockedBadges.length > 0) {
                    set((state) => ({
                        badges: [...state.badges, ...newlyUnlockedBadges],
                        newBadges: newlyUnlockedBadges
                    }));

                    // Pulisci newBadges dopo 5 secondi (dopo animazione)
                    setTimeout(() => {
                        set({ newBadges: [] });
                    }, 5000);
                }
            },

            // Pulisci badge "nuovi" manualmente
            clearNewBadges: () => set({ newBadges: [] }),

            // === COMMUNITY FEED ===

            // Crea un post nella community (chiamato dopo workout/badge)
            createCommunityPost: async (postData) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Recupera nome e avatar per il feed
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('name, avatar_url')
                    .eq('id', user.id)
                    .single();

                const { error } = await supabase
                    .from('community_feed')  // ✅ FIX: stessa tabella che legge Community.jsx
                    .insert({
                        user_id: user.id,
                        user_name: profile?.name || 'Atleta',
                        user_avatar: profile?.avatar_url || null,
                        ...postData
                    });

                return !error;
            },

            // Condividi PR automaticamente
            sharePR: async (exerciseName, weight, reps) => {
                return await get().createCommunityPost({
                    type: 'pr',
                    exercise_name: exerciseName,
                    weight: weight,
                    reps: reps,
                    content: `Nuovo personal record! 💪`
                });
            },

            // === STATS ===
            resetStats: async () => {
                // 1. Reset locale
                set((state) => ({
                    userProfile: { ...state.userProfile, streak: 0, workoutsCompleted: 0 },
                    history: [],
                    badges: [],
                    newBadges: []
                }));

                // 2. Reset Server (RPC V6 - Ritorna JSON)
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: result, error } = await supabase.rpc('reset_my_stats');

                    if (error) {
                        console.error("❌ Errore Reset Stats (RPC):", error);
                        alert(`ERRORE RPC: ${error.message}\n\nContatta il supporto.`);
                        return; // Stop qui, non continuare
                    }

                    // La RPC V6 ritorna JSON con diagnostics
                    console.log("✅ Reset RPC Result:", result);

                    // 3. Verifica che abbia davvero aggiornato
                    if (result && result.success && result.profile_updated > 0) {
                        console.log(`✅ Reset OK: ${result.profile_updated} profilo, ${result.history_deleted} storico, ${result.achievements_deleted} badge`);
                        // Tutto OK, nessun alert di errore
                    } else {
                        // Fallback: la RPC è eseguita ma non ha aggiornato nulla
                        console.warn("⚠️ Reset RPC non ha aggiornato righe. Possibile problema permessi.");
                        alert("ATTENZIONE: Il reset potrebbe non essere andato a buon fine. Verifica dopo login.");
                    }
                }
            },

            // Resetta i badge (anche se RPC resetta tutto, questa è specifica)
            resetBadges: async () => {
                // 1. Reset UI immediately
                set({ badges: [], newBadges: [] });

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                try {
                    // 2. Call RPC to delete from DB (bypasses RLS)
                    const { data, error } = await supabase.rpc('reset_my_badges');

                    if (error) {
                        console.error("RPC reset_my_badges error:", error);
                        alert(`Errore reset badge: ${error.message}`);
                        return;
                    }

                    console.log("✅ Badges reset result:", data);

                    // 3. Verify deletion
                    const { data: checkBadges } = await supabase
                        .from('achievements')
                        .select('*')
                        .eq('user_id', user.id);

                    if (checkBadges && checkBadges.length > 0) {
                        console.error("⚠️ WARNING: Badges still present after reset!", checkBadges);
                        alert("ATTENZIONE: Reset badge fallito lato server. Contatta supporto. (Codice RLS/RPC)");
                    } else {
                        console.log("✅ Verified: All badges deleted from DB");
                        alert("✅ Badge resettati con successo! L'app verrà ricaricata.");
                        window.location.reload(); // FORCE RELOAD to clear any cache/state
                    }
                } catch (error) {
                    console.error("Reset badges error:", error);
                    alert(`Errore reset badge: ${error.message}`);
                }
            },

            setTrainingDays: async (days) => {
                // ✅ Validazione input
                if (days < 1 || days > 7) {
                    console.error("Training days must be between 1 and 7");
                    return;
                }

                // 1. Aggiorna UI subito
                set((state) => ({
                    userProfile: { ...state.userProfile, trainingDaysGoal: days }
                }));

                // 2. Salva su Supabase
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { error } = await supabase.from('profiles').update({
                        training_days_goal: days
                    }).eq('id', user.id);

                    if (error) {
                        console.error("ERRORE SALVATAGGIO PROFILO:", error);
                        alert(`Errore salvataggio: ${error.message}`);
                    }
                }
            },


            // === CERTIFICATO MEDICO ===
            uploadCertificate: async ({ name, data }) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                try {
                    // 1. Converti Base64/DataURL in Blob per upload
                    const res = await fetch(data);
                    const blob = await res.blob();

                    // 2. Upload su Storage (bucket: certificates)
                    // Path: userId/filename
                    const filePath = `${user.id}/${name}`;

                    const { error: uploadError } = await supabase.storage
                        .from('certificates')
                        .upload(filePath, blob, { upsert: true });

                    if (uploadError) throw uploadError;

                    // 3. Aggiorna Profilo DB
                    const { error: dbError } = await supabase
                        .from('profiles')
                        .update({
                            certificate_uploaded: true,
                            certificate_filename: name,
                            certificate_url: filePath
                        })
                        .eq('id', user.id);

                    if (dbError) throw dbError;

                    // 4. Aggiorna Store Locale
                    set({
                        medicalCertificate: {
                            uploaded: true,
                            fileName: name,
                            uploadedAt: new Date().toISOString(),
                            expiresAt: null, // Reset scadenza (attesa verifica)
                            fileData: null
                        }
                    });

                    // 5. INVIA NOTIFICA AGLI ADMIN INSTANTANEAMENTE
                    try {
                        const { data: admins } = await supabase.from('profiles').select('id').in('role', ['admin', 'trainer']);
                        if (admins && admins.length > 0) {
                            const currentUserName = get().userProfile?.name || 'Un utente';
                            const notifications = admins.map(admin => ({
                                user_id: admin.id,
                                title: "📄 Nuovo Certificato Medico",
                                message: `${currentUserName} ha caricato un nuovo certificato medico.`,
                                type: "certificate",
                                data: {
                                    url: "/admin",
                                    sender_id: user.id
                                }
                            }));
                            await supabase.from('notifications').insert(notifications);
                        }
                    } catch (notifErr) {
                        console.warn("Error sending admin notification", notifErr);
                    }

                    alert("✅ Certificato caricato con successo!");

                } catch (error) {
                    console.error("Upload error:", error);
                    alert(`Errore caricamento: ${error.message}`);
                }
            },

            removeCertificate: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const fileName = get().medicalCertificate.fileName;
                // Se non abbiamo filename in locale, prova a cercarlo o ignora storage delete

                try {
                    // 1. Rimuovi da Storage (se abbiamo il nome)
                    if (fileName) {
                        const filePath = `${user.id}/${fileName}`;
                        const { error: storageError } = await supabase.storage
                            .from('certificates')
                            .remove([filePath]);
                        if (storageError) console.warn("Storage delete error:", storageError);
                    }

                    // 2. Aggiorna Profilo DB
                    await supabase.from('profiles').update({
                        certificate_uploaded: false,
                        certificate_filename: null,
                        certificate_url: null,
                        certificate_expires_at: null
                    }).eq('id', user.id);

                    // 3. Reset Store Locale
                    set({
                        medicalCertificate: {
                            uploaded: false,
                            fileName: null,
                            uploadedAt: null,
                            expiresAt: null,
                            fileData: null
                        }
                    });

                } catch (error) {
                    console.error("Remove error:", error);
                    alert("Errore rimozione: " + error.message);
                }
            },


            // === CHAT SYSTEM ===
            chatMessages: [],

            fetchChatMessages: async (contactId) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch messages between me and contact
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                    .order('created_at', { ascending: true });

                if (!error && data) {
                    // Filter needed because OR query retrieves ALL my messages, we need only with this contact
                    // (Supabase simplified OR syntax has limitations combining with AND correctly in one simple string)
                    const filtered = data.filter(m =>
                        (m.sender_id === user.id && m.receiver_id === contactId) ||
                        (m.sender_id === contactId && m.receiver_id === user.id)
                    );
                    set({ chatMessages: filtered });

                    // Mark read
                    await get().markChatRead(contactId);
                }
            },

            sendMessage: async (contactId, content) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Optimistic UI update
                const tempId = crypto.randomUUID();
                const optimisticMsg = {
                    id: tempId,
                    sender_id: user.id,
                    receiver_id: contactId,
                    content,
                    created_at: new Date().toISOString(),
                    read: false,
                    pending: true
                };

                set(state => ({ chatMessages: [...state.chatMessages, optimisticMsg] }));

                const { data, error } = await supabase
                    .from('messages')
                    .insert({
                        sender_id: user.id,
                        receiver_id: contactId,
                        content
                    })
                    .select()
                    .single();

                if (error) {
                    console.error("Send error:", error);
                    set(state => ({
                        chatMessages: state.chatMessages.filter(m => m.id !== tempId)
                    }));
                    alert("Errore invio messaggio.");
                } else {
                    // Replace optimistic with real
                    set(state => ({
                        chatMessages: state.chatMessages.map(m =>
                            m.id === tempId ? data : m
                        )
                    }));
                }
            },

            markChatRead: async (contactId) => {
                const { error } = await supabase.rpc('mark_messages_read', { contact_id: contactId });
                if (error) console.warn("Mark read error:", error);
            },

            // Subscribe to NEW messages (Live)
            subscribeToChat: (contactId) => {
                const subscription = supabase
                    .channel('chat-room')
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                    }, (payload) => {
                        const newMsg = payload.new;
                        // Check if it belongs to this conversation
                        // (Incoming from contact OR outgoing from me from another device)
                        const state = get();
                        // Assuming current user is already known
                        // We check if the message involves the contactId
                        if (newMsg.sender_id === contactId || newMsg.receiver_id === contactId) {
                            // Avoid duplicates (if optimistic update already added it)
                            const exists = state.chatMessages.some(m => m.id === newMsg.id);
                            if (!exists) {
                                set(s => ({ chatMessages: [...s.chatMessages, newMsg] }));
                                if (newMsg.sender_id === contactId) {
                                    get().markChatRead(contactId);
                                }
                            }
                        }
                    })
                    .subscribe();

                return () => supabase.removeChannel(subscription);
            },


            // === LOGOUT ===
            logout: () => {
                // IMPORTANTE: Il logout cancella solo i dati LOCALI
                // L'utente rimane registrato nel DATABASE e può rifare login
                set({
                    authToken: null,  // Cancella solo il token di sessione
                    userProfile: {
                        name: "",
                        email: "",
                        phone: "",
                        trainingDaysGoal: 3,
                        streak: 0,
                        workoutsCompleted: 0,
                        tonnage: 0,
                        createdAt: null
                    },
                    medicalCertificate: {
                        uploaded: false,
                        fileName: null,
                        uploadedAt: null,
                        expiresAt: null,
                        fileData: null
                    },
                    plans: [],
                    history: [],
                    badges: [],
                    activeWorkout: null,
                    lastSyncAt: null,
                    // ✅ NOTA: NON resetto isRegistered!
                    // L'utente può rifare login senza registrarsi di nuovo
                });
            },

            // Verifica se l'utente è loggato
            isLoggedIn: () => {
                const state = get();
                return state.authToken !== null && state.userProfile.email !== "";
            }

        }),
        { name: 'hypergym-storage' }
    )
);

// Auto-sync ogni 5 minuti
if (typeof window !== 'undefined') {
    setInterval(() => {
        const state = useStore.getState();
        if (state.isRegistered) state.syncToServer();
    }, 5 * 60 * 1000);
}
