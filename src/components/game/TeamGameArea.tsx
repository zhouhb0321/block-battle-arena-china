import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useBattleWebSocket } from '@/hooks/useBattleWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, ArrowLeft } from 'lucide-react';
import UnifiedBattleLayout, { BattlePlayerState, BattleAchievement } from './UnifiedBattleLayout';
import GameMusicManager from '@/components/GameMusicManager';
import { calculateAttack, generateGarbageLines, addGarbageToBoard } from '@/utils/garbageSystem';
import { compressGameState, decompressGameState, FullGameState, CompressedGameState } from '@/utils/battleCompression';
import { soundEffects } from '@/utils/soundEffects';
import type { GameMode } from '@/utils/gameTypes';

interface TeamGameAreaProps {
  roomId: string;
  roomData?: any;
  onGameEnd?: () => void;
  onBackToMenu?: () => void;
  onExit?: () => void; // Alias for onBackToMenu
}

interface TeamMember {
  id: string;
  username: string;
  team: 'A' | 'B';
  position: number;
  rank?: string;
  gameState?: {
    board: number[][];
    score: number;
    lines: number;
    level: number;
    apm: number;
    pps: number;
    combo: number;
    b2b: number;
    totalAttack: number;
    alive: boolean;
    garbageQueued: number;
  };
}

// 状态同步节流间隔 (ms)
const SYNC_THROTTLE_INTERVAL = 150;

