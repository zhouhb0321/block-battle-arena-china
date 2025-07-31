-- 修复安全警告：为函数添加正确的search_path
DROP FUNCTION IF EXISTS public.calculate_elo_change(INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.calculate_elo_change(
  winner_rating INTEGER,
  loser_rating INTEGER,
  k_factor INTEGER DEFAULT 32
) RETURNS TABLE(winner_new_rating INTEGER, loser_new_rating INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected_winner NUMERIC;
  expected_loser NUMERIC;
  winner_change INTEGER;
  loser_change INTEGER;
BEGIN
  -- 计算期望得分
  expected_winner := 1.0 / (1.0 + POWER(10.0, (loser_rating - winner_rating) / 400.0));
  expected_loser := 1.0 - expected_winner;
  
  -- 计算积分变化
  winner_change := ROUND(k_factor * (1.0 - expected_winner));
  loser_change := ROUND(k_factor * (0.0 - expected_loser));
  
  -- 返回新积分
  winner_new_rating := winner_rating + winner_change;
  loser_new_rating := loser_rating + loser_change;
  
  RETURN NEXT;
END;
$$;