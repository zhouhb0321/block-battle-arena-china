-- V4 Replay Storage Fix: Change compressed_actions from bytea to text
-- This migration fixes the issue where Uint8Array was being serialized as JSON object
-- instead of proper binary data. New format stores Base64 encoded strings.

-- Step 1: Alter column type from bytea to text
ALTER TABLE compressed_replays 
ALTER COLUMN compressed_actions TYPE text 
USING compressed_actions::text;

-- Step 2: Add column comment for documentation
COMMENT ON COLUMN compressed_replays.compressed_actions 
IS 'V4 replay binary data encoded as Base64 string for reliable storage and retrieval';

-- Step 3: Add index for better query performance on version
CREATE INDEX IF NOT EXISTS idx_compressed_replays_version 
ON compressed_replays(version) 
WHERE version = '4.0';

-- Note: Existing V4 replays with corrupted data (JSON serialized Uint8Array) 
-- will need to be re-recorded. They can be identified with:
-- SELECT id, user_id, created_at FROM compressed_replays 
-- WHERE version = '4.0' AND (compressed_actions IS NULL OR NOT (compressed_actions LIKE 'UlBWN%'));