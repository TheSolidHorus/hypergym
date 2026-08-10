-- =========================================================================
-- HYPERGYM COMPLETE DATABASE SETUP SCRIPT
-- Esegui questo script nel tuo SQL Editor di Supabase:
-- https://supabase.com/dashboard/project/lrnannuvewaamslqacmh/sql/new
-- =========================================================================

-- 1. PROFILES & USER LOGIC
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'client', -- 'admin', 'trainer', 'client'
  phone TEXT,
  avatar_url TEXT,
  training_days_goal INT DEFAULT 3,
  streak INT DEFAULT 0,
  workouts_completed INT DEFAULT 0,
  tonnage NUMERIC DEFAULT 0,
  certificate_uploaded BOOLEAN DEFAULT FALSE,
  certificate_filename TEXT,
  certificate_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger: auto-create profile on auth sign up
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'client'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(public.profiles.name, EXCLUDED.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. WORKOUT PLANS (SCHEDE DI ALLENAMENTO)
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  days TEXT,
  exercises JSONB DEFAULT '[]'::JSONB,
  last_performed TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own plans" ON public.workout_plans;
CREATE POLICY "Users view own plans" ON public.workout_plans FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Trainers/Admins view all plans" ON public.workout_plans;
CREATE POLICY "Trainers/Admins view all plans" ON public.workout_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

DROP POLICY IF EXISTS "Users insert own plans" ON public.workout_plans;
CREATE POLICY "Users insert own plans" ON public.workout_plans FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
  )
);

DROP POLICY IF EXISTS "Users update own plans" ON public.workout_plans;
CREATE POLICY "Users update own plans" ON public.workout_plans FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

DROP POLICY IF EXISTS "Users delete own plans" ON public.workout_plans;
CREATE POLICY "Users delete own plans" ON public.workout_plans FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- 3. WORKOUT HISTORY (STORICO ALLENAMENTI)
CREATE TABLE IF NOT EXISTS public.workout_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID, 
  name TEXT,
  duration NUMERIC DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  exercises JSONB,
  feeling TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own history" ON public.workout_history;
CREATE POLICY "View own history" ON public.workout_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert own history" ON public.workout_history;
CREATE POLICY "Insert own history" ON public.workout_history FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delete own history" ON public.workout_history;
CREATE POLICY "Delete own history" ON public.workout_history FOR DELETE USING (auth.uid() = user_id);

-- 4. COACHING REQUESTS & GYM CODE VERIFICATION
CREATE TABLE IF NOT EXISTS public.coaching_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coaching_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own requests" ON public.coaching_requests;
CREATE POLICY "View own requests" ON public.coaching_requests FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

DROP POLICY IF EXISTS "Insert requests" ON public.coaching_requests;
CREATE POLICY "Insert requests" ON public.coaching_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RPC for Gym Code Verification
CREATE OR REPLACE FUNCTION public.verify_gym_code(code_input TEXT)
RETURNS JSONB AS $$
DECLARE
  clean_code TEXT := upper(trim(code_input));
BEGIN
  IF clean_code IS NULL OR length(clean_code) < 3 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Codice palestra non valido');
  END IF;

  RETURN jsonb_build_object('success', true, 'code', clean_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. NOTIFICATIONS (NOTIFICHE)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own notifications" ON public.notifications;
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update own notifications" ON public.notifications;
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 6. COMMUNITY POSTS & COMMENTS
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT,
  user_avatar TEXT,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts viewable by everyone" ON public.posts;
CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users insert posts" ON public.posts;
CREATE POLICY "Authenticated users insert posts" ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users delete own posts" ON public.posts;
CREATE POLICY "Users delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- 7. HYPER ENGAGE (GAMIFICATION MULTI-TENANT)
CREATE TABLE IF NOT EXISTS public.gyms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  country TEXT DEFAULT 'IT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gyms viewable by everyone" ON public.gyms;
CREATE POLICY "Gyms viewable by everyone" ON public.gyms FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.gym_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_gym_user UNIQUE(gym_id, user_id)
);

ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gym members viewable by everyone" ON public.gym_members;
CREATE POLICY "Gym members viewable by everyone" ON public.gym_members FOR SELECT USING (true);

-- Insert Default HyperGym structure for Engage
INSERT INTO public.gyms (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'HyperGym Center')
ON CONFLICT (id) DO NOTHING;
