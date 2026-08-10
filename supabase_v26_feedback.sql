-- Tabella Feedback Utenti
CREATE TABLE IF NOT EXISTS public.app_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('bug', 'idea', 'other')),
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'done')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- Utenti possono creare feedback
CREATE POLICY "Users insert feedback" ON public.app_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Utenti possono vedere i propri feedback (opzionale, per storico)
CREATE POLICY "Users view own feedback" ON public.app_feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Admin vedono tutto
CREATE POLICY "Admins view all feedback" ON public.app_feedback
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
    );
