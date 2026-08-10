-- CREAZIONE ARCHIVIO ESERCIZI (LIBRARY)
-- Tabella per l'archivio esercizi diviso per gruppi muscolari

CREATE TABLE IF NOT EXISTS public.exercise_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL, -- 'petto', 'dorso', 'gambe', 'spalle', 'braccia', 'addome', 'cardio'
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view exercises" ON public.exercise_library FOR SELECT USING (true);
CREATE POLICY "Admins manage exercises" ON public.exercise_library FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- SEED DATA (Popolamento Iniziale)
INSERT INTO public.exercise_library (name, muscle_group) VALUES
-- PETTO
('Panca Piana Bilanciere', 'petto'),
('Panca Inclinata Manubri', 'petto'),
('Croci Manubri Panca Piana', 'petto'),
('Spinte Panca Piana Manubri', 'petto'),
('Pectoral Machine', 'petto'),
('Chest Press', 'petto'),
('Dip Parallele', 'petto'),
('Crossover ai Cavi', 'petto'),

-- DORSO
('Trazioni alla Sbarra', 'dorso'),
('Lat Machine Avanti', 'dorso'),
('Lat Machine Dietro', 'dorso'),
('Rematore Bilanciere', 'dorso'),
('Rematore Manubrio', 'dorso'),
('Pulley Basso', 'dorso'),
('Vertical Row', 'dorso'),
('Pull Down Braccia Tese', 'dorso'),

-- GAMBE
('Squat Bilanciere', 'gambe'),
('Leg Press 45°', 'gambe'),
('Affondi Manubri', 'gambe'),
('Leg Extension', 'gambe'),
('Leg Curl Sdraiato', 'gambe'),
('Leg Curl Seduto', 'gambe'),
('Stacco da Terra (Deadlift)', 'gambe'),
('Calf Machine', 'gambe'),
('Squat Bulgaro', 'gambe'),

-- SPALLE
('Military Press', 'spalle'),
('Lento Avanti Manubri', 'spalle'),
('Alzate Laterali', 'spalle'),
('Alzate Frontali', 'spalle'),
('Alzate Posteriori 90°', 'spalle'),
('Face Pull', 'spalle'),
('Tirate al Mento', 'spalle'),

-- BRACCIA
('Curl Bilanciere in Piedi', 'braccia'),
('Curl Manubri Alternato', 'braccia'),
('Hammer Curl', 'braccia'),
('Preacher Curl (Panca Scott)', 'braccia'),
('French Press Bilanciere', 'braccia'),
('Push Down Cavi', 'braccia'),
('Estensioni Dietro Nuca', 'braccia'),
('Dip tra Panche', 'braccia'),

-- ADDOME
('Crunch a Terra', 'addome'),
('Plank', 'addome'),
('Leg Raise', 'addome'),
('Russian Twist', 'addome'),
('Ab Roller', 'addome');