const TeamGameArea: React.FC<TeamGameAreaProps> = ({
  roomId,
  roomData,
  onGameEnd,
  onBackToMenu,
  onExit
}) => {
  // onExit is an alias for onBackToMenu for consistency
  const handleExit = onExit || onBackToMenu;
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useUserSettings();
  const [participants, setParticipants] = useState<TeamMember[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [matchWinner, setMatchWinner] = useState<'A' | 'B' | null>(null);
  const [incomingGarbage, setIncomingGarbage] = useState(0);
  const [outgoingGarbage, setOutgoingGarbage] = useState(0);
  const [attackTarget, setAttackTarget] = useState<string>('random');
  const [achievements, setAchievements] = useState<any[]>([]);
  const [lastLinesCleared, setLastLinesCleared] = useState(0);
  const [waitingForPlayers, setWaitingForPlayers] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [gameSeed, setGameSeed] = useState<string | undefined>(undefined);
  
  // 对战特效状态
  const [showKO, setShowKO] = useState(false);
  const [koTargetName, setKoTargetName] = useState<string>('');
  const [lastAttackSent, setLastAttackSent] = useState(0);
  const lastAttackTimestampRef = useRef(0);
  
  // 节流相关 refs
  const lastSyncTimeRef = useRef<number>(0);
  const pendingSyncRef = useRef<NodeJS.Timeout | null>(null);
  const previousStateRef = useRef<FullGameState | null>(null);
  const statsIntervalRef = useRef(0);

  // Determine user's team
  const userTeam = participants.find(p => p.id === user?.id)?.team || 'A';

  // Game logic with attack callback
  const gameLogic = useGameLogic({
    gameMode: { 
      id: 'team_battle', 
      name: 'Team Battle',
      displayName: 'Team Battle',
      description: 'Team vs Team',
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
        setOutgoingGarbage(prev => prev + attackLines);
        
        // 播放攻击发送音效
        soundEffects.playAttackSent();
        
        // 触发攻击发送特效 (使用时间戳确保每次攻击都能触发)
        lastAttackTimestampRef.current = Date.now();
        setLastAttackSent(attackLines + lastAttackTimestampRef.current * 0.0001);
        
        // Send attack to opposing team
        sendMessage({
          type: 'team_attack',
          data: {
            fromTeam: userTeam,
            lines: attackLines,
            targetStrategy: attackTarget
          }
        });

        // Clear outgoing after animation
        setTimeout(() => setOutgoingGarbage(0), 500);
      }
    }
  });

  // Keyboard controls
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

  const { sendMessage, isConnected, lastMessage, connect, connectionStatus } = useBattleWebSocket();

  // Connect to room on mount
  useEffect(() => {
    if (roomId && user?.id) {
      connect(roomId);
    }
  }, [roomId, user?.id, connect]);

  // Track line clears for attack calculation
  useEffect(() => {
    if (gameLogic.lines !== lastLinesCleared && gameLogic.lines > lastLinesCleared) {
      const clearedNow = gameLogic.lines - lastLinesCleared;
      // Attack is handled via onAttack callback in useGameLogic
    }
    setLastLinesCleared(gameLogic.lines);
  }, [gameLogic.lines, lastLinesCleared]);

  // WebSocket message handling
  useEffect(() => {
    if (!lastMessage) return;

    // lastMessage 已经是解析后的对象，不需要再次 JSON.parse
    const message = lastMessage;

    switch (message.type) {
      case 'participant_update':
        setParticipants(message.participants || []);
        break;

      case 'game_start':
        // 保存游戏种子用于同步方块生成
        if (message.seed) {
          setGameSeed(message.seed);
        }
        setGameStarted(true);
        // 使用种子启动游戏以确保所有玩家方块序列一致
        gameLogic.startGame(message.seed);
        break;

      case 'team_attack':
        if (message.data?.fromTeam !== userTeam) {
          const attackLines = message.data?.lines || 0;
          // Receive attack from opposing team
          setIncomingGarbage(prev => prev + attackLines);
          
          // 播放收到攻击音效
          soundEffects.playAttackReceived();
          if (attackLines >= 4) {
            soundEffects.playGarbageWarning();
          }
          
          // Apply garbage after delay
          setTimeout(() => {
            const garbageLines = generateGarbageLines(attackLines);
            // Note: actual garbage application would need board update mechanism
            setIncomingGarbage(0);
          }, 500);
        }
        break;

      case 'receive_team_attack':
        // 处理接收到的团队攻击
        if (message.data?.fromTeam !== userTeam) {
          const attackLines = message.data?.lines || 0;
          setIncomingGarbage(prev => prev + attackLines);
          
          // 播放收到攻击音效
          soundEffects.playAttackReceived();
          if (attackLines >= 4) {
            soundEffects.playGarbageWarning();
          }
          
          setTimeout(() => {
            setIncomingGarbage(0);
          }, 500);
        }
        break;

      case 'team_state_update':
        setParticipants(prev => prev.map(p => 
          p.id === message.userId 
            ? { ...p, gameState: message.data }
            : p
        ));
        break;

      case 'team_member_eliminated':
        // 查找被淘汰的玩家名称
        const eliminatedPlayer = participants.find(p => p.id === message.userId);
        if (eliminatedPlayer && eliminatedPlayer.team !== userTeam) {
          // 对方队伍成员被淘汰，显示 KO 特效并播放音效
          soundEffects.playKO();
          setKoTargetName(eliminatedPlayer.username);
          setShowKO(true);
        }
        
        setParticipants(prev => prev.map(p =>
          p.id === message.userId
            ? { ...p, gameState: { ...p.gameState, alive: false } }
            : p
        ));
        break;

      case 'team_victory':
        setMatchWinner(message.winningTeam);
        setGameStarted(false);
        if (onGameEnd) {
          setTimeout(onGameEnd, 3000);
        }
        break;
        
      case 'player_joined':
      case 'player_left':
        // 这些消息由服务器广播，更新玩家列表
        break;
    }
  }, [lastMessage, userTeam, gameLogic, onGameEnd]);

  // Send game state updates with throttling
  useEffect(() => {
    if (!gameStarted || !user) return;

    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;

    const sendStateUpdate = () => {
      const currentState: FullGameState = {
        board: gameLogic.board,
        score: gameLogic.score,
        lines: gameLogic.lines,
        level: gameLogic.level,
        apm: gameLogic.apm,
        pps: gameLogic.pps,
        combo: gameLogic.comboCount,
        b2b: gameLogic.isB2B ? 1 : 0,
        totalAttack: 0,
        alive: !gameLogic.gameOver,
        garbageQueued: incomingGarbage
      };

      // 每秒(约6次同步)发送一次完整统计数据
      statsIntervalRef.current++;
      const includeStats = statsIntervalRef.current >= 6;
      if (includeStats) statsIntervalRef.current = 0;

      // 使用压缩发送增量更新
      const compressed = compressGameState(
        currentState,
        previousStateRef.current,
        includeStats
      );

      sendMessage({
        type: 'team_state_update',
        data: compressed,
        compressed: true
      });
      
      previousStateRef.current = currentState;
      lastSyncTimeRef.current = Date.now();
    };

    // 如果距离上次同步时间超过节流间隔，立即发送
    if (timeSinceLastSync >= SYNC_THROTTLE_INTERVAL) {
      // 清除之前的待发送定时器
      if (pendingSyncRef.current) {
        clearTimeout(pendingSyncRef.current);
        pendingSyncRef.current = null;
      }
      sendStateUpdate();
    } else {
      // 否则设置延迟发送，确保状态最终会被同步
      if (!pendingSyncRef.current) {
        pendingSyncRef.current = setTimeout(() => {
          sendStateUpdate();
          pendingSyncRef.current = null;
        }, SYNC_THROTTLE_INTERVAL - timeSinceLastSync);
      }
    }

    return () => {
      if (pendingSyncRef.current) {
        clearTimeout(pendingSyncRef.current);
        pendingSyncRef.current = null;
      }
    };
  }, [gameLogic.score, gameLogic.lines, gameLogic.level, gameLogic.board, gameStarted, user, sendMessage, incomingGarbage]);

  // Handle game over
  useEffect(() => {
    if (gameLogic.gameOver && gameStarted) {
      sendMessage({
        type: 'team_member_eliminated',
        userId: user?.id,
        data: {
          finalScore: gameLogic.score,
          finalLines: gameLogic.lines,
          duration: gameLogic.time
        }
      });
    }
  }, [gameLogic.gameOver, gameStarted, user?.id, sendMessage]);

  // Build main player state
  const mainPlayerState: BattlePlayerState = useMemo(() => ({
    id: user?.id || '',
    username: user?.user_metadata?.username || 'Player',
    team: userTeam,
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
    b2b: gameLogic.isB2B,
    attack: 0,
    pieces: 0,
    time: gameLogic.time,
    alive: !gameLogic.gameOver,
    garbageQueued: incomingGarbage
  }), [user, userTeam, gameLogic, incomingGarbage]);

  // 分离队友和对手
  const { teammates, opponents } = useMemo(() => {
    const others = participants.filter(p => p.id !== user?.id);
    const teammatesList = others
      .filter(p => p.team === userTeam)
      .map(p => ({
        id: p.id,
        username: p.username,
        team: p.team,
        rank: p.rank,
        board: p.gameState?.board || Array(20).fill(null).map(() => Array(10).fill(0)),
        currentPiece: null,
        ghostPiece: null,
        holdPiece: null,
        nextPieces: [],
        canHold: true,
        score: p.gameState?.score || 0,
        lines: p.gameState?.lines || 0,
        level: p.gameState?.level || 1,
        pps: p.gameState?.pps || 0,
        apm: p.gameState?.apm || 0,
        combo: p.gameState?.combo || 0,
        b2b: p.gameState?.b2b || 0,
        attack: p.gameState?.totalAttack || 0,
        pieces: 0,
        time: 0,
        alive: p.gameState?.alive !== false,
        garbageQueued: p.gameState?.garbageQueued || 0
      } as BattlePlayerState));
    
    const opponentsList = others
      .filter(p => p.team !== userTeam)
      .map(p => ({
        id: p.id,
        username: p.username,
        team: p.team,
        rank: p.rank,
        board: p.gameState?.board || Array(20).fill(null).map(() => Array(10).fill(0)),
        currentPiece: null,
        ghostPiece: null,
        holdPiece: null,
        nextPieces: [],
        canHold: true,
        score: p.gameState?.score || 0,
        lines: p.gameState?.lines || 0,
        level: p.gameState?.level || 1,
        pps: p.gameState?.pps || 0,
        apm: p.gameState?.apm || 0,
        combo: p.gameState?.combo || 0,
        b2b: p.gameState?.b2b || 0,
        attack: p.gameState?.totalAttack || 0,
        pieces: 0,
        time: 0,
        alive: p.gameState?.alive !== false,
        garbageQueued: p.gameState?.garbageQueued || 0
      } as BattlePlayerState));
    
    return { teammates: teammatesList, opponents: opponentsList };
  }, [participants, user?.id, userTeam]);

  const handleAchievementComplete = (id: string) => {
    setAchievements(prev => prev.filter(a => a.id !== id));
  };

  // Check if we have enough players (at least 2 from different teams or 2 total)
  useEffect(() => {
    const hasEnoughPlayers = participants.length >= 2;
    const hasBothTeams = participants.some(p => p.team === 'A') && participants.some(p => p.team === 'B');
    
    if (hasEnoughPlayers || hasBothTeams) {
      setWaitingForPlayers(false);
    } else {
      setWaitingForPlayers(true);
    }
  }, [participants]);

  // Start countdown when all players are ready
  useEffect(() => {
    if (!waitingForPlayers && allPlayersReady && !gameStarted && countdown === null) {
      setCountdown(3);
    }
  }, [waitingForPlayers, allPlayersReady, gameStarted, countdown]);

  // Countdown timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setGameStarted(true);
      setCountdown(null);
    }
  }, [countdown]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/90 to-primary/5">
      <GameMusicManager isGameActive={gameStarted} isGamePaused={gameLogic.isPaused} />
      
      {/* Waiting for Players Screen */}
      {waitingForPlayers && (
        <div className="fixed inset-0 bg-background/95 flex items-center justify-center z-50">
          <Card className="p-8 text-center space-y-6 max-w-md">
            <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div>
              <h2 className="text-2xl font-bold mb-2">等待对手加入...</h2>
              <p className="text-muted-foreground">需要至少2名玩家才能开始游戏</p>
              <p className="text-sm text-muted-foreground mt-2">
                当前玩家: {participants.length}
              </p>
            </div>
            <Button variant="outline" onClick={handleExit}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回多人模式
            </Button>
          </Card>
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-8xl font-bold text-primary animate-pulse">
              {countdown}
            </div>
            <p className="text-2xl text-white mt-4">游戏即将开始</p>
          </div>
        </div>
      )}
      
      <UnifiedBattleLayout
        mainPlayer={mainPlayerState}
        opponents={opponents}
        teammates={teammates}
        matchInfo={{
          mode: 'team',
          teamAWins: participants.filter(p => p.team === 'A' && p.gameState?.alive !== false).length,
          teamBWins: participants.filter(p => p.team === 'B' && p.gameState?.alive !== false).length
        }}
        attackTarget={attackTarget}
        onTargetChange={setAttackTarget}
        incomingGarbage={incomingGarbage}
        outgoingGarbage={outgoingGarbage}
        onBack={handleExit}
        isGameActive={gameStarted}
        isPaused={gameLogic.isPaused}
        achievements={achievements as BattleAchievement[]}
        onAchievementComplete={handleAchievementComplete}
        // 对战特效属性
        showKO={showKO}
        koTargetName={koTargetName}
        onKOComplete={() => setShowKO(false)}
        lastAttackSent={lastAttackSent}
        // 网络状态
        connectionStatus={connectionStatus}
      />

      {/* Victory Screen */}
      {matchWinner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="p-8 text-center space-y-4">
            <Crown className="w-16 h-16 mx-auto text-yellow-500" />
            <h2 className="text-3xl font-bold">
              Team {matchWinner} 获胜！
            </h2>
            <p className="text-muted-foreground">
              {matchWinner === userTeam ? '恭喜你的团队获得胜利！' : '你的团队失败了，下次加油！'}
            </p>
            <Button onClick={handleExit}>
              返回多人模式
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TeamGameArea;
