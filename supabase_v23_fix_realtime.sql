-- FIX NOTIFICHE LIVE v23
-- Abilita la ricezione in tempo reale per Messaggi e Notifiche
-- Se ti da errore "relation already in publication" ignoralo, significa che è già attivo.

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE notifications';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE messages';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE coaching_requests';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
