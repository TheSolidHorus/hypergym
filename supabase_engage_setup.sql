
-- =========================================================================
-- DDL SETUP PER PUMP ENGAGE (GAMIFICATION E BATTLE PASS)
-- =========================================================================
-- Esegui questo script nel tuo Supabase SQL Editor per creare l'intera struttura
-- di gamification (tabelle, indici, trigger, policy RLS e seeding demo).

-- 1. Tabella delle Organizzazioni (Palestre/PT)
CREATE TABLE IF NOT EXISTS public.gyms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    country TEXT NOT NULL DEFAULT 'IT',
    timezone TEXT NOT NULL DEFAULT 'Europe/Rome',
    plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abilita RLS per gyms
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- 2. Tabella di Associazione Membri (Multi-Tenant Bridge)
CREATE TABLE IF NOT EXISTS public.gym_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'coach', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_gym_user UNIQUE(gym_id, user_id)
);

-- Abilita RLS per gym_members
ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;

-- 3. Tabella Stagioni (Battle Pass)
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_dates CHECK (start_date < end_date)
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- 4. Tabella Sfide / Challenges
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('workout_count', 'workout_duration', 'volume_lifted', 'streak_days')),
    target_value NUMERIC NOT NULL,
    unit TEXT NOT NULL, -- 'workouts', 'minutes', 'kg', 'days'
    points_reward INT NOT NULL DEFAULT 100,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_challenge_dates CHECK (start_date < end_date)
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- 5. Tabella Iscrizioni Sfide
CREATE TABLE IF NOT EXISTS public.challenge_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
    member_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'failed')),
    CONSTRAINT unique_enrollment UNIQUE(challenge_id, member_user_id)
);

ALTER TABLE public.challenge_enrollments ENABLE ROW LEVEL SECURITY;

-- 6. Tabella Progressi Sfide (Cache di lettura rapida per barre di progresso)
CREATE TABLE IF NOT EXISTS public.challenge_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
    member_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    current_value NUMERIC DEFAULT 0 NOT NULL,
    last_update_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_progress UNIQUE(challenge_id, member_user_id)
);

ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

-- 7. Registro Punti Ledger (Log immutabile per audit ed XP)
CREATE TABLE IF NOT EXISTS public.points_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    member_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('workout_logged', 'check_in', 'challenge_completed', 'referral', 'manual_adjustment')),
    source_id UUID, -- Riferimento esterno a workout_history.id o challenge_enrollments.id
    points INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

-- 8. Tabella Badge / Achievements
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- URL o codice icona (es. 'trophy', 'fire')
    criteria_type TEXT NOT NULL CHECK (criteria_type IN ('total_workouts', 'total_points', 'streak_days')),
    criteria_value NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- 9. Tabella Assegnazione Badge
CREATE TABLE IF NOT EXISTS public.member_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
    member_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_member_badge UNIQUE(badge_id, member_user_id)
);

ALTER TABLE public.member_badges ENABLE ROW LEVEL SECURITY;

-- 10. Tabella Premi / Rewards
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    cost_points INT NOT NULL CHECK (cost_points > 0),
    stock INT DEFAULT NULL, -- NULL indica stock illimitato
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- 11. Tabella Richieste Riscatto Premi
CREATE TABLE IF NOT EXISTS public.member_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
    member_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'delivered', 'rejected')),
    notes TEXT
);

ALTER TABLE public.member_rewards ENABLE ROW LEVEL SECURITY;

-- 12. Tabella Tracciamento Eventi Raw
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
    member_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;


-- =========================================================================
-- INDICI PRESTAZIONALI
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_gym_members_lookup ON public.gym_members (user_id, gym_id);
CREATE INDEX IF NOT EXISTS idx_challenges_gym ON public.challenges (gym_id, is_active);
CREATE INDEX IF NOT EXISTS idx_challenge_enrollments_lookup ON public.challenge_enrollments (member_user_id, status);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_lookup ON public.challenge_progress (member_user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON public.points_ledger (member_user_id, gym_id);
CREATE INDEX IF NOT EXISTS idx_events_analytics ON public.events (gym_id, event_type, created_at);


-- =========================================================================
-- CRITERI DI SICUREZZA E POLICY RLS (Row Level Security)
-- =========================================================================

-- Helper function per verificare se un utente appartiene a una palestra
CREATE OR REPLACE FUNCTION public.is_gym_member(gym_id UUID, user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.gym_members
        WHERE gym_members.gym_id = $1 AND gym_members.user_id = $2 AND gym_members.status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Helper function per verificare se un utente è staff della palestra (coach o admin)
CREATE OR REPLACE FUNCTION public.is_gym_staff(gym_id UUID, user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.gym_members
        WHERE gym_members.gym_id = $1 AND gym_members.user_id = $2 AND gym_members.status = 'active'
        AND gym_members.role IN ('coach', 'admin')
    );
END;
$$ LANGUAGE plpgsql;

-- 1. GYMS
CREATE POLICY "Everyone can read gyms" ON public.gyms FOR SELECT USING (true);

-- 2. GYM MEMBERS
CREATE POLICY "Members read gym members" ON public.gym_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff manage gym members" ON public.gym_members FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));

-- 3. SEASONS
CREATE POLICY "Seasons read by members" ON public.seasons FOR SELECT USING (public.is_gym_member(gym_id, auth.uid()));
CREATE POLICY "Seasons manage by staff" ON public.seasons FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));

