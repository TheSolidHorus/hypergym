-- =======================================================
-- SCRIPT v15: RICHIESTE COACHING
-- =======================================================
-- Esegui questo script per attivare la funzione "Richiedi Scheda"

-- 1. Create Request Table
CREATE TABLE IF NOT EXISTS coaching_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    location TEXT NOT NULL CHECK (location IN ('home', 'gym')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE coaching_requests ENABLE ROW LEVEL SECURITY;

-- 3. Policies

-- Utenti possono creare richieste
DROP POLICY IF EXISTS "Users create requests" ON coaching_requests;
CREATE POLICY "Users create requests" ON coaching_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Utenti vedono le PROPRIE richieste
DROP POLICY IF EXISTS "Users view own requests" ON coaching_requests;
CREATE POLICY "Users view own requests" ON coaching_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Admin/Trainer vedono TUTTE le richieste
DROP POLICY IF EXISTS "Admins view all requests" ON coaching_requests;
CREATE POLICY "Admins view all requests" ON coaching_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'trainer')
        )
    );

-- Admin/Trainer possono aggiornare status (es. completato)
DROP POLICY IF EXISTS "Admins update requests" ON coaching_requests;
CREATE POLICY "Admins update requests" ON coaching_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'trainer')
        )
    );
