-- FIX ERRORE REGISTRAZIONE
-- Questo script ripara il "Trigger" automatico che crea il profilo quando un utente si registra.
-- Risolve l'errore "Database error saving new user".

-- 1. Definisci la funzione che gestisce i nuovi utenti
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Nuovo Utente'),
    'client'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(public.profiles.name, EXCLUDED.name); -- Mantieni nome esistente se c'è
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ricrea il Trigger (lo eliminiamo prima per sicurezza)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
