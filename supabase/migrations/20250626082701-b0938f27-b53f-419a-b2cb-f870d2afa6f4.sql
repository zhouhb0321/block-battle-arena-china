
-- Enable Row Level Security for advertisements table
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to view active advertisements
CREATE POLICY "Anyone can view active advertisements" 
  ON public.advertisements 
  FOR SELECT 
  USING (is_active = true);

-- Create policy to allow authenticated users to view all advertisements (for admin purposes)
CREATE POLICY "Authenticated users can view all advertisements" 
  ON public.advertisements 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Create policy to allow only service role to insert/update advertisements (for admin operations)
CREATE POLICY "Service role can manage advertisements" 
  ON public.advertisements 
  FOR ALL 
  USING (auth.role() = 'service_role');
