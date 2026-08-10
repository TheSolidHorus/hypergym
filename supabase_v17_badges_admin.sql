-- Sblocca la gestione dei Badge per gli Admin
-- Esegui questo script in Supabase per poter aggiungere/rimuovere badge agli utenti

CREATE POLICY "Admins manage all achievements" ON achievements
FOR ALL
USING (
  get_my_role() IN ('admin', 'trainer')
);
