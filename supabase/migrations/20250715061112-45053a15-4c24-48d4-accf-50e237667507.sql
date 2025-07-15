-- Drop the existing check constraint
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_user_type_check;

-- Add the new check constraint with 'admin' included
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_type_check 
CHECK (user_type = ANY (ARRAY['regular'::text, 'premium'::text, 'donor'::text, 'vip'::text, 'admin'::text]));

-- Update admin user type to 'admin'
UPDATE user_profiles 
SET user_type = 'admin' 
WHERE email = 'admin@tetris.com';