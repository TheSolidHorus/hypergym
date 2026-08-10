-- Fix Cancellazione Richieste
-- Esegui questo script per permettere agli admin di cancellare le richieste

CREATE POLICY "Admins delete requests" ON coaching_requests
FOR DELETE
USING (
  get_my_role() IN ('admin', 'trainer')
);
