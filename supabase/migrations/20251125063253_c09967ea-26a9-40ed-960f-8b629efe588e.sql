-- Add DCD (DAS Cut Delay) field to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS dcd INTEGER DEFAULT 0;

COMMENT ON COLUMN user_settings.dcd IS 'DAS Cut Delay (0-200ms) - Direction change delay elimination for improved handling feel';

-- Update existing records to have dcd = 0
UPDATE user_settings SET dcd = 0 WHERE dcd IS NULL;