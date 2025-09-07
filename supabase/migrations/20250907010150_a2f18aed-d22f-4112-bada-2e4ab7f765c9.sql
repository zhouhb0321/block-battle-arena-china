-- Add team column to battle_rooms and battle_participants for team battle mode
ALTER TABLE battle_rooms 
ADD COLUMN team_size INTEGER DEFAULT 1,
ADD COLUMN team_mode BOOLEAN DEFAULT false;

-- Add team column to battle_participants 
ALTER TABLE battle_participants 
ADD COLUMN team TEXT DEFAULT 'A';