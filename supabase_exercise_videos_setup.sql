-- =========================================================
-- SISTEMA GESTIONE VIDEO ESERCIZI - ADMIN UPLOAD
-- =========================================================

-- 1. CREA BUCKET STORAGE per VIDEO ESERCIZI
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exercise-videos', 'exercise-videos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. POLICY STORAGE (RLS)

-- Chiunque può VEDERE i video (Public Read)
DROP POLICY IF EXISTS "Public Access Videos" ON storage.objects;
CREATE POLICY "Public Access Videos" ON storage.objects
FOR SELECT USING ( bucket_id = 'exercise-videos' );

-- Solo ADMIN/TRAINER possono CARICARE video
DROP POLICY IF EXISTS "Admin Upload Videos" ON storage.objects;
CREATE POLICY "Admin Upload Videos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'exercise-videos' AND
    auth.role() = 'authenticated' AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR role = 'trainer')
    )
);

-- Solo ADMIN/TRAINER possono CANCELLARE video
DROP POLICY IF EXISTS "Admin Delete Videos" ON storage.objects;
CREATE POLICY "Admin Delete Videos" ON storage.objects
FOR DELETE USING (
    bucket_id = 'exercise-videos' AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR role = 'trainer')
    )
);

-- 3. NOTA: La tabella exercise_videos esiste già (dallo schema precedente)
-- Verifica che esista con questa struttura:

CREATE TABLE IF NOT EXISTS exercise_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_name TEXT NOT NULL UNIQUE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS su exercise_videos
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere i video
DROP POLICY IF EXISTS "Public Read Videos" ON exercise_videos;
CREATE POLICY "Public Read Videos" ON exercise_videos
FOR SELECT USING (true);

-- Solo admin/trainer possono inserire
DROP POLICY IF EXISTS "Admin Insert Videos" ON exercise_videos;
CREATE POLICY "Admin Insert Videos" ON exercise_videos
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR role = 'trainer')
    )
);

-- Solo admin/trainer possono aggiornare
DROP POLICY IF EXISTS "Admin Update Videos" ON exercise_videos;
CREATE POLICY "Admin Update Videos" ON exercise_videos
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR role = 'trainer')
    )
);

-- Solo admin/trainer possono cancellare
DROP POLICY IF EXISTS "Admin Delete Videos Entry" ON exercise_videos;
CREATE POLICY "Admin Delete Videos Entry" ON exercise_videos
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR role = 'trainer')
    )
);

-- =========================================================
-- ESEGUI QUESTO SCRIPT SU SUPABASE SQL EDITOR
-- =========================================================
