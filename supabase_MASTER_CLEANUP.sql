-- ==============================================================================
-- PUMP APP - MASTER DATABASE SCRIPT (PULIZIA TOTALE - v5 FINAL COMPLETE)
-- ==============================================================================
-- QUESTO SCRIPT CONTIENE TUTTO IL NECESSARIO PER IL DB DI PUMP.
-- ESEGUENDO QUESTO, PUOI CANCELLARE TUTTI GLI ALTRI FILE .sql "SPAZZATURA".
-- Include: Profili, Schede, Storico, Social (Follow/Badges), Commenti, Chat, Video, Storage.
-- Esegue controlli intelligenti per aggiornare tabelle esistenti.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABELLE PRINCIPALI & AGGIORNAMENTI COLONNE
-- ==============================================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS workouts_completed INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS training_days_goal INTEGER DEFAULT 3;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges_count INTEGER DEFAULT 0; -- V7
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certificate_uploaded BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certificate_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_badges_count ON profiles(badges_count DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_completed ON profiles(workouts_completed DESC);

-- WORKOUT PLANS
CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    exercises JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- ASSIGNED WORKOUTS (V11 FIX)
CREATE TABLE IF NOT EXISTS assigned_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID REFERENCES auth.users(id),
    client_id UUID REFERENCES auth.users(id),
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_client_plan UNIQUE (client_id, plan_id)
);

-- WORKOUT HISTORY (V12 FIX)
CREATE TABLE IF NOT EXISTS workout_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
    plan_name TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exercises JSONB, 
    total_sets INTEGER,
    total_reps INTEGER,
    total_tonnage INTEGER,
    duration numeric,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE workout_history ADD COLUMN IF NOT EXISTS duration numeric;

-- EXERCISE VIDEOS
CREATE TABLE IF NOT EXISTS exercise_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_name TEXT NOT NULL UNIQUE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ==============================================================================
-- 3. SOCIAL & GAMIFICATION
-- ==============================================================================

-- ACHIEVEMENTS / BADGES
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    level TEXT NOT NULL, 
    weight_achieved INTEGER,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_type, level)
);

-- FOLLOWS
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- COMMUNITY & COMMENTS
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT,
    content TEXT,
    exercise_name TEXT,
    weight INTEGER,
    reps INTEGER,
    badge_type TEXT,
    badge_level TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 4. FUNZIONI & TRIGGER
-- ==============================================================================

-- Trigger: Aggiorna badges_count
CREATE OR REPLACE FUNCTION update_badges_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE profiles SET badges_count = badges_count + 1 WHERE id = NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE profiles SET badges_count = badges_count - 1 WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_badge_change ON achievements;
CREATE TRIGGER on_badge_change
AFTER INSERT OR DELETE ON achievements
FOR EACH ROW EXECUTE FUNCTION update_badges_count();

-- Trigger: Nuovo Utente (Safe)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione: Reset Badges
CREATE OR REPLACE FUNCTION reset_my_badges()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    del_count INTEGER;
BEGIN
    DELETE FROM achievements WHERE user_id = auth.uid();
    GET DIAGNOSTICS del_count = ROW_COUNT;
    UPDATE profiles SET badges_count = 0 WHERE id = auth.uid();
    RETURN json_build_object('success', true, 'deleted', del_count);
END;
$$;
GRANT EXECUTE ON FUNCTION reset_my_badges() TO authenticated;

-- Funzione: Mark Messages Read
CREATE OR REPLACE FUNCTION mark_messages_read(contact_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE messages SET read = TRUE
    WHERE receiver_id = auth.uid() AND sender_id = contact_id AND read = FALSE;
END;
$$;
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID) TO authenticated;

-- ==============================================================================
-- 5. PERMESSI (RLS) & STORAGE
-- ==============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE workout_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE workout_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
CREATE POLICY "Users can read own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can see achievements" ON achievements;
CREATE POLICY "Everyone can see achievements" ON achievements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own achievements" ON achievements;
CREATE POLICY "Users manage own achievements" ON achievements FOR ALL USING (auth.uid() = user_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Follows" ON follows;
CREATE POLICY "Public Follows" ON follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "User Follow Logic" ON follows;
CREATE POLICY "User Follow Logic" ON follows FOR ALL USING (auth.uid() = follower_id);

-- Storage Buckets (Safe Insert)
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-videos', 'exercise-videos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Realtime Publication (se fallisce ignora)
DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE messages';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
