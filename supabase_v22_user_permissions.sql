-- FIX PERMESSI v22 (Cancellazione Utenti)
-- Permetti agli utenti di eliminare le PROPRIE schede
DROP POLICY IF EXISTS "Users can delete own workout_plans" ON public.workout_plans;

CREATE POLICY "Users can delete own workout_plans"
ON public.workout_plans
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);
