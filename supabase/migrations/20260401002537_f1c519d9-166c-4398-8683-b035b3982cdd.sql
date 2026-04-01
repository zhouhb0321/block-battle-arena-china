
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT,
  feedback_type TEXT NOT NULL DEFAULT 'suggestion',
  content TEXT NOT NULL,
  page TEXT,
  app_version TEXT DEFAULT '1.0.0',
  user_agent TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can submit feedback"
  ON public.user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Anonymous feedback (for guests)
CREATE POLICY "Anonymous users can submit feedback"
  ON public.user_feedback FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.user_feedback FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update feedback status
CREATE POLICY "Admins can update feedback"
  ON public.user_feedback FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
