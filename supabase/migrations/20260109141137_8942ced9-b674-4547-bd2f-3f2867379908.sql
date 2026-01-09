-- Fix battle_rooms RLS policies for room creation and viewing

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create battle rooms" ON battle_rooms;
DROP POLICY IF EXISTS "Users can view battle rooms they participate in" ON battle_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON battle_rooms;
DROP POLICY IF EXISTS "Anyone can view waiting rooms" ON battle_rooms;

-- Create INSERT policy - authenticated users can create rooms where they are the creator
CREATE POLICY "Authenticated users can create rooms" 
ON battle_rooms 
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Create SELECT policy - users can view waiting rooms, rooms they created, or rooms they participate in
CREATE POLICY "Users can view accessible rooms"
ON battle_rooms
FOR SELECT
TO authenticated
USING (
  status = 'waiting' 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM battle_participants 
    WHERE battle_participants.room_id = battle_rooms.id 
    AND battle_participants.user_id = auth.uid()
  )
);