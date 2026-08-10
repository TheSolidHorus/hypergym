-- ============================================================
-- PUMP v33: Verifica codice palestra lato server (sicurezza)
-- Esegui in: Supabase Dashboard → SQL Editor
-- ============================================================
-- PROBLEMA: il codice palestra veniva fetchato nel client e
-- confrontato in JS → chiunque poteva vedere il codice in DevTools.
-- SOLUZIONE: RPC che restituisce solo true/false senza esporre il codice.

CREATE OR REPLACE FUNCTION verify_gym_code(input_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gyms
    WHERE UPPER(access_code) = UPPER(TRIM(input_code))
    LIMIT 1
  );
END;
$$;

-- Permetti chiamata anche a utenti non autenticati (serve durante la registrazione)
GRANT EXECUTE ON FUNCTION verify_gym_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_gym_code(TEXT) TO authenticated;

-- Verifica che funzioni:
-- SELECT verify_gym_code('PUMP2026'); -- deve restituire true se il codice esiste
