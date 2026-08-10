-- =============================================================================
-- PUMP v32 — Aggiungi colonna video_url a exercise_library
-- Esegui questo script nel pannello SQL di Supabase
-- =============================================================================

-- Aggiunge colonna video_url alla tabella exercise_library
ALTER TABLE exercise_library
    ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Aggiunge colonna muscle_group se non esiste (per sicurezza)
ALTER TABLE exercise_library
    ADD COLUMN IF NOT EXISTS description TEXT;

-- Commento esplicativo
COMMENT ON COLUMN exercise_library.video_url IS 'URL pubblico del video dimostrativo caricato su Supabase Storage (bucket exercise-videos)';

-- Verifica
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'exercise_library'
ORDER BY ordinal_position;
