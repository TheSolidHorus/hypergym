-- FIX CUMULATIVI v20 (Fixed v2)
-- 1. Reset Badges
DELETE FROM public.achievements;

-- 2. Correzione Struttura DB: Aggiungi colonne mancanti
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB;

-- 3. Sincronizzazione Email (Auth -> Profiles)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 4. Backfill Profili Mancanti
INSERT INTO public.profiles (id, email, name, role, training_days_goal, streak, workouts_completed)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'name', 'Utente'), 
  'client', 
  3, 0, 0
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 5. Trigger Notifiche Messaggi (SECURITY DEFINER per bypassare RLS)
CREATE OR REPLACE FUNCTION notify_new_message() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, created_at, read, data)
  VALUES (
    NEW.receiver_id,
    'message',
    'Nuovo Messaggio',
    LEFT(NEW.content, 50),
    NOW(),
    false,
    jsonb_build_object('sender_id', NEW.sender_id, 'url', '/chat/' || NEW.sender_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE notify_new_message();

-- 6. Helper Ruolo Client
UPDATE public.profiles SET role = 'client' WHERE role IS NULL;
