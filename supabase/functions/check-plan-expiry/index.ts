// ============================================================================
// Edge Function: check-plan-expiry
// Schedulata giornalmente via pg_cron per inviare notifiche ai coach
// quando le schede degli atleti stanno per scadere (7, 3, 1 giorni)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WARNING_DAYS = [7, 3, 1]; // Giorni prima della scadenza

Deno.serve(async (req) => {
    // Sicurezza: accetta solo chiamate con Authorization (cron interno o manuale)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } }
    );

    try {
        // 1. Recupera tutte le schede assegnate con info sul piano e coach
        const { data: assignedWorkouts, error: fetchError } = await supabaseAdmin
            .from('assigned_workouts')
            .select(`
                id,
                created_at,
                client_id,
                trainer_id,
                workout_plans (
                    id,
                    name,
                    duration_weeks
                ),
                client:client_id (name),
                trainer:trainer_id (id, name)
            `);

        if (fetchError) throw fetchError;
        if (!assignedWorkouts || assignedWorkouts.length === 0) {
            return new Response(JSON.stringify({ message: 'Nessuna scheda trovata', sent: 0 }), { status: 200 });
        }

        let notificationsSent = 0;
        const now = Date.now();

        for (const aw of assignedWorkouts) {
            // Salta se mancano dati essenziali
            if (!aw.workout_plans || !aw.trainer_id) continue;

            const durationWeeks = aw.workout_plans.duration_weeks || 4;
            const expiresAt = new Date(aw.created_at).getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000;
            const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

            // Controlla se siamo a una soglia di avviso
            for (const warningDay of WARNING_DAYS) {
                if (daysRemaining !== warningDay) continue;

                // Controlla se questa notifica è già stata inviata
                const { data: existing } = await supabaseAdmin
                    .from('plan_expiry_notifications')
                    .select('id')
                    .eq('assigned_workout_id', aw.id)
                    .eq('days_warning', warningDay)
                    .maybeSingle();

                if (existing) continue; // Già inviata, salta

                // Costruisce il messaggio
                const athleteName = aw.client?.name || 'Atleta';
                const planName = aw.workout_plans?.name || 'Scheda';
                const daysLabel = warningDay === 1 ? 'giorno' : 'giorni';
                const urgencyEmoji = warningDay === 1 ? '🔴' : warningDay === 3 ? '🟠' : '🟡';

                const title = `${urgencyEmoji} Scheda in scadenza`;
                const message = `La scheda "${planName}" di ${athleteName} scade tra ${warningDay} ${daysLabel}. Ricordati di aggiornarla!`;

                // Inserisce la notifica per il coach
                const { error: notifError } = await supabaseAdmin
                    .from('coach_notifications')
                    .insert({
                        coach_id: aw.trainer_id,
                        type: 'plan_expiry',
                        title,
                        message,
                        metadata: {
                            athlete_name: athleteName,
                            plan_name: planName,
                            days_left: warningDay,
                            assigned_workout_id: aw.id,
                            client_id: aw.client_id
                        }
                    });

                if (notifError) {
                    console.error(`Errore inserimento notifica per coach ${aw.trainer_id}:`, notifError.message);
                    continue;
                }

                // Traccia la notifica come inviata
                await supabaseAdmin
                    .from('plan_expiry_notifications')
                    .insert({
                        assigned_workout_id: aw.id,
                        coach_id: aw.trainer_id,
                        days_warning: warningDay
                    });

                notificationsSent++;
                console.log(`✅ Notifica inviata: coach=${aw.trainer_id}, atleta=${athleteName}, piano="${planName}", giorni=${warningDay}`);
            }
        }

        return new Response(JSON.stringify({
            message: `Controllo completato`,
            notificationsSent,
            plansChecked: assignedWorkouts.length
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('check-plan-expiry error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
