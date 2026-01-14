-- 创建默认赛季（如果不存在）
INSERT INTO league_seasons (id, name, start_date, end_date, status, settings)
SELECT 
  gen_random_uuid(),
  'Season 1 - 2025',
  '2025-01-01'::date,
  '2025-06-30'::date,
  'active',
  '{"rating_start": 1500, "k_factor": 32, "placement_games": 10}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM league_seasons WHERE status = 'active');

-- 确保有一个活跃赛季
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM league_seasons WHERE status = 'active') THEN
    INSERT INTO league_seasons (name, start_date, end_date, status, settings)
    VALUES (
      'Season 1 - 2025',
      '2025-01-01'::date,
      '2025-06-30'::date,
      'active',
      '{"rating_start": 1500, "k_factor": 32, "placement_games": 10}'::jsonb
    );
  END IF;
END $$;