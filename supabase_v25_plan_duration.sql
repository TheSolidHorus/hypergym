-- v25: DURATA SCHEDE E NOTIFICHE SCADENZA

-- 1. Aggiungi colonne alla tabella workout_plans
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS duration_weeks INT DEFAULT 4;
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS notification_status JSONB DEFAULT '{}'::JSONB;

-- 2. Funzione per controllare le scadenze e inviare notifiche
-- Questa funzione deve essere chiamata periodicamente (es. all'apertura dell'app o via cron)
CREATE OR REPLACE FUNCTION check_plan_expirations() RETURNS void AS $$
DECLARE
  p RECORD;
  created_date DATE;
  expiration_date DATE;
  days_left INT;
BEGIN
  FOR p IN SELECT * FROM public.workout_plans LOOP
    -- Assumi created_at come data inizio (truncato al giorno)
    created_date := p.created_at::DATE;
    expiration_date := created_date + (p.duration_weeks * 7);
    days_left := expiration_date - CURRENT_DATE;

    -- 2 SETTIMANE (14 giorni)
    IF days_left <= 14 AND days_left > 7 AND (p.notification_status->>'2w') IS NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (p.user_id, 'info', 'La tua scheda scade tra 2 settimane!', 'Ti mancano 2 settimane alla fine della scheda ' || p.name || '. Preparati per il cambio!', jsonb_build_object('plan_id', p.id));
      
      UPDATE public.workout_plans SET notification_status = jsonb_set(COALESCE(notification_status, '{}'::jsonb), '{2w}', 'true') WHERE id = p.id;
    END IF;

    -- 1 SETTIMANA (7 giorni)
    IF days_left <= 7 AND days_left > 3 AND (p.notification_status->>'1w') IS NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (p.user_id, 'alert', 'Manca 1 settimana al cambio scheda!', 'Tra 7 giorni scade la tua scheda ' || p.name || '.', jsonb_build_object('plan_id', p.id));
      
      UPDATE public.workout_plans SET notification_status = jsonb_set(COALESCE(notification_status, '{}'::jsonb), '{1w}', 'true') WHERE id = p.id;
    END IF;

    -- 3 GIORNI
    IF days_left <= 3 AND days_left >= 0 AND (p.notification_status->>'3d') IS NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (p.user_id, 'alert', '⚠️ La tua scheda sta per scadere!', 'Mancano solo 3 giorni alla fine di ' || p.name || '! Contatta il coach.', jsonb_build_object('plan_id', p.id));
      
      UPDATE public.workout_plans SET notification_status = jsonb_set(COALESCE(notification_status, '{}'::jsonb), '{3d}', 'true') WHERE id = p.id;
    END IF;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
