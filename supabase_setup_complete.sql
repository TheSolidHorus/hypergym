-- SUPABASE SETUP COMPLETE (PUMP APP)
-- Esegui questo script nell'SQL Editor del tuo NUOVO progetto Supabase per creare l'intera struttura.

-- ==========================================
-- 1. TABELLA PROFILI E LOGICA UTENTI
-- ==========================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'client', -- 'admin', 'trainer', 'client'
  avatar_url TEXT,
  training_days_goal INT DEFAULT 3,
  streak INT DEFAULT 0,
  workouts_completed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger creazione profilo automatico alla registrazione
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'Utente'), 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 2. WORKOUT PLANS (SCHEDE)
-- ==========================================
CREATE TABLE public.workout_plans (
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

-- Permissions
CREATE POLICY "Users can view own plans" ON public.workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins/Trainers can view all plans" ON public.workout_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);
CREATE POLICY "Enable insert for authenticated" ON public.workout_plans FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
  )
);
-- Fix v21: Admin Delete
CREATE POLICY "Admins can delete any plan" ON public.workout_plans FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);
-- Fix v22: User Delete
CREATE POLICY "Users can delete own plans" ON public.workout_plans FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own" ON public.workout_plans FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- ==========================================
-- 3. WORKOUT HISTORY (STORICO)
-- ==========================================
CREATE TABLE public.workout_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  plan_id UUID, 
  name TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  exercises JSONB,
  feeling TEXT, -- 'good', 'tired', etc
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own history" ON public.workout_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own history" ON public.workout_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own history" ON public.workout_history FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 4. RICHIESTE COACHING
-- ==========================================
CREATE TABLE public.coaching_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  location TEXT, -- 'home', 'gym'
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.coaching_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert requests" ON public.coaching_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all requests" ON public.coaching_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);
CREATE POLICY "Users view own requests" ON public.coaching_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins update/delete requests" ON public.coaching_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- ==========================================
-- 5. MESSAGGI & NOTIFICHE (CON FIX TRASMISSIONE)
-- ==========================================
CREATE TABLE public.messages (
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

CREATE TABLE public.notifications (
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
CREATE POLICY "Update own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

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
CREATE TRIGGER on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE PROCEDURE notify_new_message();

-- ==========================================
-- 6. COMMUNITY & SOCIAL
-- ==========================================
CREATE TABLE public.community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  content TEXT,
  image_url TEXT,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Auth insert posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth delete own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.post_likes (
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  post_id UUID REFERENCES public.community_posts(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Auth manage likes" ON public.post_likes FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.community_posts(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Auth insert comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Auth update own comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.follows (
  follower_id UUID REFERENCES public.profiles(id) NOT NULL,
  following_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Auth manage follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- ==========================================
-- 7. EXTRAS & ASSIGNMENTS
-- ==========================================
CREATE TABLE public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  badge_type TEXT,
  level TEXT, 
  weight_achieved FLOAT,
  achieved_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Users insert own achievements" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage achievements" ON public.achievements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

CREATE TABLE public.exercise_videos (
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

CREATE TABLE public.assigned_workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID REFERENCES public.profiles(id),
  client_id UUID REFERENCES public.profiles(id), 
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.assigned_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view assigned" ON public.assigned_workouts FOR SELECT USING (true); 
CREATE POLICY "Trainers can assign workouts" ON public.assigned_workouts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);
CREATE POLICY "Trainers can manage assigned workouts" ON public.assigned_workouts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- ==========================================
-- 8. ARCHIVIO ESERCIZI (LIBRARY)
-- ==========================================
CREATE TABLE public.exercise_library (
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

-- SEED DATA
INSERT INTO public.exercise_library (name, muscle_group) VALUES
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
('Crunch', 'addome'), ('Plank', 'addome'), ('Leg Raise', 'addome'), ('Russian Twist', 'addome');

-- ==========================================
-- 9. REALTIME (LIVE UPDATES)
-- ==========================================
-- Abilita le notifiche live (QUESTO DEVE ESSERE IN FONDO)
DO $$
BEGIN
  -- Ignora errore se già nel publication
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE notifications, messages, coaching_requests';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