-- 4. CHALLENGES
CREATE POLICY "Challenges read by members" ON public.challenges FOR SELECT USING (public.is_gym_member(gym_id, auth.uid()));
CREATE POLICY "Challenges manage by staff" ON public.challenges FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));

-- 5. CHALLENGE ENROLLMENTS
CREATE POLICY "Enrollments read by gym members" ON public.challenge_enrollments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.challenges c
        WHERE c.id = challenge_enrollments.challenge_id 
        AND public.is_gym_member(c.gym_id, auth.uid())
    )
);
CREATE POLICY "Enrollments modify by owner" ON public.challenge_enrollments FOR INSERT WITH CHECK (auth.uid() = member_user_id);
CREATE POLICY "Enrollments update by staff" ON public.challenge_enrollments FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.challenges c
        WHERE c.id = challenge_enrollments.challenge_id 
        AND public.is_gym_staff(c.gym_id, auth.uid())
    )
);

-- 6. CHALLENGE PROGRESS
CREATE POLICY "Progress read by gym members" ON public.challenge_progress FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.challenges c
        WHERE c.id = challenge_progress.challenge_id 
        AND public.is_gym_member(c.gym_id, auth.uid())
    )
);
CREATE POLICY "Progress modify by owner" ON public.challenge_progress FOR INSERT WITH CHECK (auth.uid() = member_user_id);
CREATE POLICY "Progress update by owner" ON public.challenge_progress FOR UPDATE USING (auth.uid() = member_user_id);

-- 7. POINTS LEDGER
CREATE POLICY "Ledger read by members" ON public.points_ledger FOR SELECT USING (public.is_gym_member(gym_id, auth.uid()));

-- 8. BADGES
CREATE POLICY "Badges read by members" ON public.badges FOR SELECT USING (public.is_gym_member(gym_id, auth.uid()));
CREATE POLICY "Badges manage by staff" ON public.badges FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));

-- 9. MEMBER BADGES
CREATE POLICY "Member badges read by members" ON public.member_badges FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.badges b
        WHERE b.id = member_badges.badge_id 
        AND public.is_gym_member(b.gym_id, auth.uid())
    )
);

-- 10. REWARDS
CREATE POLICY "Rewards read by members" ON public.rewards FOR SELECT USING (public.is_gym_member(gym_id, auth.uid()));
CREATE POLICY "Rewards manage by staff" ON public.rewards FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));

-- 11. MEMBER REWARDS
CREATE POLICY "Member rewards read by owners and staff" ON public.member_rewards FOR SELECT USING (
    auth.uid() = member_user_id OR EXISTS (
        SELECT 1 FROM public.rewards r
        WHERE r.id = member_rewards.reward_id 
        AND public.is_gym_staff(r.gym_id, auth.uid())
    )
);
CREATE POLICY "Member rewards insert by owner" ON public.member_rewards FOR INSERT WITH CHECK (auth.uid() = member_user_id);
CREATE POLICY "Member rewards update by staff" ON public.member_rewards FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.rewards r
        WHERE r.id = member_rewards.reward_id 
        AND public.is_gym_staff(r.gym_id, auth.uid())
    )
);

-- 12. EVENTS
CREATE POLICY "Events manage by staff" ON public.events FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));
CREATE POLICY "Events insert by owner" ON public.events FOR INSERT WITH CHECK (auth.uid() = member_user_id);


-- =========================================================================
-- LOGICA DI CALCOLO VOLUME (POSTGRESQL HELPER)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.calculate_workout_volume(exercises JSONB)
RETURNS NUMERIC AS $$
DECLARE
    total_volume NUMERIC := 0;
    ex JSONB;
    s JSONB;
    kg NUMERIC;
    reps INT;
    done BOOLEAN;
