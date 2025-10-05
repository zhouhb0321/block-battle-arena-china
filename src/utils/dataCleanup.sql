-- V4 Replay Data Cleanup and Verification Scripts
-- Use these queries to identify and clean up corrupted V4 replay records

-- =====================================================
-- 1. IDENTIFY CORRUPTED V4 REPLAYS
-- =====================================================

-- Find V4 replays with potentially corrupted data
-- (Base64 encoded "RPV4" should start with "UlBWN" or similar)
SELECT 
  id,
  user_id,
  username,
  game_mode,
  place_actions_count as lock_count,
  created_at,
  LENGTH(compressed_actions) as data_length,
  SUBSTRING(compressed_actions, 1, 20) as data_start,
  CASE 
    WHEN compressed_actions IS NULL THEN 'NULL_DATA'
    WHEN compressed_actions LIKE '{%}' THEN 'JSON_OBJECT'
    WHEN compressed_actions LIKE 'UlBW%' THEN 'VALID_BASE64'
    WHEN compressed_actions LIKE '\\x%' THEN 'BYTEA_HEX'
    ELSE 'UNKNOWN_FORMAT'
  END as data_format
FROM compressed_replays
WHERE version = '4.0'
ORDER BY created_at DESC;

-- =====================================================
-- 2. COUNT BY FORMAT TYPE
-- =====================================================

SELECT 
  CASE 
    WHEN compressed_actions IS NULL THEN 'NULL_DATA'
    WHEN compressed_actions LIKE '{%}' THEN 'JSON_OBJECT (CORRUPTED)'
    WHEN compressed_actions LIKE 'UlBW%' THEN 'VALID_BASE64'
    WHEN compressed_actions LIKE '\\x%' THEN 'BYTEA_HEX'
    ELSE 'UNKNOWN_FORMAT'
  END as data_format,
  COUNT(*) as count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM compressed_replays
WHERE version = '4.0'
GROUP BY data_format
ORDER BY count DESC;

-- =====================================================
-- 3. FIND REPLAYS CREATED TODAY (for testing)
-- =====================================================

SELECT 
  id,
  user_id,
  username,
  game_mode,
  place_actions_count,
  final_score,
  created_at,
  LENGTH(compressed_actions) as data_length,
  SUBSTRING(compressed_actions, 1, 30) as data_preview
FROM compressed_replays
WHERE version = '4.0'
  AND created_at > CURRENT_DATE
ORDER BY created_at DESC;

-- =====================================================
-- 4. DELETE CORRUPTED V4 REPLAYS (USE WITH CAUTION!)
-- =====================================================

-- STEP 1: Review records that will be deleted
SELECT 
  id,
  user_id,
  username,
  game_mode,
  created_at,
  'Will be deleted' as status
FROM compressed_replays
WHERE version = '4.0'
  AND (
    compressed_actions IS NULL 
    OR compressed_actions LIKE '{%}'  -- JSON object format (corrupted)
    OR LENGTH(compressed_actions) < 100  -- Too short to be valid
  );

-- STEP 2: Uncomment and run this to actually delete (CAREFUL!)
-- DELETE FROM compressed_replays
-- WHERE version = '4.0'
--   AND (
--     compressed_actions IS NULL 
--     OR compressed_actions LIKE '{%}'
--     OR LENGTH(compressed_actions) < 100
--   );

-- =====================================================
-- 5. VERIFY NEW V4 REPLAYS ARE SAVED CORRECTLY
-- =====================================================

-- Check the most recent V4 replay
SELECT 
  id,
  user_id,
  username,
  game_mode,
  place_actions_count as lock_count,
  final_score,
  final_lines,
  pps,
  apm,
  duration_seconds,
  created_at,
  LENGTH(compressed_actions) as base64_length,
  SUBSTRING(compressed_actions, 1, 20) as base64_start,
  CASE 
    WHEN compressed_actions LIKE 'UlBW%' THEN '✅ Valid Base64 (starts with RPV4)'
    ELSE '❌ Invalid format'
  END as validation_status,
  checksum
FROM compressed_replays
WHERE version = '4.0'
ORDER BY created_at DESC
LIMIT 1;

-- =====================================================
-- 6. STATISTICS FOR V4 REPLAYS
-- =====================================================

SELECT 
  COUNT(*) as total_v4_replays,
  COUNT(CASE WHEN compressed_actions LIKE 'UlBW%' THEN 1 END) as valid_replays,
  COUNT(CASE WHEN compressed_actions LIKE '{%}' THEN 1 END) as corrupted_json,
  COUNT(CASE WHEN compressed_actions IS NULL THEN 1 END) as null_data,
  AVG(place_actions_count) as avg_lock_count,
  AVG(LENGTH(compressed_actions)) as avg_base64_length,
  MAX(created_at) as most_recent,
  MIN(created_at) as oldest
FROM compressed_replays
WHERE version = '4.0';

-- =====================================================
-- 7. USER-SPECIFIC V4 REPLAY CHECK
-- =====================================================

-- Replace 'USER_ID_HERE' with actual user UUID
/*
SELECT 
  id,
  username,
  game_mode,
  place_actions_count,
  final_score,
  created_at,
  SUBSTRING(compressed_actions, 1, 30) as data_preview,
  CASE 
    WHEN compressed_actions LIKE 'UlBW%' THEN '✅ Valid'
    ELSE '❌ Corrupted'
  END as status
FROM compressed_replays
WHERE version = '4.0'
  AND user_id = 'USER_ID_HERE'
ORDER BY created_at DESC;
*/
