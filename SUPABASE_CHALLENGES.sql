-- Esegui questo script in Supabase SQL Editor per creare il sistema delle sfide

-- 1. Creazione Tabella Sfide
CREATE TABLE public.community_challenges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_metric TEXT NOT NULL, -- es: 'volume', 'workouts', 'pr'
    target_value NUMERIC NOT NULL,
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Creazione Tabella Partecipanti (Leaderboard)
CREATE TABLE public.challenge_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    challenge_id UUID REFERENCES public.community_challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    progress NUMERIC DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(challenge_id, user_id)
);

-- 3. Imposta Row Level Security (RLS)
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Policy per community_challenges
-- Tutti gli utenti registrati possono VEDERE le sfide
CREATE POLICY "Tutti possono vedere le sfide" ON public.community_challenges
    FOR SELECT USING (auth.role() = 'authenticated');

-- SOLO GLI ADMIN possono creare, modificare o eliminare sfide (controllo sulla tabella profiles per role='admin')
CREATE POLICY "Admin possono gestire le sfide" ON public.community_challenges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Policy per challenge_participants
-- Tutti possono vedere la classifica della sfida
CREATE POLICY "Tutti possono vedere i partecipanti" ON public.challenge_participants
    FOR SELECT USING (auth.role() = 'authenticated');

-- Un utente può unirsi a una sfida e aggiornare il proprio progresso
CREATE POLICY "Utenti gestiscono propria partecipazione" ON public.challenge_participants
    FOR ALL USING (auth.uid() = user_id);
