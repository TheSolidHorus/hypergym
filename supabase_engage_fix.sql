-- =========================================================================
-- FIX ENGAGE: Rimuovi e ricrea tutte le policy RLS
-- Esegui QUESTO script se hai già eseguito supabase_engage_setup.sql
-- e ricevi errori "policy already exists"
-- =========================================================================

-- =========================================================================
-- STEP 1: Elimina tutte le policy esistenti
-- =========================================================================
DO $$
BEGIN
    -- GYMS
    DROP POLICY IF EXISTS "Everyone can read gyms" ON public.gyms;

    -- GYM MEMBERS
    DROP POLICY IF EXISTS "Members read gym members" ON public.gym_members;
    DROP POLICY IF EXISTS "Staff manage gym members" ON public.gym_members;

    -- SEASONS
    DROP POLICY IF EXISTS "Seasons read by members" ON public.seasons;
    DROP POLICY IF EXISTS "Seasons manage by staff" ON public.seasons;

    -- CHALLENGES
    DROP POLICY IF EXISTS "Challenges read by members" ON public.challenges;
    DROP POLICY IF EXISTS "Challenges manage by staff" ON public.challenges;

    -- CHALLENGE ENROLLMENTS
    DROP POLICY IF EXISTS "Enrollments read by gym members" ON public.challenge_enrollments;
    DROP POLICY IF EXISTS "Enrollments modify by owner" ON public.challenge_enrollments;
    DROP POLICY IF EXISTS "Enrollments update by staff" ON public.challenge_enrollments;

    -- CHALLENGE PROGRESS
    DROP POLICY IF EXISTS "Progress read by gym members" ON public.challenge_progress;
    DROP POLICY IF EXISTS "Progress modify by owner" ON public.challenge_progress;
    DROP POLICY IF EXISTS "Progress update by owner" ON public.challenge_progress;

    -- POINTS LEDGER
    DROP POLICY IF EXISTS "Ledger read by members" ON public.points_ledger;

    -- BADGES
    DROP POLICY IF EXISTS "Badges read by members" ON public.badges;
    DROP POLICY IF EXISTS "Badges manage by staff" ON public.badges;

    -- MEMBER BADGES
    DROP POLICY IF EXISTS "Member badges read by members" ON public.member_badges;

    -- REWARDS
    DROP POLICY IF EXISTS "Rewards read by members" ON public.rewards;
    DROP POLICY IF EXISTS "Rewards manage by staff" ON public.rewards;

    -- MEMBER REWARDS
    DROP POLICY IF EXISTS "Member rewards read by owners and staff" ON public.member_rewards;
    DROP POLICY IF EXISTS "Member rewards insert by owner" ON public.member_rewards;
    DROP POLICY IF EXISTS "Member rewards update by staff" ON public.member_rewards;

    -- EVENTS
    DROP POLICY IF EXISTS "Events manage by staff" ON public.events;
    DROP POLICY IF EXISTS "Events insert by owner" ON public.events;

    RAISE NOTICE 'Tutte le policy esistenti eliminate correttamente.';
END $$;


-- =========================================================================
-- STEP 2: Helper functions (sicure da rieseguire con OR REPLACE)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_gym_member(gym_id UUID, user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.gym_members
        WHERE gym_members.gym_id = $1 AND gym_members.user_id = $2 AND gym_members.status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

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


-- =========================================================================
-- STEP 3: Ricrea tutte le policy
-- =========================================================================

-- GYMS
CREATE POLICY "Everyone can read gyms" ON public.gyms FOR SELECT USING (true);

-- GYM MEMBERS
CREATE POLICY "Members read gym members" ON public.gym_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff manage gym members" ON public.gym_members FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));

-- SEASONS
CREATE POLICY "Seasons read by members" ON public.seasons FOR SELECT USING (public.is_gym_member(gym_id, auth.uid()));
CREATE POLICY "Seasons manage by staff" ON public.seasons FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));

-- CHALLENGES
CREATE POLICY "Challenges read by members" ON public.challenges FOR SELECT USING (public.is_gym_member(gym_id, auth.uid()));
CREATE POLICY "Challenges manage by staff" ON public.challenges FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));

-- CHALLENGE ENROLLMENTS
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

-- CHALLENGE PROGRESS
CREATE POLICY "Progress read by gym members" ON public.challenge_progress FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.challenges c
        WHERE c.id = challenge_progress.challenge_id
        AND public.is_gym_member(c.gym_id, auth.uid())
    )
);
CREATE POLICY "Progress modify by owner" ON public.challenge_progress FOR INSERT WITH CHECK (auth.uid() = member_user_id);
CREATE POLICY "Progress update by owner" ON public.challenge_progress FOR UPDATE USING (auth.uid() = member_user_id);

-- POINTS LEDGER
CREATE POLICY "Ledger read by members" ON public.points_ledger FOR SELECT USING (public.is_gym_member(gym_id, auth.uid()));

-- BADGES
CREATE POLICY "Badges read by members" ON public.badges FOR SELECT USING (public.is_gym_member(gym_id, auth.uid()));
CREATE POLICY "Badges manage by staff" ON public.badges FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));

-- MEMBER BADGES
CREATE POLICY "Member badges read by members" ON public.member_badges FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.badges b
        WHERE b.id = member_badges.badge_id
        AND public.is_gym_member(b.gym_id, auth.uid())
    )
);

-- REWARDS
CREATE POLICY "Rewards read by members" ON public.rewards FOR SELECT USING (public.is_gym_member(gym_id, auth.uid()));
CREATE POLICY "Rewards manage by staff" ON public.rewards FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));

-- MEMBER REWARDS
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

-- EVENTS
CREATE POLICY "Events manage by staff" ON public.events FOR ALL USING (public.is_gym_staff(gym_id, auth.uid()));
CREATE POLICY "Events insert by owner" ON public.events FOR INSERT WITH CHECK (auth.uid() = member_user_id);


-- =========================================================================
-- STEP 4: Riassegna il trigger (sicuro da rieseguire)
-- =========================================================================
DROP TRIGGER IF EXISTS tr_after_workout_insert ON public.workout_history;
CREATE TRIGGER tr_after_workout_insert
AFTER INSERT ON public.workout_history
FOR EACH ROW
EXECUTE FUNCTION public.process_workout_gamification();

-- =========================================================================
-- COMPLETATO! Ora torna sull'app e premi "Attiva Battle Pass Demo"
-- =========================================================================
SELECT 'Setup completato! Torna sull app e premi Attiva Battle Pass Demo.' AS risultato;
