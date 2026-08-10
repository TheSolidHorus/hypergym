-- FIX REGISTRAZIONE VERSION 2 (PIÙ ROBUSTO)
-- Questo script forza l'inserimento di tutti i campi obbligatori per evitare errori "Not Null"

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    role,
    training_days_goal,
    streak,
    workouts_completed,
    certificate_uploaded,
    created_at
  )
  VALUES (
    new.id,
    new.email, -- Assicurati che 'email' esista nella tabella profiles
    COALESCE(new.raw_user_meta_data->>'name', 'Nuovo Utente'),
    'client',
    3, -- Default
    0, -- Streak (anche se rimossa visivamente, il DB potrebbe richiederla)
    0, -- Workouts
    false, -- Certificate
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = COALESCE(public.profiles.name, EXCLUDED.name);
    
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Logga l'errore ma non bloccare tutto (se possibile)
    -- O meglio, fai fallire in modo chiaro
    RAISE LOG 'Errore nel trigger handle_new_user: %', SQLERRM;
    RETURN new; -- Permetti la creazione utente anche se il profilo fallisce (così almeno l'utente esiste e possiamo debuggare)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ricrea Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
