-- SOSTITUISCI L'EMAIL UNA SOLA VOLTA NELLA PRIMA RIGA DI OGNI BLOCCO!
-- Non devi farlo decine di volte, se usi questo formato ottimizzato.

-- ==========================================
-- BLOCCO UTENTE 1 (Copia tutto questo per eliminare 1 utente)
-- ==========================================
WITH target AS (
    SELECT id FROM auth.users WHERE email = 'LA_PRIMA_EMAIL@GMAIL.COM'
),
d1 AS  (DELETE FROM public.achievements WHERE user_id IN (SELECT id FROM target)),
d2 AS  (DELETE FROM public.app_feedback WHERE user_id IN (SELECT id FROM target)),
d3 AS  (DELETE FROM public.notifications WHERE user_id IN (SELECT id FROM target) OR sender_id IN (SELECT id FROM target)),
d4 AS  (DELETE FROM public.follows WHERE follower_id IN (SELECT id FROM target) OR following_id IN (SELECT id FROM target)),
d5 AS  (DELETE FROM public.coaching_requests WHERE user_id IN (SELECT id FROM target) OR trainer_id IN (SELECT id FROM target)),
d6 AS  (DELETE FROM public.workout_history WHERE user_id IN (SELECT id FROM target)),
d7 AS  (DELETE FROM public.assigned_workouts WHERE client_id IN (SELECT id FROM target) OR trainer_id IN (SELECT id FROM target)),
d8 AS  (DELETE FROM public.workout_plans WHERE created_by IN (SELECT id FROM target)),
d9 AS  (DELETE FROM public.post_likes WHERE user_id IN (SELECT id FROM target)),
d10 AS (DELETE FROM public.post_comments WHERE user_id IN (SELECT id FROM target)),
d11 AS (DELETE FROM public.community_feed WHERE user_id IN (SELECT id FROM target)),
d12 AS (DELETE FROM public.challenge_participants WHERE user_id IN (SELECT id FROM target)),
d13 AS (DELETE FROM public.community_challenges WHERE created_by IN (SELECT id FROM target)),
d14 AS (DELETE FROM public.profiles WHERE id IN (SELECT id FROM target))
DELETE FROM auth.users WHERE id IN (SELECT id FROM target);


-- ==========================================
-- BLOCCO UTENTE 2 (Se devi eliminare un secondo utente, altrimenti cancellalo)
-- ==========================================
WITH target AS (
    SELECT id FROM auth.users WHERE email = 'LA_SECONDA_EMAIL@GMAIL.COM'
),
d1 AS  (DELETE FROM public.achievements WHERE user_id IN (SELECT id FROM target)),
d2 AS  (DELETE FROM public.app_feedback WHERE user_id IN (SELECT id FROM target)),
d3 AS  (DELETE FROM public.notifications WHERE user_id IN (SELECT id FROM target) OR sender_id IN (SELECT id FROM target)),
d4 AS  (DELETE FROM public.follows WHERE follower_id IN (SELECT id FROM target) OR following_id IN (SELECT id FROM target)),
d5 AS  (DELETE FROM public.coaching_requests WHERE user_id IN (SELECT id FROM target) OR trainer_id IN (SELECT id FROM target)),
d6 AS  (DELETE FROM public.workout_history WHERE user_id IN (SELECT id FROM target)),
d7 AS  (DELETE FROM public.assigned_workouts WHERE client_id IN (SELECT id FROM target) OR trainer_id IN (SELECT id FROM target)),
d8 AS  (DELETE FROM public.workout_plans WHERE created_by IN (SELECT id FROM target)),
d9 AS  (DELETE FROM public.post_likes WHERE user_id IN (SELECT id FROM target)),
d10 AS (DELETE FROM public.post_comments WHERE user_id IN (SELECT id FROM target)),
d11 AS (DELETE FROM public.community_feed WHERE user_id IN (SELECT id FROM target)),
d12 AS (DELETE FROM public.challenge_participants WHERE user_id IN (SELECT id FROM target)),
d13 AS (DELETE FROM public.community_challenges WHERE created_by IN (SELECT id FROM target)),
d14 AS (DELETE FROM public.profiles WHERE id IN (SELECT id FROM target))
DELETE FROM auth.users WHERE id IN (SELECT id FROM target);
