-- Create function to safely join room by 4-digit code
CREATE OR REPLACE FUNCTION public.join_room_by_code(room_code_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    room_record battle_rooms;
    participant_record battle_participants;
    result jsonb;
BEGIN
    -- Validate input is 4 digits
    IF room_code_input !~ '^\d{4}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Room code must be 4 digits');
    END IF;
    
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;
    
    -- Find the room
    SELECT * INTO room_record
    FROM battle_rooms
    WHERE room_code = room_code_input AND status = 'waiting';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Room not found or not available');
    END IF;
    
    -- Check if room is full
    IF room_record.current_players >= room_record.max_players THEN
        RETURN jsonb_build_object('success', false, 'error', 'Room is full');
    END IF;
    
    -- Check if user is already in the room
    SELECT * INTO participant_record
    FROM battle_participants
    WHERE room_id = room_record.id AND user_id = auth.uid();
    
    IF FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already in this room');
    END IF;
    
    -- Add participant
    INSERT INTO battle_participants (room_id, user_id, position, username)
    VALUES (
        room_record.id, 
        auth.uid(), 
        room_record.current_players + 1,
        COALESCE((SELECT username FROM user_profiles WHERE id = auth.uid()), 'Player')
    );
    
    -- Update room player count
    UPDATE battle_rooms
    SET current_players = current_players + 1
    WHERE id = room_record.id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'room_id', room_record.id,
        'room', row_to_json(room_record)
    );
END;
$$;