
-- Enable realtime for private_messages
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;

-- Change conversation_id from uuid to text (it's nullable, safe to alter)
ALTER TABLE private_messages ALTER COLUMN conversation_id TYPE text USING conversation_id::text;
