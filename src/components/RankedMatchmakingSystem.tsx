import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import RankingSystem, { getRankByPoints } from '@/components/RankingSystem';
import UnifiedBattleLayout, { BattlePlayerState } from '@/components/game/UnifiedBattleLayout';
import GameMusicManager from '@/components/GameMusicManager';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useBattleWebSocket } from '@/hooks/useBattleWebSocket';
import { calculateAttack, generateGarbageLines } from '@/utils/garbageSystem';
import { Trophy, Users, Clock, Target, AlertTriangle, ArrowLeft, Crown } from 'lucide-react';
import type { GameMode } from '@/utils/gameTypes';

interface RankedMatchmakingSystemProps {
  onStartMatch: () => void;
  onBack: () => void;
}

interface MatchState {
  id: string;
  opponentId: string;
  opponentUsername: string;
  opponentRating: number;
  bestOf: number;
  playerWins: number;
  opponentWins: number;
  currentGame: number;
  status: 'playing' | 'finished';
}

const RankedMatchmakingSystem: React.FC<RankedMatchmakingSystemProps> = ({ onStartMatch, onBack }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [playerRating] = useState(1250);
  const [matchFound, setMatchFound] = useState(false);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [incomingGarbage, setIncomingGarbage] = useState(0);
  const [outgoingGarbage, setOutgoingGarbage] = useState(0);
  const [matchWinner, setMatchWinner] = useState<'player' | 'opponent' | null>(null);
  const [queueStats] = useState({
    playersInQueue: 31,
    playersInGame: 452
  });

  // WebSocket connection
  const { sendMessage, isConnected, lastMessage, connect, connectionStatus } = useBattleWebSocket();

  // Opponent's game state (received via WebSocket)
  const [opponentState, setOpponentState] = useState({
    board: Array(20).fill(null).map(() => Array(10).fill(0)),
    score: 0,
    lines: 0,
    level: 1,
    apm: 0,
    pps: 0,
    combo: 0,
    b2b: 0,
    alive: true,
    garbageQueued: 0
  });

  // Game logic for ranked match
  const gameLogic = useGameLogic({
    gameMode: {
      id: 'ranked',
      name: 'Ranked Match',
      displayName: 'Ranked Match',
      description: 'Competitive 1v1',
      isTimeAttack: false
    } as GameMode,
    onAttack: (attackData) => {
      const attackLines = calculateAttack(
        attackData.linesCleared,
        attackData.isTSpin,
        attackData.isB2B,
        attackData.combo
      );

      if (attackLines > 0) {
        setOutgoingGarbage(attackLines);
        sendMessage({
          type: 'attack',
          data: { lines: attackLines }
        });
        setTimeout(() => setOutgoingGarbage(0), 500);
      }
    }
  });

  // Keyboard controls - only active during game
  useKeyboardControls({
    gameSettings: settings,
    gameOver: gameLogic.gameOver,
    paused: gameLogic.isPaused || !gameStarted,
    onMoveLeft: () => gameLogic.movePiece(-1, 0),
    onMoveRight: () => gameLogic.movePiece(1, 0),
    onSoftDrop: () => gameLogic.movePiece(0, 1),
    onHardDrop: gameLogic.hardDrop,
    onRotateClockwise: gameLogic.rotatePieceClockwise,
    onRotateCounterclockwise: gameLogic.rotatePieceCounterclockwise,
    onRotate180: gameLogic.rotatePiece180,
    onHold: gameLogic.holdCurrentPiece,
    onPause: () => {},
    onInstantSoftDrop: gameLogic.instantSoftDrop
  });

  // Search timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const message = JSON.parse(lastMessage.data);
    
    switch (message.type) {
      case 'match_found':
        setMatchFound(true);
        setMatchState({
          id: message.matchId,
          opponentId: message.opponentId,
          opponentUsername: message.opponentUsername,
          opponentRating: message.opponentRating,
          bestOf: 5,
          playerWins: 0,
          opponentWins: 0,
          currentGame: 1,
          status: 'playing'
        });
        setCountdown(3);
        break;

      case 'game_start':
        setGameStarted(true);
        gameLogic.startGame();
        break;

      case 'opponent_state':
        setOpponentState(message.data);
        break;

      case 'receive_attack':
        setIncomingGarbage(prev => prev + message.data.lines);
        setTimeout(() => setIncomingGarbage(0), 500);
        break;

      case 'game_result':
        if (message.data.winner === user?.id) {
          setMatchState(prev => prev ? { ...prev, playerWins: prev.playerWins + 1 } : null);
        } else {
          setMatchState(prev => prev ? { ...prev, opponentWins: prev.opponentWins + 1 } : null);
        }
        break;

      case 'match_result':
        setMatchWinner(message.data.winner === user?.id ? 'player' : 'opponent');
        setGameStarted(false);
        break;
    }
  }, [lastMessage, user?.id, gameLogic]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        if (countdown === 1) {
          setGameStarted(true);
          gameLogic.startGame();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, gameLogic]);

  // Send game state updates
  useEffect(() => {
    if (!gameStarted || !isConnected) return;

    sendMessage({
      type: 'game_state',
      data: {
        board: gameLogic.board,
        score: gameLogic.score,
        lines: gameLogic.lines,
        level: gameLogic.level,
        apm: gameLogic.apm,
        pps: gameLogic.pps,
        combo: gameLogic.comboCount,
        b2b: gameLogic.isB2B,
        alive: !gameLogic.gameOver
      }
    });
  }, [gameLogic.score, gameLogic.lines, gameStarted, isConnected, sendMessage]);

  // Handle game over
  useEffect(() => {
    if (gameLogic.gameOver && gameStarted) {
      sendMessage({
        type: 'game_over',
        data: {
          finalScore: gameLogic.score,
          finalLines: gameLogic.lines
        }
      });
    }
  }, [gameLogic.gameOver, gameStarted, sendMessage]);

  const calculateEstimatedWaitTime = () => {
    const baseWaitTime = Math.max(15, queueStats.playersInQueue * 2);
    return Math.min(baseWaitTime, 120);
  };

  // 计算当前匹配分数范围 (随时间扩大)
  const getCurrentRatingRange = useCallback(() => {
    const initialRange = 100; // 初始 ±100 分
    const expansionRate = 50; // 每10秒扩大50分
    const maxRange = 500; // 最大 ±500 分
    return Math.min(initialRange + Math.floor(searchTime / 10) * expansionRate, maxRange);
  }, [searchTime]);

  const handleStartSearch = () => {
    if (!user || user.isGuest) {
      return;
    }
    
    setIsSearching(true);
    setSearchTime(0);
    
    // Connect to matchmaking WebSocket with rating info
    connect('ranked-queue');
    
    // Send matchmaking request with rating range
    setTimeout(() => {
      sendMessage({
        type: 'join_queue',
        data: {
          userId: user.id,
          rating: playerRating,
          ratingRange: getCurrentRatingRange()
        }
      });
    }, 500);
    
    // Simulate finding a match for demo (with rating-based matching)
    const estimatedTime = calculateEstimatedWaitTime();
    setTimeout(() => {
      setIsSearching(false);
      setMatchFound(true);
      // 模拟匹配到分数相近的对手 (实际应由服务器处理)
      const opponentRating = playerRating + Math.floor(Math.random() * 200) - 100;
      setMatchState({
        id: 'demo-match',
        opponentId: 'opponent-123',
        opponentUsername: 'Opponent',
        opponentRating: opponentRating,
        bestOf: 5,
        playerWins: 0,
        opponentWins: 0,
        currentGame: 1,
        status: 'playing'
      });
      setCountdown(3);
    }, 5000);
  };

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchTime(0);
    // Notify server to leave queue
    sendMessage({ type: 'leave_queue' });
  };

  // Show match in progress
  if (matchFound && matchState) {
    const mainPlayerState: BattlePlayerState = {
      id: user?.id || '',
      username: user?.user_metadata?.username || 'Player',
      rank: getRankByPoints(playerRating).tier,
      board: gameLogic.board,
      currentPiece: gameLogic.currentPiece,
      ghostPiece: gameLogic.ghostPiece,
      holdPiece: gameLogic.holdPiece,
      nextPieces: gameLogic.nextPieces,
      canHold: gameLogic.canHold,
      score: gameLogic.score,
      lines: gameLogic.lines,
      level: gameLogic.level,
      pps: gameLogic.pps,
      apm: gameLogic.apm,
      combo: gameLogic.comboCount,
      b2b: gameLogic.isB2B ? 1 : 0,
      attack: 0,
      pieces: 0,
      time: gameLogic.time,
      alive: !gameLogic.gameOver,
      garbageQueued: incomingGarbage
    };

    const opponentPlayerState: BattlePlayerState = {
      id: matchState.opponentId,
      username: matchState.opponentUsername,
      rank: getRankByPoints(matchState.opponentRating).tier,
      board: opponentState.board,
      currentPiece: null,
      ghostPiece: null,
      holdPiece: null,
      nextPieces: [],
      canHold: true,
      score: opponentState.score,
      lines: opponentState.lines,
      level: opponentState.level,
      pps: opponentState.pps,
      apm: opponentState.apm,
      combo: opponentState.combo,
      b2b: opponentState.b2b,
      attack: 0,
      pieces: 0,
      time: 0,
      alive: opponentState.alive,
      garbageQueued: opponentState.garbageQueued
    };

    // Show countdown
    if (countdown > 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 flex items-center justify-center">
          <Card className="p-12 text-center">
            <div className="text-6xl font-bold text-primary animate-pulse">{countdown}</div>
            <p className="text-muted-foreground mt-4">vs {matchState.opponentUsername}</p>
          </Card>
        </div>
      );
    }

    // Show match result
    if (matchWinner) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 flex items-center justify-center">
          <Card className="p-8 text-center space-y-4">
            <Crown className={`w-16 h-16 mx-auto ${matchWinner === 'player' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <h2 className="text-3xl font-bold">
              {matchWinner === 'player' ? '胜利！' : '失败'}
            </h2>
            <p className="text-muted-foreground">
              {matchState.playerWins} - {matchState.opponentWins}
            </p>
            <Button onClick={onBack}>返回</Button>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
        <GameMusicManager isGameActive={gameStarted} isGamePaused={gameLogic.isPaused} />
        
        <UnifiedBattleLayout
          mainPlayer={mainPlayerState}
          opponents={[opponentPlayerState]}
          matchInfo={{
            mode: '1v1',
            bestOf: matchState.bestOf,
            currentGame: matchState.currentGame
          }}
          incomingGarbage={incomingGarbage}
          outgoingGarbage={outgoingGarbage}
          onBack={() => {
            setMatchFound(false);
            setMatchState(null);
            setGameStarted(false);
          }}
          isGameActive={gameStarted}
          isPaused={gameLogic.isPaused}
          cellSize={28}
          enableGhost={settings.enableGhost}
          connectionStatus={connectionStatus}
        />
      </div>
    );
  }

  // Matchmaking lobby UI
  const currentRank = getRankByPoints(playerRating);
  const estimatedWaitTime = calculateEstimatedWaitTime();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={onBack} className="mr-4 text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-white mb-2">{t('ranked.title')}</h1>
            <p className="text-xl text-gray-300">{t('ranked.description')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Rank Info */}
          <div className="lg:col-span-1">
            <RankingSystem playerPoints={playerRating} className="mb-6" />
            
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Target className="w-5 h-5" />
                  {t('ranked.season_stats')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('ranked.games_played')}</span>
                  <span className="font-semibold text-white">127</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('ranked.win_rate')}</span>
                  <span className="font-semibold text-green-400">68%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('ranked.average_pps')}</span>
                  <span className="font-semibold text-white">2.3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('ranked.average_apm')}</span>
                  <span className="font-semibold text-white">89.5</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Matchmaking */}
          <div className="lg:col-span-2">
            <Alert className="mb-6 bg-red-900/20 border-red-500 text-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="font-semibold text-lg">
                {t('ranked.leaving_penalty')}
              </AlertDescription>
            </Alert>

            <Card className="mb-6 bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5" />
                  TETRA LEAGUE
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isSearching ? (
                  <div className="text-center py-8">
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-400">{queueStats.playersInQueue}</div>
                        <div className="text-sm text-gray-400">{t('ranked.queue_info')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400">{queueStats.playersInGame}</div>
                        <div className="text-sm text-gray-400">{t('ranked.in_game')}</div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="text-lg text-gray-300 mb-2">{t('ranked.estimated_time')}</div>
                      <div className="text-2xl font-bold text-white">{estimatedWaitTime}s</div>
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-8">
                      <Badge className="bg-red-600 hover:bg-red-700 text-white text-lg px-4 py-2">
                        {currentRank.tier}
                      </Badge>
                      <span className="text-gray-400">±2 rank range</span>
                    </div>
                    
                    <Button 
                      onClick={handleStartSearch}
                      className="bg-red-600 hover:bg-red-700 text-white px-12 py-4 text-xl font-bold"
                      disabled={!user || user.isGuest}
                      size="lg"
                    >
                      {t('ranked.enter_matchmaking')}
                    </Button>
                    
                    {(!user || user.isGuest) && (
                      <p className="text-sm text-gray-500 mt-4">
                        {t('ranked.need_login')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-24 h-24 mx-auto mb-6 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                      <Clock className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white">{t('ranked.finding_match')}</h3>
                    
                    {/* 显示当前匹配范围 */}
                    <div className="mb-4 text-sm text-gray-300">
                      搜索范围: {playerRating} ± {getCurrentRatingRange()} 分
                    </div>
                    
                    <div className="mb-6">
                      <div className="text-4xl font-mono font-bold text-red-400 mb-2">
                        {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
                      </div>
                      <Progress 
                        value={(searchTime / estimatedWaitTime) * 100} 
                        className="mb-4 bg-gray-700"
                      />
                    </div>
                    
                    <Button
                      onClick={handleCancelSearch}
                      variant="outline"
                      className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                    >
                      {t('ranked.cancel_search')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Matches */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">{t('ranked.recent_matches')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { opponent: 'Player123', result: 'win', rating: '+15', time: '2h ago' },
                    { opponent: 'TetrisKing', result: 'loss', rating: '-12', time: '5h ago' },
                    { opponent: 'BlockMaster', result: 'win', rating: '+18', time: '1d ago' },
                  ].map((match, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={match.result === 'win' ? 'default' : 'destructive'}>
                          {match.result === 'win' ? t('ranked.win') : t('ranked.loss')}
                        </Badge>
                        <span className="font-medium text-white">{match.opponent}</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${match.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                          {match.rating}
                        </div>
                        <div className="text-sm text-gray-500">{match.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankedMatchmakingSystem;
