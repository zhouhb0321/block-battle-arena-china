/**
 * Replay Save Conditions - Determines whether a replay should be saved
 * Based on: Top 500, Personal Best, Ranked, Tournament, Admin control
 */

import { supabase } from '@/integrations/supabase/client';

export interface SaveEvaluationResult {
  shouldSave: boolean;
  reason: string;
  category: 'top500' | 'personal_best' | 'ranked' | 'tournament' | 'admin' | 'none';
  rank?: number;
}

interface GameStats {
  score: number;
  duration: number;
  lines: number;
}

interface RoomContext {
  roomId?: string;
  saveReplay?: boolean;
  tournamentType?: string | null;
}

/**
 * Evaluate whether a replay should be saved based on multiple criteria
 */
export async function evaluateReplaySaveConditions(
  gameMode: string,
  stats: GameStats,
  userId: string,
  roomContext?: RoomContext
): Promise<SaveEvaluationResult> {
  console.log('[ReplaySave] Evaluating save conditions:', { gameMode, stats, userId, roomContext });

  // Skip training modes entirely
  if (gameMode.includes('training') || gameMode.includes('practice')) {
    return { shouldSave: false, reason: 'Training/practice mode - not saved', category: 'none' };
  }

  // Skip zero-score AND zero-lines games
  if (stats.score === 0 && stats.lines === 0) {
    return { shouldSave: false, reason: 'Zero score and zero lines - not saved', category: 'none' };
  }

  // Skip casual single-player modes
  if (gameMode === 'endless' || gameMode === 'zen' || gameMode === 'custom') {
    return { shouldSave: false, reason: 'Casual single-player mode - not saved', category: 'none' };
  }

  // Condition 5: Admin-designated save (check first - highest priority)
  if (roomContext?.saveReplay) {
    return { 
      shouldSave: true, 
      reason: 'Admin-designated save', 
      category: 'admin' 
    };
  }

  // Condition 4: Tournament matches (elimination, group stage, finals)
  if (roomContext?.tournamentType && ['elimination', 'group_stage', 'finals'].includes(roomContext.tournamentType)) {
    return { 
      shouldSave: true, 
      reason: `Tournament match: ${roomContext.tournamentType}`, 
      category: 'tournament' 
    };
  }

  // Condition 3: Ranked/Promotion/1v1 matches - always save
  if (gameMode === 'ranked' || gameMode === 'promotion' || gameMode === '1v1' || 
      gameMode.includes('ranked') || gameMode.includes('league')) {
    return { 
      shouldSave: true, 
      reason: 'Ranked/promotion match', 
      category: 'ranked' 
    };
  }

  // Condition 1: 40-line Sprint - Top 500 by fastest time
  if (gameMode === 'sprint40' || gameMode === '40lines' || gameMode === 'sprint') {
    const result = await checkTop500Sprint(stats.duration, userId, gameMode);
    if (result.shouldSave) return result;
    
    // Check personal best if not in top 500
    const personalBest = await checkPersonalBest(userId, gameMode, 'duration', stats.duration / 1000);
    if (personalBest) {
      return { shouldSave: true, reason: 'Personal best time', category: 'personal_best' };
    }
    
    return { shouldSave: false, reason: 'Not in Top 500 and not personal best', category: 'none' };
  }

  // Condition 2: 2-minute Challenge - Top 500 by highest score
  if (gameMode === 'timeAttack2' || gameMode === 'ultra2min' || gameMode === 'ultra' || 
      gameMode === 'blitz' || gameMode === '2min') {
    const result = await checkTop500Score(stats.score, userId, gameMode);
    if (result.shouldSave) return result;
    
    // Check personal best if not in top 500
    const personalBest = await checkPersonalBest(userId, gameMode, 'score', stats.score);
    if (personalBest) {
      return { shouldSave: true, reason: 'Personal best score', category: 'personal_best' };
    }
    
    return { shouldSave: false, reason: 'Not in Top 500 and not personal best', category: 'none' };
  }

  // Default: Check for personal best in any mode
  const isPersonalBestScore = await checkPersonalBest(userId, gameMode, 'score', stats.score);
  if (isPersonalBestScore) {
    return { shouldSave: true, reason: 'Personal best score', category: 'personal_best' };
  }

  // For other modes, don't save unless it's a personal best
  return { shouldSave: false, reason: 'Does not meet save criteria', category: 'none' };
}

