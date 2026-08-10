-- ==========================================
-- SETUP INIZIALE & PATCH DI SICUREZZA PUMP
-- ==========================================

-- 1. CREAZIONE TABELLE COMMUNITY (se non esistono)
CREATE TABLE IF NOT EXISTS public.community_feed (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    user_avatar TEXT,
    type TEXT,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    badge_type TEXT,
    badge_level TEXT,
    exercise_name TEXT,
    weight NUMERIC,
    reps INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.community_feed(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.community_feed(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SICUREZZA RLS (ROW LEVEL SECURITY)
ALTER TABLE public.community_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo proprietari possono inserire" ON public.community_feed;
CREATE POLICY "Solo proprietari possono inserire" ON public.community_feed
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Solo proprietari possono eliminare" ON public.community_feed;
CREATE POLICY "Solo proprietari possono eliminare" ON public.community_feed
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Tutti vedono il feed" ON public.community_feed;
CREATE POLICY "Tutti vedono il feed" ON public.community_feed
FOR SELECT USING (auth.role() = 'authenticated');

-- 3. FIREWALL ANTI-SPOOFING (Il Trigger)
CREATE OR REPLACE FUNCTION public.secure_community_post()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_name := (SELECT name FROM public.profiles WHERE id = auth.uid());
    NEW.user_avatar := (SELECT avatar_url FROM public.profiles WHERE id = auth.uid());
    NEW.created_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_secure_community_post ON public.community_feed;
CREATE TRIGGER trg_secure_community_post
    BEFORE INSERT ON public.community_feed
    FOR EACH ROW
    EXECUTE FUNCTION public.secure_community_post();
