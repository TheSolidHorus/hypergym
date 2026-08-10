-- FIX PERMESSI v21
-- Permetti agli admin/trainer di cancellare qualsiasi scheda in workout_plans
DROP POLICY IF EXISTS "Admins can delete workout_plans" ON public.workout_plans;

CREATE POLICY "Admins can delete workout_plans"
ON public.workout_plans
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer')
  )
);