BEGIN
    IF exercises IS NULL OR jsonb_typeof(exercises) <> 'array' THEN
        RETURN 0;
    END IF;
    
    FOR ex IN SELECT * FROM jsonb_array_elements(exercises) LOOP
        IF ex ? 'setsData' AND jsonb_typeof(ex->'setsData') = 'array' THEN
            FOR s IN SELECT * FROM jsonb_array_elements(ex->'setsData') LOOP
                done := COALESCE((s->>'done')::BOOLEAN, TRUE);
                IF done THEN
                    kg := COALESCE((s->>'kg')::NUMERIC, 0);
                    reps := COALESCE((s->>'reps')::INT, 0);
                    total_volume := total_volume + (kg * reps);
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN total_volume;
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- TRIGGER ENGINE: PROCESS WORKOUT GAMIFICATION
-- =========================================================================
CREATE OR REPLACE FUNCTION public.process_workout_gamification()
RETURNS TRIGGER AS $$
DECLARE
    m_record RECORD;
    now_val TIMESTAMPTZ := now();
    workout_vol NUMERIC := 0;
    workout_dur NUMERIC := 0;
    c_record RECORD;
    b_record RECORD;
    prog_val NUMERIC;
    inc_val NUMERIC;
    points_sum INT;
    workouts_cnt INT;
BEGIN
    -- 1. Trova le affiliazioni attive del socio
    FOR m_record IN 
        SELECT gym_id FROM public.gym_members 
        WHERE user_id = NEW.user_id AND status = 'active'
    LOOP
        -- 2. Assegna 50 XP base per aver loggato l'allenamento (se non già presente)
        IF NOT EXISTS (
            SELECT 1 FROM public.points_ledger
            WHERE member_user_id = NEW.user_id 
              AND gym_id = m_record.gym_id 
              AND source_type = 'workout_logged' 
              AND source_id = NEW.id
        ) THEN
            INSERT INTO public.points_ledger (gym_id, member_user_id, source_type, source_id, points, created_at)
            VALUES (m_record.gym_id, NEW.user_id, 'workout_logged', NEW.id, 50, now_val);
        END IF;

        -- Calcola metriche una sola volta per ciclo
        workout_vol := public.calculate_workout_volume(NEW.exercises);
        IF NEW.started_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
            workout_dur := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60.0;
        ELSE
            workout_dur := 45.0; -- fallback
        END IF;

        -- 3. Aggiorna sfide attive
        FOR c_record IN 
            SELECT c.*, ce.status AS enroll_status
            FROM public.challenges c
            JOIN public.challenge_enrollments ce ON ce.challenge_id = c.id
            WHERE c.gym_id = m_record.gym_id
              AND c.is_active = TRUE
              AND c.start_date <= now_val
              AND c.end_date >= now_val
              AND ce.member_user_id = NEW.user_id
              AND ce.status = 'enrolled'
        LOOP
            inc_val := 0;
            IF c_record.type = 'workout_count' THEN
                inc_val := 1.0;
            ELSIF c_record.type = 'workout_duration' THEN
                inc_val := ROUND(workout_dur, 2);
            ELSIF c_record.type = 'volume_lifted' THEN
                inc_val := workout_vol;
            END IF;

            IF inc_val > 0 THEN
                -- Upsert progress
                INSERT INTO public.challenge_progress (challenge_id, member_user_id, current_value, last_update_at)
                VALUES (c_record.id, NEW.user_id, inc_val, now_val)
                ON CONFLICT (challenge_id, member_user_id) 
                DO UPDATE SET 
                    current_value = public.challenge_progress.current_value + inc_val,
                    last_update_at = now_val
                RETURNING current_value INTO prog_val;

                -- Controlla completamento
                IF prog_val >= c_record.target_value THEN
                    -- Segna come completato
                    UPDATE public.challenge_enrollments 
                    SET status = 'completed'
                    WHERE challenge_id = c_record.id AND member_user_id = NEW.user_id;

                    -- Assegna XP bonus
                    INSERT INTO public.points_ledger (gym_id, member_user_id, source_type, source_id, points, created_at)
                    VALUES (m_record.gym_id, NEW.user_id, 'challenge_completed', c_record.id, c_record.points_reward, now_val);
                END IF;
            END IF;
        END LOOP;

        -- 4. Controlla e sblocca badge
        SELECT COALESCE(SUM(points), 0) INTO points_sum
        FROM public.points_ledger
        WHERE member_user_id = NEW.user_id AND gym_id = m_record.gym_id;

        SELECT COUNT(id) INTO workouts_cnt
        FROM public.workout_history
        WHERE user_id = NEW.user_id;

        FOR b_record IN
            SELECT * FROM public.badges b
            WHERE b.gym_id = m_record.gym_id
              AND b.id NOT IN (
                  SELECT badge_id FROM public.member_badges 
                  WHERE member_user_id = NEW.user_id
              )
        LOOP
            IF (b_record.criteria_type = 'total_workouts' AND workouts_cnt >= b_record.criteria_value) OR
               (b_record.criteria_type = 'total_points' AND points_sum >= b_record.criteria_value) THEN
                
                INSERT INTO public.member_badges (badge_id, member_user_id, earned_at)
                VALUES (b_record.id, NEW.user_id, now_val)
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Associa il trigger alla tabella workout_history
DROP TRIGGER IF EXISTS tr_after_workout_insert ON public.workout_history;
CREATE TRIGGER tr_after_workout_insert
AFTER INSERT ON public.workout_history
FOR EACH ROW
EXECUTE FUNCTION public.process_workout_gamification();


