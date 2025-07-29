
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { season_id, user_id, won } = await req.json();

    // 获取当前排名数据
    let { data: ranking, error: fetchError } = await supabase
      .from('league_rankings')
      .select('*')
      .eq('season_id', season_id)
      .eq('user_id', user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!ranking) {
      // 创建新的排名记录
      ranking = {
        season_id,
        user_id,
        rating: 1500,
        rank_tier: 'bronze',
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        win_streak: 0,
        best_streak: 0
      };
    }

    // 更新统计数据
    const newGamesPlayed = ranking.games_played + 1;
    const newGamesWon = ranking.games_won + (won ? 1 : 0);
    const newGamesLost = ranking.games_lost + (won ? 0 : 1);
    
    let newWinStreak = won ? ranking.win_streak + 1 : 0;
    let newBestStreak = Math.max(ranking.best_streak, newWinStreak);

    // 计算新的评分
    const K = 32; // ELO K-factor
    const expectedScore = 1 / (1 + Math.pow(10, (1500 - ranking.rating) / 400));
    const actualScore = won ? 1 : 0;
    const newRating = Math.round(ranking.rating + K * (actualScore - expectedScore));

    // 确定段位
    let newRankTier = 'bronze';
    if (newRating >= 2000) newRankTier = 'diamond';
    else if (newRating >= 1750) newRankTier = 'platinum';
    else if (newRating >= 1500) newRankTier = 'gold';
    else if (newRating >= 1250) newRankTier = 'silver';

    // 更新数据库
    const { error: updateError } = await supabase
      .from('league_rankings')
      .upsert({
        season_id,
        user_id,
        rating: newRating,
        rank_tier: newRankTier,
        games_played: newGamesPlayed,
        games_won: newGamesWon,
        games_lost: newGamesLost,
        win_streak: newWinStreak,
        best_streak: newBestStreak,
        updated_at: new Date().toISOString()
      });

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      rating: newRating,
      rank_tier: newRankTier
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating league ranking:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
