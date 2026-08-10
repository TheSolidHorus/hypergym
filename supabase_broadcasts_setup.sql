-- ============================================================
-- PUMP APP - BROADCASTS (COMUNICAZIONI ADMIN)
-- Esegui questo script nell'SQL Editor del tuo progetto Supabase
-- ============================================================

-- 1. Tabella BROADCASTS (le comunicazioni create dagli admin)
CREATE TABLE public.broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,           -- URL immagine (da Supabase Storage)
  type TEXT NOT NULL DEFAULT 'annuncio',   -- 'annuncio' | 'offerta' | 'avviso' | 'novita'
  target TEXT NOT NULL DEFAULT 'all',     -- 'all' | 'clients' | 'trainers'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ                  -- Opzionale: scadenza fissa (non legata alla lettura)
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Solo admin può creare
CREATE POLICY "Admin can insert broadcasts" ON public.broadcasts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin può aggiornare/eliminare
CREATE POLICY "Admin can manage broadcasts" ON public.broadcasts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tutti gli utenti autenticati possono leggere i broadcast loro destinati
-- (Il filtraggio "cliente" vs "trainer" è fatto lato frontend + RLS non blocca il SELECT)
CREATE POLICY "Authenticated can view broadcasts" ON public.broadcasts
  FOR SELECT USING (auth.role() = 'authenticated');


-- 2. Tabella BROADCAST_READS (chi ha letto cosa e quando)
CREATE TABLE public.broadcast_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID REFERENCES public.broadcasts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id)  -- Un utente legge una comunicazione UNA VOLTA SOLA
);

ALTER TABLE public.broadcast_reads ENABLE ROW LEVEL SECURITY;

-- L'utente può segnare se stesso come "ha letto"
CREATE POLICY "Users can mark own reads" ON public.broadcast_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- L'utente vede le proprie letture
CREATE POLICY "Users view own reads" ON public.broadcast_reads
  FOR SELECT USING (auth.uid() = user_id);

-- Admin vede tutte le letture (per statistiche)
CREATE POLICY "Admin view all reads" ON public.broadcast_reads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 3. Storage Bucket per immagini comunicazioni
-- Esegui da Supabase Dashboard > Storage > New Bucket
-- Nome: "broadcasts"
-- Public: TRUE (le immagini nelle comunicazioni sono pubbliche)
-- (NON si può creare un bucket via SQL standard, va fatto dalla dashboard)

-- Aggiungi questa riga in supabase_realtime per notifiche live (opzionale)
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE broadcasts';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
