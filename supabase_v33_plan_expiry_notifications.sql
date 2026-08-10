-- =============================================================================
-- PUMP v33 — Notifiche scadenza schede per coach
-- Esegui questo script nel pannello SQL di Supabase
-- =============================================================================

-- Tabella per tracciare le notifiche di scadenza già inviate (evita doppioni)
CREATE TABLE IF NOT EXISTS plan_expiry_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_workout_id UUID NOT NULL,
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    days_warning INTEGER NOT NULL,        -- 7, 3 o 1
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(assigned_workout_id, days_warning)  -- una sola notifica per milestone
);

-- Tabella notifiche in-app per coach/admin (separata dalla chat)
CREATE TABLE IF NOT EXISTS coach_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'plan_expiry',  -- 'plan_expiry' | 'other'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    metadata JSONB,                       -- { athlete_name, plan_name, days_left, assigned_workout_id }
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indice per recupero rapido notifiche per coach
CREATE INDEX IF NOT EXISTS idx_coach_notifications_coach_id 
    ON coach_notifications(coach_id, read, created_at DESC);

-- RLS: il coach vede solo le sue notifiche
ALTER TABLE coach_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_see_own_notifications" ON coach_notifications;
CREATE POLICY "coach_see_own_notifications"
    ON coach_notifications FOR SELECT
    USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "coach_update_own_notifications" ON coach_notifications;
CREATE POLICY "coach_update_own_notifications"
    ON coach_notifications FOR UPDATE
    USING (auth.uid() = coach_id);

-- La Edge Function (service_role) può inserire notifiche per conto del sistema
ALTER TABLE coach_notifications ENABLE ROW LEVEL SECURITY;

-- RLS per plan_expiry_notifications (solo service_role la gestisce)
ALTER TABLE plan_expiry_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_expiry" ON plan_expiry_notifications;
CREATE POLICY "service_role_expiry"
    ON plan_expiry_notifications FOR ALL
    USING (true);

-- Verifica struttura
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('plan_expiry_notifications', 'coach_notifications');