/**
 * Check if the sprint time qualifies for Top 500
 */
async function checkTop500Sprint(
  durationMs: number,
  userId: string,
  gameMode: string
): Promise<SaveEvaluationResult> {
  const durationSeconds = durationMs / 1000;
  
  try {
    const { data: top500, error } = await supabase
      .from('compressed_replays')
      .select('id, duration_seconds')
      .in('game_mode', ['sprint40', '40lines', 'sprint'])
      .order('duration_seconds', { ascending: true })
      .limit(500);
    
    if (error) {
      console.error('[ReplaySave] Error checking sprint leaderboard:', error);
      // On error, save to be safe
      return { shouldSave: true, reason: 'Leaderboard check failed, saving anyway', category: 'top500' };
    }
    
    if (!top500 || top500.length < 500) {
      // Leaderboard not full, save
      return { 
        shouldSave: true, 
        reason: 'Top 500 has space', 
        category: 'top500',
        rank: (top500?.length || 0) + 1
      };
    }
    
    const worstTime = top500[499].duration_seconds;
    if (durationSeconds < worstTime) {
      const rank = top500.filter(r => r.duration_seconds < durationSeconds).length + 1;
      return { 
        shouldSave: true, 
        reason: `Faster than rank 500 (${worstTime.toFixed(2)}s)`, 
        category: 'top500',
        rank
      };
    }
  } catch (err) {
    console.error('[ReplaySave] Sprint leaderboard check error:', err);
    return { shouldSave: true, reason: 'Error checking leaderboard', category: 'top500' };
  }
  
  return { shouldSave: false, reason: 'Not in sprint Top 500', category: 'none' };
}

/**
 * Check if the score qualifies for Top 500
 */
async function checkTop500Score(
  score: number,
  userId: string,
  gameMode: string
): Promise<SaveEvaluationResult> {
  try {
    const { data: top500, error } = await supabase
      .from('compressed_replays')
      .select('id, final_score')
      .in('game_mode', ['timeAttack2', 'ultra2min', 'ultra', 'blitz', '2min'])
      .order('final_score', { ascending: false })
      .limit(500);
    
    if (error) {
      console.error('[ReplaySave] Error checking score leaderboard:', error);
      return { shouldSave: true, reason: 'Leaderboard check failed, saving anyway', category: 'top500' };
    }
    
    if (!top500 || top500.length < 500) {
      return { 
        shouldSave: true, 
        reason: 'Top 500 has space', 
        category: 'top500',
        rank: (top500?.length || 0) + 1
      };
    }
    
    const worstScore = top500[499].final_score;
    if (score > worstScore) {
      const rank = top500.filter(r => r.final_score > score).length + 1;
      return { 
        shouldSave: true, 
        reason: `Higher than rank 500 (${worstScore})`, 
        category: 'top500',
        rank
      };
    }
  } catch (err) {
    console.error('[ReplaySave] Score leaderboard check error:', err);
    return { shouldSave: true, reason: 'Error checking leaderboard', category: 'top500' };
  }
  
  return { shouldSave: false, reason: 'Not in score Top 500', category: 'none' };
}

/**
 * Check if this is a personal best
 */
async function checkPersonalBest(
  userId: string, 
  gameMode: string, 
  metric: 'score' | 'duration',
  value: number
): Promise<boolean> {
  try {
    const column = metric === 'score' ? 'final_score' : 'duration_seconds';
    const ascending = metric !== 'score'; // For duration, lower is better
    
    const { data, error } = await supabase
      .from('compressed_replays')
      .select(column)
      .eq('user_id', userId)
      .eq('game_mode', gameMode)
      .order(column, { ascending })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('[ReplaySave] Personal best check error:', error);
      return true; // On error, assume it might be a personal best
    }
    
    if (!data) {
      // First time playing this mode
      return true;
    }
    
    // Type-safe access to the data
    const record = data as Record<string, number | null>;
    
    if (metric === 'score') {
      return value > (record.final_score || 0);
    } else {
      return value < (record.duration_seconds || Infinity);
    }
  } catch (err) {
    console.error('[ReplaySave] Personal best check error:', err);
    return true; // On error, save to be safe
  }
}
