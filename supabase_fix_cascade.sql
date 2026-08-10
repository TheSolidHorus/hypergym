-- ABILITA CANCELLAZIONE A CASCATA (CASCADE DELETE)
-- Questo script modifica le Foreign Keys per permettere l'eliminazione degli utenti auth.

-- 1. Profiles (Profilo Utente)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Workout Plans (Schede)
ALTER TABLE public.workout_plans
DROP CONSTRAINT IF EXISTS workout_plans_user_id_fkey;

ALTER TABLE public.workout_plans
ADD CONSTRAINT workout_plans_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Workout History (Storico)
ALTER TABLE public.workout_history
DROP CONSTRAINT IF EXISTS workout_history_user_id_fkey;

ALTER TABLE public.workout_history
ADD CONSTRAINT workout_history_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Coaching Requests (Richieste)
ALTER TABLE public.coaching_requests
DROP CONSTRAINT IF EXISTS coaching_requests_user_id_fkey;

ALTER TABLE public.coaching_requests
ADD CONSTRAINT coaching_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Notifications & Messages
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. Exercise Videos (Video caricati)
ALTER TABLE public.exercise_videos DROP CONSTRAINT IF EXISTS exercise_videos_user_id_fkey;
ALTER TABLE public.exercise_videos ADD CONSTRAINT exercise_videos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 7. App Feedback
ALTER TABLE public.app_feedback DROP CONSTRAINT IF EXISTS app_feedback_user_id_fkey;
ALTER TABLE public.app_feedback ADD CONSTRAINT app_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
