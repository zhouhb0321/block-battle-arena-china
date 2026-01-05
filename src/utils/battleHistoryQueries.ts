/**
 * 对战历史查询工具
 * 从数据库获取用户对战记录和统计数据
 */
import { supabase } from '@/integrations/supabase/client';

export interface BattleHistoryEntry {
  id: string;
  matchType: 'ranked' | 'custom' | 'team';
  isWin: boolean;
  opponentId: string;
  opponentUsername: string;
  opponentRating?: number;
  bestOf: number;
  playerWins: number;
  opponentWins: number;
  playerStats: {
    score: number;
    lines: number;
    pps: number;
    apm: number;
    attack: number;
  };
  opponentStats: {
    score: number;
    lines: number;
    pps: number;
    apm: number;
    attack: number;
  };
  duration: number;
  replayId?: string;
  createdAt: string;
}

export interface BattleStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPps: number;
  avgApm: number;
  highestScore: number;
  longestWinStreak: number;
  currentStreak: number;
}

export interface FetchBattleHistoryOptions {
  matchType?: 'all' | 'ranked' | 'custom' | 'team';
  timeRange?: 'all' | 'today' | 'week' | 'month';
  sortBy?: 'date' | 'score' | 'duration';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// 获取用户对战历史
export async function fetchBattleHistory(
  userId: string,
  options: FetchBattleHistoryOptions = {}
): Promise<{ entries: BattleHistoryEntry[]; total: number }> {
  const {
    matchType = 'all',
    timeRange = 'all',
    sortBy = 'date',
    sortOrder = 'desc',
    page = 1,
    pageSize = 20
  } = options;

  const entries: BattleHistoryEntry[] = [];
  let total = 0;

  // 计算时间范围
  let startDate: Date | null = null;
  const now = new Date();
  
  switch (timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  // 查询排位赛记录
  if (matchType === 'all' || matchType === 'ranked') {
    let query = supabase
      .from('ranked_matches')
      .select(`
        id,
        player1_id,
        player2_id,
        player1_rating,
        player2_rating,
        player1_wins,
        player2_wins,
        winner_id,
        best_of,
        status,
        created_at,
        finished_at
      `, { count: 'exact' })
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'finished');

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    // 排序
    const orderColumn = sortBy === 'date' ? 'created_at' : 'created_at';
    query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

    // 分页
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: rankedData, count, error } = await query;

    if (!error && rankedData) {
      total += count || 0;

      // 获取对手用户名
      const opponentIds = rankedData.map(m => 
        m.player1_id === userId ? m.player2_id : m.player1_id
      );
      
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, username')
        .in('id', opponentIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      // 获取对应的回放
      const matchIds = rankedData.map(m => m.id);
      const { data: replays } = await supabase
        .from('compressed_replays')
        .select('id, match_id, pps, apm, final_score, final_lines')
        .in('match_id', matchIds)
        .eq('user_id', userId);

      const replayMap = new Map(replays?.map(r => [r.match_id, r]) || []);

      for (const match of rankedData) {
        const isPlayer1 = match.player1_id === userId;
        const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
        const replay = replayMap.get(match.id);

        // 计算时长
        const duration = match.finished_at 
          ? (new Date(match.finished_at).getTime() - new Date(match.created_at).getTime()) / 1000
          : 0;

        entries.push({
          id: match.id,
          matchType: 'ranked',
          isWin: match.winner_id === userId,
          opponentId,
          opponentUsername: profileMap.get(opponentId) || 'Unknown',
          opponentRating: isPlayer1 ? match.player2_rating : match.player1_rating,
          bestOf: match.best_of,
          playerWins: isPlayer1 ? match.player1_wins : match.player2_wins,
          opponentWins: isPlayer1 ? match.player2_wins : match.player1_wins,
          playerStats: {
            score: replay?.final_score || 0,
            lines: replay?.final_lines || 0,
            pps: replay?.pps || 0,
            apm: replay?.apm || 0,
            attack: 0
          },
          opponentStats: {
            score: 0,
            lines: 0,
            pps: 0,
            apm: 0,
            attack: 0
          },
          duration: Math.round(duration),
          replayId: replay?.id,
          createdAt: match.created_at
        });
      }
    }
  }

  // 查询自定义房间对战记录
  if (matchType === 'all' || matchType === 'custom') {
    let query = supabase
      .from('battle_records')
      .select(`
        id,
        room_id,
        winner_id,
        loser_id,
        winner_score,
        loser_score,
        duration_seconds,
        attack_sent,
        attack_received,
        lines_cleared,
        created_at
      `, { count: 'exact' })
      .or(`winner_id.eq.${userId},loser_id.eq.${userId}`);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    query = query.order('created_at', { ascending: sortOrder === 'asc' });

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: battleData, count, error } = await query;

    if (!error && battleData) {
      total += count || 0;

      // 获取对手用户名
      const opponentIds = battleData.map(b => 
        b.winner_id === userId ? b.loser_id : b.winner_id
      ).filter(id => id != null);
      
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, username')
        .in('id', opponentIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      for (const battle of battleData) {
        const isWinner = battle.winner_id === userId;
        const opponentId = isWinner ? battle.loser_id : battle.winner_id;

        if (!opponentId) continue;

        entries.push({
          id: battle.id,
          matchType: 'custom',
          isWin: isWinner,
          opponentId,
          opponentUsername: profileMap.get(opponentId) || 'Unknown',
          bestOf: 1,
          playerWins: isWinner ? 1 : 0,
          opponentWins: isWinner ? 0 : 1,
          playerStats: {
            score: isWinner ? battle.winner_score : battle.loser_score,
            lines: battle.lines_cleared || 0,
            pps: 0,
            apm: 0,
            attack: isWinner ? battle.attack_sent : battle.attack_received
          },
          opponentStats: {
            score: isWinner ? battle.loser_score : battle.winner_score,
            lines: 0,
            pps: 0,
            apm: 0,
            attack: isWinner ? battle.attack_received : battle.attack_sent
          },
          duration: battle.duration_seconds || 0,
          createdAt: battle.created_at
        });
      }
    }
  }

  // 按时间排序合并结果
  entries.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  return { entries: entries.slice(0, pageSize), total };
}

// 获取用户对战统计
export async function fetchBattleStats(userId: string): Promise<BattleStats> {
  let wins = 0;
  let losses = 0;
  let totalPps = 0;
  let totalApm = 0;
  let ppsCount = 0;
  let apmCount = 0;
  let highestScore = 0;

  // 从排位赛获取统计
  const { data: rankedData } = await supabase
    .from('ranked_matches')
    .select('winner_id, player1_id, player2_id')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', 'finished');

  if (rankedData) {
    for (const match of rankedData) {
      if (match.winner_id === userId) {
        wins++;
      } else {
        losses++;
      }
    }
  }

  // 从自定义房间获取统计
  const { data: battleData } = await supabase
    .from('battle_records')
    .select('winner_id, loser_id, winner_score, loser_score')
    .or(`winner_id.eq.${userId},loser_id.eq.${userId}`);

  if (battleData) {
    for (const battle of battleData) {
      if (battle.winner_id === userId) {
        wins++;
        if (battle.winner_score > highestScore) {
          highestScore = battle.winner_score;
        }
      } else if (battle.loser_id === userId) {
        losses++;
        if (battle.loser_score > highestScore) {
          highestScore = battle.loser_score;
        }
      }
    }
  }

  // 从回放获取平均PPS和APM
  const { data: replays } = await supabase
    .from('compressed_replays')
    .select('pps, apm, final_score')
    .eq('user_id', userId);

  if (replays) {
    for (const replay of replays) {
      if (replay.pps > 0) {
        totalPps += replay.pps;
        ppsCount++;
      }
      if (replay.apm > 0) {
        totalApm += replay.apm;
        apmCount++;
      }
      if (replay.final_score > highestScore) {
        highestScore = replay.final_score;
      }
    }
  }

  // 从league_rankings获取连胜数据
  const { data: leagueData } = await supabase
    .from('league_rankings')
    .select('longest_win_streak, current_streak')
    .eq('user_id', userId)
    .single();

  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

  return {
    totalMatches,
    wins,
    losses,
    winRate: Math.round(winRate * 10) / 10,
    avgPps: ppsCount > 0 ? Math.round((totalPps / ppsCount) * 100) / 100 : 0,
    avgApm: apmCount > 0 ? Math.round((totalApm / apmCount) * 10) / 10 : 0,
    highestScore,
    longestWinStreak: leagueData?.longest_win_streak || 0,
    currentStreak: leagueData?.current_streak || 0
  };
}
