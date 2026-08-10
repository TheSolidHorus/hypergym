-- FIX PER LE VISIBILITA' ADMIN
-- Esegui questo script in Supabase (SQL Editor) per sbloccare la lista atleti

-- 1. Crea funzione per controllare il ruolo in sicurezza (evita loop infiniti)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. Policy: Gli Admin/Trainer possono vedere TUTTI i profili
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;

CREATE POLICY "Admins view all profiles" ON profiles
FOR SELECT
USING (
  get_my_role() IN ('admin', 'trainer')
);
