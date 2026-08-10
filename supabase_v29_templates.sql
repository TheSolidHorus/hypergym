CREATE TABLE IF NOT EXISTS public.workout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  days TEXT,
  exercises JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view templates" ON public.workout_templates FOR SELECT USING (true);
CREATE POLICY "Admins manage templates" ON public.workout_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);
