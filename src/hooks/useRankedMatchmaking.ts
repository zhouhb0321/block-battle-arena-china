// 排位匹配系统钩子

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBattleWebSocket } from './useBattleWebSocket';
import { EloCalculator, SeededRandom } from '@/utils/replayCompression';
import type { RankedMatch, EloRating } from '@/utils/replayTypes';

interface MatchmakingState {
  isSearching: boolean;
  estimatedWaitTime: number;
  currentMatch: RankedMatch | null;
  playerRating: number;
  queuePosition: number;
}

export const useRankedMatchmaking = () => {
  const { user } = useAuth();
  const { connect, disconnect, sendMessage, lastMessage, isConnected } = useBattleWebSocket();
  
  const [matchmakingState, setMatchmakingState] = useState<MatchmakingState>({
    isSearching: false,
    estimatedWaitTime: 0,
    currentMatch: null,
    playerRating: 1200,
    queuePosition: 0
  });

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
        
        // 更新ELO积分
        await updateEloRatings(
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

  // 更新ELO积分
  const updateEloRatings = async (
    winnerId: string,
    loserId: string,
    winnerRating: number,
    loserRating: number
  ) => {
    // 获取K因子
    const { data: winnerData } = await supabase
      .from('league_rankings')
      .select('matches_played, peak_rating, games_won')
      .eq('user_id', winnerId)
      .single();

    const { data: loserData } = await supabase
      .from('league_rankings')
      .select('matches_played, peak_rating, games_lost')
      .eq('user_id', loserId)
      .single();

    const winnerKFactor = EloCalculator.getKFactor(winnerData?.matches_played || 0);
    const loserKFactor = EloCalculator.getKFactor(loserData?.matches_played || 0);

    // 计算新积分
    const { winnerNewRating, loserNewRating } = EloCalculator.calculate(
      winnerRating, 
      loserRating, 
      Math.max(winnerKFactor, loserKFactor)
    );

    // 更新胜者积分
    await supabase
      .from('league_rankings')
      .upsert({
        user_id: winnerId,
        elo_rating: winnerNewRating,
        peak_rating: Math.max(winnerNewRating, winnerData?.peak_rating || winnerNewRating),
        matches_played: (winnerData?.matches_played || 0) + 1,
        games_won: (winnerData?.games_won || 0) + 1
      });

    // 更新败者积分
    await supabase
      .from('league_rankings')
      .upsert({
        user_id: loserId,
        elo_rating: loserNewRating,
        peak_rating: Math.max(loserNewRating, loserData?.peak_rating || loserNewRating),
        matches_played: (loserData?.matches_played || 0) + 1,
        games_lost: (loserData?.games_lost || 0) + 1
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