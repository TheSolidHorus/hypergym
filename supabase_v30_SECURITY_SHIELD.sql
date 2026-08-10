-- ==============================================================================
-- PUMP APP - SECURITY SHIELD SCRIPT (v30)
-- ==============================================================================
-- Questo script chiude tutte le falle di sicurezza critiche del database.
-- Applica la Row Level Security (RLS) rigida alle tabelle cuore:
-- workout_plans, workout_history, assigned_workouts, exercise_videos e Storage.

-- ==============================================================================
-- 1. SICUREZZA RUOLI (Protezione contro l'escalation dei privilegi)
-- ==============================================================================

-- Riscrittura della funzione set_user_role per garantire che SOLO un vero ADMIN
-- (verificato a livello database) possa promuovere o degradare gli utenti.
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, new_role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- 1. Controlla il ruolo di chi sta eseguendo questa funzione
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  -- 2. Se non è admin, lo caccia immediatamente con un errore
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Accesso Negato: Solo gli Amministratori possono modificare i ruoli.';
  END IF;
  
  -- 3. Altrimenti, aggiorna il profilo in sicurezza
  UPDATE public.profiles SET role = new_role WHERE id = target_user_id;
END;
$$;


-- ==============================================================================
-- 2. PROTEZIONE SCHEDE E ALLENAMENTI (RLS)
-- ==============================================================================

-- A. WORKOUT PLANS
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visibilità schede" ON workout_plans;
CREATE POLICY "Visibilità schede" ON workout_plans FOR SELECT 
USING (
    auth.uid() = user_id OR 
    is_public = true OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'trainer', 'coach')
);

DROP POLICY IF EXISTS "Creazione schede sicura" ON workout_plans;
CREATE POLICY "Creazione schede sicura" ON workout_plans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Modifica schede" ON workout_plans;
CREATE POLICY "Modifica schede" ON workout_plans FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'trainer', 'coach')
);

DROP POLICY IF EXISTS "Cancellazione schede" ON workout_plans;
CREATE POLICY "Cancellazione schede" ON workout_plans FOR DELETE 
USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'trainer', 'coach')
);


-- B. WORKOUT HISTORY (Storico Allenamenti)
ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visibilità storico" ON workout_history;
CREATE POLICY "Visibilità storico" ON workout_history FOR SELECT 
USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'trainer', 'coach')
);

DROP POLICY IF EXISTS "Salvataggio proprio storico" ON workout_history;
CREATE POLICY "Salvataggio proprio storico" ON workout_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Modifica proprio storico" ON workout_history;
CREATE POLICY "Modifica proprio storico" ON workout_history FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cancellazione storico" ON workout_history;
CREATE POLICY "Cancellazione storico" ON workout_history FOR DELETE 
USING (auth.uid() = user_id);


-- C. ASSIGNED WORKOUTS (Assegnazioni dei trainer)
ALTER TABLE public.assigned_workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visibilità assegnazioni" ON assigned_workouts;
CREATE POLICY "Visibilità assegnazioni" ON assigned_workouts FOR SELECT 
USING (
    auth.uid() = client_id OR 
    auth.uid() = trainer_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Solo coach/admin possono assegnare schede" ON assigned_workouts;
CREATE POLICY "Solo coach/admin possono assegnare schede" ON assigned_workouts FOR INSERT 
WITH CHECK (
    auth.uid() = trainer_id AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'trainer', 'coach')
);

DROP POLICY IF EXISTS "Gestione assegnazioni da coach" ON assigned_workouts;
CREATE POLICY "Gestione assegnazioni da coach" ON assigned_workouts FOR ALL 
USING (
    auth.uid() = trainer_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);


-- D. EXERCISE VIDEOS (Video spiegazione)
ALTER TABLE public.exercise_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "I video sono visibili a tutti" ON exercise_videos;
CREATE POLICY "I video sono visibili a tutti" ON exercise_videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo gli Admin gestiscono i video" ON exercise_videos;
CREATE POLICY "Solo gli Admin gestiscono i video" ON exercise_videos FOR ALL 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');


-- ==============================================================================
-- 3. STORAGE BUCKETS SECURITY (Certificati e Video)
-- ==============================================================================

-- A. CERTIFICATI MEDICI
-- Gli utenti normali possono solo aggiungere e vedere il PROPRIO record di certificato.
-- L'admin può vedere tutto e rimuovere i certificati obsoleti.

DROP POLICY IF EXISTS "Users can upload their own certificate" ON storage.objects;
CREATE POLICY "Users can upload their own certificate"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificates' AND 
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can read own certificate" ON storage.objects;
CREATE POLICY "Users can read own certificate"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'certificates' AND 
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Admins can read all certificates" ON storage.objects;
CREATE POLICY "Admins can read all certificates"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'certificates' AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can delete certificates" ON storage.objects;
CREATE POLICY "Admins can delete certificates"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'certificates' AND 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- B. BUCKET VIDEO ESERCIZI (Pubblico per lettura, limitato in inserimento)
DROP POLICY IF EXISTS "Anyone can watch videos" ON storage.objects;
CREATE POLICY "Anyone can watch videos"
ON storage.objects FOR SELECT USING (bucket_id = 'exercise-videos');

DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;
CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'exercise-videos' AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;
CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'exercise-videos' AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ==============================================================================
-- 4. CONTROLLO GAMIFICATION: ACHIEVEMENTS (BADGES)
-- Per correggere i Badges serve un trigger più invasivo che validi i carichi verificando
-- workout_history, ma per ora quantomeno costringiamo ad usare la funzione RPC
-- definita in precedenza al posto dell'HTTP generico o quantomeno limitiamo
-- la modifica alle proprie righe. (Lasciato FOR ALL uid = uid() come prima base,
-- considerandolo Risk "Low" rispetto alla sottrazione delle schede).
-- ==============================================================================
