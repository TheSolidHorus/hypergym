-- ==========================================
-- SUPABASE MASTER SCRIPT V1 (PUMP APP)
-- ==========================================
-- Esegui questo intero script nell'SQL Editor di Supabase.
-- Questo script crea TUTTE le tabelle, funzioni, policy e dati iniziali necessari.

-- ⚠️ ATTENZIONE: Se hai già dati, questo script POTREBBE dare errori se le tabelle esistono.
-- Per ripartire da zero pulito, decommenta la riga sotto (CANCELLA TUTTO!):
-- DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;

-- ==========================================
-- 1. TABELLA PROFILI & AUTH
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'client', -- 'admin', 'trainer', 'client'
  avatar_url TEXT,
  training_days_goal INT DEFAULT 3,
  streak INT DEFAULT 0,
  workouts_completed INT DEFAULT 0,
  certificate_uploaded BOOLEAN DEFAULT false,
  certificate_url TEXT,
  certificate_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies e Funzioni
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Funzione RPC critica per il frontend
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Trigger creazione profilo automatico
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'Utente'), 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger se esiste per evitare duplicati
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 2. WORKOUT PLANS (SCHEDE)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  days TEXT,
  exercises JSONB DEFAULT '[]'::JSONB,
  last_performed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own plans" ON public.workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all plans" ON public.workout_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);
CREATE POLICY "Enable insert for authenticated" ON public.workout_plans FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins delete any plan" ON public.workout_plans FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);
CREATE POLICY "Users delete own plans" ON public.workout_plans FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own plans" ON public.workout_plans FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 3. WORKOUT HISTORY (STORICO)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.workout_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  plan_id UUID, 
  plan_name TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  exercises JSONB,
  feeling TEXT,
  total_sets INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own history" ON public.workout_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own history" ON public.workout_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own history" ON public.workout_history FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all history" ON public.workout_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- ==========================================
-- 4. RICHIESTE COACHING & FEEDBACK
-- ==========================================
CREATE TABLE IF NOT EXISTS public.coaching_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  location TEXT, -- 'home', 'gym'
  status TEXT DEFAULT 'pending',
  goal TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.coaching_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert requests" ON public.coaching_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own requests" ON public.coaching_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage requests" ON public.coaching_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

CREATE TABLE IF NOT EXISTS public.app_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('bug', 'idea', 'other')),
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert feedback" ON public.app_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all feedback" ON public.app_feedback FOR ALL USING (
   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- ==========================================
-- 5. MESSAGGI & NOTIFICHE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT,
  read BOOLEAN DEFAULT false,
  pending BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View involved messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id); 
CREATE POLICY "Update read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  type TEXT,
  title TEXT,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Everyone insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Trigger Messaggi -> Notifiche
CREATE OR REPLACE FUNCTION notify_new_message() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, created_at, read, data)
  VALUES (
    NEW.receiver_id, 'message', 'Nuovo Messaggio', LEFT(NEW.content, 50), NOW(), false, 
    jsonb_build_object('sender_id', NEW.sender_id, 'url', '/chat/' || NEW.sender_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE PROCEDURE notify_new_message();

-- ==========================================
-- 6. ARCHIVIO ESERCIZI & VIDEO
-- ==========================================
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL, 
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view exercises" ON public.exercise_library FOR SELECT USING (true);
CREATE POLICY "Admins manage exercises" ON public.exercise_library FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- Seed Data (Solo se vuota)
INSERT INTO public.exercise_library (name, muscle_group) 
SELECT * FROM (VALUES
('Panca Piana Bilanciere', 'petto'), ('Panca Inclinata Manubri', 'petto'), ('Croci Manubri', 'petto'),
('Spinte Panca Piana', 'petto'), ('Pectoral Machine', 'petto'), ('Chest Press', 'petto'),
('Dip Parallele', 'petto'), ('Crossover', 'petto'),
('Trazioni alla Sbarra', 'dorso'), ('Lat Machine Avanti', 'dorso'), ('Lat Machine Dietro', 'dorso'),
('Rematore Bilanciere', 'dorso'), ('Rematore Manubrio', 'dorso'), ('Pulley Basso', 'dorso'),
('Vertical Row', 'dorso'), ('Pull Down Braccia Tese', 'dorso'),
('Squat Bilanciere', 'gambe'), ('Leg Press 45°', 'gambe'), ('Affondi Manubri', 'gambe'),
('Leg Extension', 'gambe'), ('Leg Curl', 'gambe'), ('Stacco da Terra', 'gambe'),
('Calf Machine', 'gambe'), ('Squat Bulgaro', 'gambe'),
('Military Press', 'spalle'), ('Lento Avanti Manubri', 'spalle'), ('Alzate Laterali', 'spalle'),
('Alzate Frontali', 'spalle'), ('Face Pull', 'spalle'), ('Tirate al Mento', 'spalle'),
('Curl Bilanciere', 'braccia'), ('Curl Manubri', 'braccia'), ('Hammer Curl', 'braccia'),
('French Press', 'braccia'), ('Push Down Cavi', 'braccia'), ('Dip Panche', 'braccia'),
('Crunch', 'addome'), ('Plank', 'addome'), ('Leg Raise', 'addome'), ('Russian Twist', 'addome')
) AS t(name, muscle_group)
WHERE NOT EXISTS (SELECT 1 FROM public.exercise_library WHERE name = t.name);

CREATE TABLE IF NOT EXISTS public.exercise_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  exercise_name TEXT,
  video_url TEXT,
  filename TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.exercise_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view videos" ON public.exercise_videos FOR SELECT USING (true);
CREATE POLICY "Admins manage videos" ON public.exercise_videos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- ==========================================
-- 7. REALTIME
-- ==========================================
-- Abilita Realtime
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE notifications, messages, coaching_requests, app_feedback';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
