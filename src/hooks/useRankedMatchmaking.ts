// 排位匹配系统钩子 - 使用 Glicko-2 评分系统

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBattleWebSocket } from './useBattleWebSocket';
import { Glicko2Calculator, type Glicko2Rating } from '@/utils/glicko2System';
import type { RankedMatch } from '@/utils/replayTypes';

interface MatchmakingState {
  isSearching: boolean;
  estimatedWaitTime: number;
  currentMatch: RankedMatch | null;
  playerRating: Glicko2Rating;
  queuePosition: number;
  activeSeasonId: string | null;
  rankTier: string;
}

export const useRankedMatchmaking = () => {
  const { user } = useAuth();
  const { connect, disconnect, sendMessage, lastMessage, isConnected } = useBattleWebSocket();
  
  const [matchmakingState, setMatchmakingState] = useState<MatchmakingState>({
    isSearching: false,
    estimatedWaitTime: 0,
    currentMatch: null,
    playerRating: Glicko2Calculator.getInitialRating(),
    queuePosition: 0,
    activeSeasonId: null,
    rankTier: 'bronze'
  });

  // 获取活跃赛季和玩家评分
  useEffect(() => {
    const loadSeasonAndRating = async () => {
      if (!user || user.isGuest) return;

      // 获取活跃赛季
      const { data: season } = await supabase
        .from('league_seasons')
        .select('id')
        .eq('status', 'active')
        .maybeSingle();

      if (!season) return;

      // 获取玩家排名数据
      const { data: ranking } = await supabase
        .from('league_rankings')
        .select('rating, rating_deviation, volatility, rank_tier')
        .eq('season_id', season.id)
        .eq('user_id', user.id)
        .maybeSingle();

      setMatchmakingState(prev => ({
        ...prev,
        activeSeasonId: season.id,
        playerRating: ranking ? {
          rating: ranking.rating || 1500,
          ratingDeviation: ranking.rating_deviation || 350,
          volatility: ranking.volatility || 0.06
        } : Glicko2Calculator.getInitialRating(),
        rankTier: ranking?.rank_tier || 'bronze'
      }));
    };

    loadSeasonAndRating();
  }, [user]);

  const searchStartTime = useRef<number>(0);
  const matchmakingTimer = useRef<NodeJS.Timeout | null>(null);

  // 开始匹配
  const startMatchmaking = useCallback(async () => {
    if (!user || user.isGuest) {
      console.error('User must be authenticated for ranked matchmaking');
      return;
    }

    try {
      // 获取当前玩家的ELO积分
      const { data: playerRating } = await supabase
        .from('league_rankings')
        .select('elo_rating, matches_played')
        .eq('user_id', user.id)
        .single();

      const currentRating = playerRating?.elo_rating || 1200;
      
      setMatchmakingState(prev => ({
        ...prev,
        isSearching: true,
        playerRating: currentRating,
        estimatedWaitTime: calculateEstimatedWaitTime(currentRating)
      }));

      searchStartTime.current = Date.now();

      // 创建匹配请求
      const { data: matchRequest } = await supabase
        .from('ranked_matches')
        .insert({
          player1_id: user.id,
          player2_id: '', // 待匹配
          player1_rating: currentRating,
          player2_rating: 0,
          status: 'waiting',
          match_type: 'ranked',
          seed: generateMatchSeed(),
          best_of: 5
        })
        .select()
        .single();

      // 开始轮询匹配结果
      startMatchmakingPoll(matchRequest?.id);

    } catch (error) {
      console.error('Error starting matchmaking:', error);
      setMatchmakingState(prev => ({ ...prev, isSearching: false }));
    }
  }, [user]);

  // 取消匹配
  const cancelMatchmaking = useCallback(async () => {
    if (matchmakingTimer.current) {
      clearInterval(matchmakingTimer.current);
      matchmakingTimer.current = null;
    }

    // 删除匹配请求
    if (matchmakingState.currentMatch?.id) {
      await supabase
        .from('ranked_matches')
        .update({ status: 'cancelled' })
        .eq('id', matchmakingState.currentMatch.id);
    }

    setMatchmakingState(prev => ({
      ...prev,
      isSearching: false,
      currentMatch: null,
      queuePosition: 0
    }));

    disconnect();
  }, [matchmakingState.currentMatch?.id, disconnect]);

  // 轮询匹配结果
  const startMatchmakingPoll = useCallback((matchId: string) => {
    matchmakingTimer.current = setInterval(async () => {
      try {
        // 检查匹配状态
        const { data: match } = await supabase
          .from('ranked_matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (match) {
          setMatchmakingState(prev => ({ ...prev, currentMatch: match }));

          // 如果找到对手，开始游戏
          if (match.player2_id && match.status === 'in_progress') {
            if (matchmakingTimer.current) {
              clearInterval(matchmakingTimer.current);
              matchmakingTimer.current = null;
            }

            // 连接到对战房间
            connect(match.room_id || match.id);

            setMatchmakingState(prev => ({
              ...prev,
              isSearching: false,
              currentMatch: match
            }));

            // 开始游戏倒计时
            startGameCountdown();
          }
        }

        // 更新等待时间和队列位置
        const waitTime = Date.now() - searchStartTime.current;
        setMatchmakingState(prev => ({
          ...prev,
          estimatedWaitTime: Math.max(0, prev.estimatedWaitTime - 1000),
          queuePosition: Math.max(1, Math.floor(waitTime / 10000)) // 模拟队列位置
        }));

      } catch (error) {
        console.error('Error polling matchmaking:', error);
      }
    }, 1000);
  }, [connect]);

  // 游戏倒计时
  const startGameCountdown = useCallback(() => {
    sendMessage({
      type: 'match_ready',
      data: {
        matchId: matchmakingState.currentMatch?.id,
        seed: matchmakingState.currentMatch?.seed
      }
    });
  }, [sendMessage, matchmakingState.currentMatch]);

  // 计算预估等待时间
  const calculateEstimatedWaitTime = (rating: number): number => {
    // 根据积分段位计算等待时间
    if (rating < 1200) return 30; // Bronze: 30秒
    if (rating < 1600) return 45; // Silver: 45秒
    if (rating < 2000) return 60; // Gold: 1分钟
    if (rating < 2400) return 90; // Platinum: 1.5分钟
    if (rating < 2800) return 120; // Diamond: 2分钟
    return 180; // Master+: 3分钟
  };

  // 生成匹配种子
  const generateMatchSeed = (): string => {
    return `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 处理比赛结果
  const submitMatchResult = useCallback(async (
    gameNumber: number,
    winnerId: string,
    winnerStats: any,
    loserStats: any
  ) => {
    if (!matchmakingState.currentMatch) return;

    try {
          // 记录单局结果
      await supabase
        .from('match_games')
        .insert({
          match_id: matchmakingState.currentMatch.id,
          game_number: gameNumber,
          winner_id: winnerId,
          loser_id: winnerId === matchmakingState.currentMatch.player1Id 
            ? matchmakingState.currentMatch.player2Id 
            : matchmakingState.currentMatch.player1Id,
          winner_score: winnerStats.score,
          loser_score: loserStats.score,
          winner_lines: winnerStats.lines,
          loser_lines: loserStats.lines,
          winner_pps: winnerStats.pps,
          loser_pps: loserStats.pps,
          winner_apm: winnerStats.apm,
          loser_apm: loserStats.apm,
          duration_seconds: Math.round(winnerStats.duration / 1000),
          attacks_sent: { [winnerId]: winnerStats.attacksSent || 0 },
          attacks_received: { [winnerId]: winnerStats.attacksReceived || 0 },
          game_seed: `${matchmakingState.currentMatch.seed}-game-${gameNumber}`
        });

      // 更新比赛状态
      const newMatch = { ...matchmakingState.currentMatch };
      if (winnerId === newMatch.player1Id) {
        newMatch.player1Wins++;
      } else {
        newMatch.player2Wins++;
      }
      newMatch.currentGame++;

      // 检查是否有人获胜（5局3胜）
      if (newMatch.player1Wins >= 3 || newMatch.player2Wins >= 3) {
        const finalWinnerId = newMatch.player1Wins >= 3 ? newMatch.player1Id : newMatch.player2Id;
        
        // 更新 Glicko-2 评分
        await updateGlicko2Ratings(
          finalWinnerId,
          finalWinnerId === newMatch.player1Id ? newMatch.player2Id : newMatch.player1Id,
          newMatch.player1Rating,
          newMatch.player2Rating
        );

        // 结束比赛
        newMatch.status = 'finished';
        newMatch.winnerId = finalWinnerId;
        newMatch.finishedAt = new Date().toISOString();
      }

      // 更新比赛记录
      await supabase
        .from('ranked_matches')
        .update(newMatch)
        .eq('id', newMatch.id);

      setMatchmakingState(prev => ({
        ...prev,
        currentMatch: newMatch
      }));

    } catch (error) {
      console.error('Error submitting match result:', error);
    }
  }, [matchmakingState.currentMatch]);

  // 使用 Glicko-2 更新评分
  const updateGlicko2Ratings = async (
    winnerId: string,
    loserId: string,
    winnerRating: number,
    loserRating: number
  ) => {
    if (!matchmakingState.activeSeasonId) return;

    // 获取双方完整的 Glicko-2 数据
    const { data: winnerData } = await supabase
      .from('league_rankings')
      .select('rating, rating_deviation, volatility, matches_played, peak_rating, games_won, rank_tier')
      .eq('season_id', matchmakingState.activeSeasonId)
      .eq('user_id', winnerId)
      .maybeSingle();

    const { data: loserData } = await supabase
      .from('league_rankings')
      .select('rating, rating_deviation, volatility, matches_played, peak_rating, games_lost, rank_tier')
      .eq('season_id', matchmakingState.activeSeasonId)
      .eq('user_id', loserId)
      .maybeSingle();

    // 构建 Glicko-2 评分对象
    const winnerGlicko: Glicko2Rating = winnerData ? {
      rating: winnerData.rating || 1500,
      ratingDeviation: winnerData.rating_deviation || 350,
      volatility: winnerData.volatility || 0.06
    } : Glicko2Calculator.getInitialRating();

    const loserGlicko: Glicko2Rating = loserData ? {
      rating: loserData.rating || 1500,
      ratingDeviation: loserData.rating_deviation || 350,
      volatility: loserData.volatility || 0.06
    } : Glicko2Calculator.getInitialRating();

    // 计算新评分
    const newWinnerRating = Glicko2Calculator.calculate(winnerGlicko, loserGlicko, 1);
    const newLoserRating = Glicko2Calculator.calculate(loserGlicko, winnerGlicko, 0);

    // 确定段位
    const getRankTier = (rating: number): string => {
      if (rating >= 2400) return 'master';
      if (rating >= 2000) return 'diamond';
      if (rating >= 1750) return 'platinum';
      if (rating >= 1500) return 'gold';
      if (rating >= 1250) return 'silver';
      return 'bronze';
    };

    // 更新胜者评分
    await supabase
      .from('league_rankings')
      .upsert({
        season_id: matchmakingState.activeSeasonId,
        user_id: winnerId,
        rating: Math.round(newWinnerRating.rating),
        rating_deviation: Math.round(newWinnerRating.ratingDeviation),
        volatility: newWinnerRating.volatility,
        elo_rating: Math.round(newWinnerRating.rating),
        peak_rating: Math.max(Math.round(newWinnerRating.rating), winnerData?.peak_rating || 1500),
        matches_played: (winnerData?.matches_played || 0) + 1,
        games_won: (winnerData?.games_won || 0) + 1,
        rank_tier: getRankTier(newWinnerRating.rating),
        provisional: Glicko2Calculator.isProvisional(newWinnerRating),
        updated_at: new Date().toISOString()
      });

    // 更新败者评分
    await supabase
      .from('league_rankings')
      .upsert({
        season_id: matchmakingState.activeSeasonId,
        user_id: loserId,
        rating: Math.round(newLoserRating.rating),
        rating_deviation: Math.round(newLoserRating.ratingDeviation),
        volatility: newLoserRating.volatility,
        elo_rating: Math.round(newLoserRating.rating),
        peak_rating: Math.max(Math.round(newLoserRating.rating), loserData?.peak_rating || 1500),
        matches_played: (loserData?.matches_played || 0) + 1,
        games_lost: (loserData?.games_lost || 0) + 1,
        rank_tier: getRankTier(newLoserRating.rating),
        provisional: Glicko2Calculator.isProvisional(newLoserRating),
        updated_at: new Date().toISOString()
      });
  };

  return {
    matchmakingState,
    startMatchmaking,
    cancelMatchmaking,
    submitMatchResult,
    isConnected,
    lastMessage
  };
};