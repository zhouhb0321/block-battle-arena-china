-- Update admin user type to 'admin'
UPDATE user_profiles 
SET user_type = 'admin' 
WHERE email = 'admin@tetris.com';