-- =========================================================================
-- FUNZIONE DI AUTO-SEEDING PER IL BATTLE PASS (RPC)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.seed_user_engage_demo()
RETURNS void AS $$
DECLARE
    gym_id_val UUID := '8e3cdde9-906d-495c-9c04-f481a5a1f6a1';
    season_id_val UUID := 'c35b3e21-5a5f-410a-8bf8-2fa56cc1b913';
    c1_id UUID := 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    c2_id UUID := 'e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b';
    c3_id UUID := 'f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c';
    now_val TIMESTAMPTZ := now();
    user_id_val UUID;
BEGIN
    user_id_val := auth.uid();
    IF user_id_val IS NULL THEN
        RAISE EXCEPTION 'Utente non autenticato';
    END IF;

    -- 1. Crea palestra demo
    INSERT INTO public.gyms (id, name, logo_url, country, timezone, plan)
    VALUES (gym_id_val, 'Olympus HQ', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200', 'IT', 'Europe/Rome', 'pro')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    -- 2. Associa utente come membro
    INSERT INTO public.gym_members (gym_id, user_id, role, status)
    VALUES (gym_id_val, user_id_val, 'member', 'active')
    ON CONFLICT (gym_id, user_id) DO NOTHING;

    -- 3. Crea stagione
    INSERT INTO public.seasons (id, gym_id, name, description, start_date, end_date, is_active)
    VALUES (season_id_val, gym_id_val, 'Stagione Zero', 'La prima storica stagione di PUMP Engage', now_val - INTERVAL '7 days', now_val + INTERVAL '30 days', true)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Crea sfide di default
    INSERT INTO public.challenges (id, gym_id, season_id, title, description, type, target_value, unit, points_reward, start_date, end_date, is_active)
    VALUES 
    (c1_id, gym_id_val, season_id_val, 'Pioniere', 'Completa 5 allenamenti in totale per sbloccare questa sfida', 'workout_count', 5, 'workouts', 150, now_val - INTERVAL '7 days', now_val + INTERVAL '30 days', true),
    (c2_id, gym_id_val, season_id_val, 'Sollevatore di Ferro', 'Solleva un volume complessivo di 5.000 kg', 'volume_lifted', 5000, 'kg', 300, now_val - INTERVAL '7 days', now_val + INTERVAL '30 days', true),
    (c3_id, gym_id_val, season_id_val, 'Costanza Suprema', 'Accumula 200 minuti complessivi di allenamento', 'workout_duration', 200, 'minutes', 200, now_val - INTERVAL '7 days', now_val + INTERVAL '30 days', true)
    ON CONFLICT (id) DO NOTHING;

    -- 5. Crea badge di default
    INSERT INTO public.badges (id, gym_id, name, description, icon, criteria_type, criteria_value)
    VALUES 
    ('b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', gym_id_val, 'Benvenuto a Bordo', 'Completa il tuo primo allenamento', 'workspace_premium', 'total_workouts', 1),
    ('b2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', gym_id_val, 'Macchina da Guerra', 'Raggiungi 1.000 XP in classifica', 'military_tech', 'total_points', 1000)
    ON CONFLICT (id) DO NOTHING;

    -- 6. Assegna punti di partenza (200 XP)
    INSERT INTO public.points_ledger (gym_id, member_user_id, source_type, source_id, points, created_at)
    VALUES (gym_id_val, user_id_val, 'manual_adjustment', null, 200, now_val);

    -- 7. Iscrivi utente alle sfide
    INSERT INTO public.challenge_enrollments (challenge_id, member_user_id, status)
    VALUES 
    (c1_id, user_id_val, 'enrolled'),
    (c2_id, user_id_val, 'enrolled'),
    (c3_id, user_id_val, 'enrolled')
    ON CONFLICT (challenge_id, member_user_id) DO NOTHING;

    INSERT INTO public.challenge_progress (challenge_id, member_user_id, current_value, last_update_at)
    VALUES 
    (c1_id, user_id_val, 0.0, now_val),
    (c2_id, user_id_val, 0.0, now_val),
    (c3_id, user_id_val, 0.0, now_val)
    ON CONFLICT (challenge_id, member_user_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
