-- ==============================================================================
-- PUMP APP - SECURITY PATCH v31 (Security Audit Fixes)
-- ==============================================================================
-- Applica questa patch dopo supabase_v30_SECURITY_SHIELD.sql
-- Risolve: HIGH-04 (notifications INSERT policy aperta)

-- ==============================================================================
-- 1. FIX: Policy INSERT notifications (HIGH-04)
-- ==============================================================================
-- PROBLEMA: "Everyone insert notifications" WITH CHECK (true)
-- permetteva a qualsiasi utente autenticato di inviare notifiche a chiunque.
--
-- SOLUZIONE: Solo l'utente proprietario o admin/trainer possono inserire notifiche.
-- I trigger DB (es. notify_new_message) usano SECURITY DEFINER quindi non vengono
-- bloccati da questa policy.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone insert notifications" ON public.notifications;

-- Gli utenti possono inserire solo notifiche per sé stessi
CREATE POLICY "Users insert own notifications" ON public.notifications
FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

-- Admin e trainer possono inviare notifiche a qualsiasi utente (per notifiche sistema)
DROP POLICY IF EXISTS "Staff can insert any notification" ON public.notifications;
CREATE POLICY "Staff can insert any notification" ON public.notifications
FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'trainer', 'coach')
);

-- ==============================================================================
-- 2. FIX: Rimuovere policy INSERT aperta su workout_plans (doppia protezione)
-- ==============================================================================
-- La policy "Enable insert for authenticated" (WITH CHECK auth.role() = 'authenticated')
-- permetteva a qualsiasi utente di creare schede per qualsiasi user_id.
-- La rimpiazziamo con una più stretta (già presente in v30 come "Creazione schede sicura").

DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.workout_plans;
-- La policy corretta è già presente da v30:
-- CREATE POLICY "Creazione schede sicura" ON workout_plans FOR INSERT
-- WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 3. AGGIUNTA COLONNE OTP per protezione brute-force (HIGH-02)
-- ==============================================================================
-- Nota: Queste colonne sono usate dal backend FastAPI (backend/app/models.py).
-- Se usi SOLO Supabase Auth (non il backend FastAPI custom), questo blocco
-- non è necessario — Supabase gestisce già il rate limiting dell'OTP.

-- Queste colonne si applicano alla tabella 'users' del backend SQLite, non Supabase.
-- Documentato qui per tracciabilità.

-- ==============================================================================
-- 4. AUDIT LOG: traccia accessi admin (opzionale, consigliato)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,       -- es. 'set_role', 'delete_user', 'upload_video'
    target_id UUID,             -- ID dell'entità modificata
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo gli admin possono vedere il log
CREATE POLICY "Only admins can view audit log" ON public.admin_audit_log
FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Solo il sistema (SECURITY DEFINER functions) può inserire nel log
-- Nessun INSERT diretto da client
CREATE POLICY "No direct insert to audit log" ON public.admin_audit_log
FOR INSERT WITH CHECK (false);
