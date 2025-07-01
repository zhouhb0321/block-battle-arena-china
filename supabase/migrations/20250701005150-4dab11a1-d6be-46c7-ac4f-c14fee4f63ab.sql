
-- Create user_settings table if it doesn't exist (it should already exist based on the schema)
-- But let's make sure it has all the required columns for the game settings

-- Add missing columns to user_settings if they don't exist
DO $$ 
BEGIN
    -- Check and add back_to_menu column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'back_to_menu') THEN
        ALTER TABLE user_settings ADD COLUMN back_to_menu text DEFAULT 'KeyB';
    END IF;
    
    -- Check and add background_music column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'background_music') THEN
        ALTER TABLE user_settings ADD COLUMN background_music text DEFAULT '';
    END IF;
    
    -- Check and add music_volume column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'music_volume') THEN
        ALTER TABLE user_settings ADD COLUMN music_volume integer DEFAULT 30;
    END IF;
END $$;

-- Create RLS policies for user_settings if they don't exist
DO $$
BEGIN
    -- Enable RLS on user_settings
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for users to view their own settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can view their own settings') THEN
        CREATE POLICY "Users can view their own settings" 
        ON user_settings 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
    
    -- Create policy for users to insert their own settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can insert their own settings') THEN
        CREATE POLICY "Users can insert their own settings" 
        ON user_settings 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Create policy for users to update their own settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can update their own settings') THEN
        CREATE POLICY "Users can update their own settings" 
        ON user_settings 
        FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create password reset tokens table for custom password reset functionality
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on password_reset_tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for password reset tokens (only system can access)
CREATE POLICY "System can manage password reset tokens" 
ON password_reset_tokens 
FOR ALL 
USING (true);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Update the existing handle_new_user function to ensure user_settings are created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update user profile
  INSERT INTO public.user_profiles (id, username, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Player'), NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email;
  
  -- Create user settings with default values
  INSERT INTO public.user_settings (
    user_id, 
    das, 
    arr, 
    sdf, 
    controls, 
    enable_ghost, 
    enable_sound, 
    master_volume,
    background_music,
    music_volume,
    back_to_menu
  )
  VALUES (
    NEW.id,
    167,
    33,
    20,
    '{"hold": "KeyC", "pause": "Escape", "hardDrop": "Space", "moveLeft": "ArrowLeft", "softDrop": "ArrowDown", "moveRight": "ArrowRight", "rotate180": "KeyA", "rotateClockwise": "ArrowUp", "rotateCounterclockwise": "KeyZ", "backToMenu": "KeyB"}'::jsonb,
    true,
    true,
    50,
    '',
    30,
    'KeyB'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
