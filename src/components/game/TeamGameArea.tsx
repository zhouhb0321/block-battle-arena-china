import React, { useState, useEffect, useCallback } from 'react';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useBattleWebSocket } from '@/hooks/useBattleWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Crown } from 'lucide-react';
import MultiplayerBattleLayout, { PlayerState } from './MultiplayerBattleLayout';
import GameMusicManager from '@/components/GameMusicManager';
import { calculateAttack, generateGarbageLines, addGarbageToBoard } from '@/utils/garbageSystem';
import type { GameMode } from '@/utils/gameTypes';

interface TeamGameAreaProps {
  roomId: string;
  roomData?: any;
  onGameEnd?: () => void;
  onBackToMenu?: () => void;
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

const TeamGameArea: React.FC<TeamGameAreaProps> = ({
  roomId,
  roomData,
  onGameEnd,
  onBackToMenu
}) => {
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

  const { sendMessage, isConnected, lastMessage, connect } = useBattleWebSocket();

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

    const message = JSON.parse(lastMessage.data);

    switch (message.type) {
      case 'participant_update':
        setParticipants(message.participants || []);
        break;

      case 'game_start':
        setGameStarted(true);
        gameLogic.startGame();
        break;

      case 'team_attack':
        if (message.data.fromTeam !== userTeam) {
          // Receive attack from opposing team
          setIncomingGarbage(prev => prev + message.data.lines);
          
          // Apply garbage after delay
          setTimeout(() => {
            const garbageLines = generateGarbageLines(message.data.lines);
            // Note: actual garbage application would need board update mechanism
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
    }
  }, [lastMessage, userTeam, gameLogic, onGameEnd]);

  // Send game state updates
  useEffect(() => {
    if (!gameStarted || !user) return;

    const gameState = {
      board: gameLogic.board,
      score: gameLogic.score,
      lines: gameLogic.lines,
      level: gameLogic.level,
      apm: gameLogic.apm,
      pps: gameLogic.pps,
      combo: gameLogic.comboCount,
      b2b: gameLogic.isB2B,
      totalAttack: 0,
      alive: !gameLogic.gameOver,
      garbageQueued: incomingGarbage
    };

    sendMessage({
      type: 'team_state_update',
      data: gameState
    });
  }, [gameLogic.score, gameLogic.lines, gameLogic.level, gameStarted, user, sendMessage, incomingGarbage]);

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
  const mainPlayerState: PlayerState = {
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
    totalAttack: 0,
    alive: !gameLogic.gameOver,
    garbageQueued: incomingGarbage
  };

  // Build other players states
  const otherPlayersStates: PlayerState[] = participants
    .filter(p => p.id !== user?.id)
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
      totalAttack: p.gameState?.totalAttack || 0,
      alive: p.gameState?.alive !== false,
      garbageQueued: p.gameState?.garbageQueued || 0
    }));

  const handleAchievementComplete = (id: string) => {
    setAchievements(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/90 to-primary/5">
      <GameMusicManager isGameActive={gameStarted} isGamePaused={gameLogic.isPaused} />
      
      <MultiplayerBattleLayout
        mainPlayer={mainPlayerState}
        otherPlayers={otherPlayersStates}
        matchInfo={{
          mode: 'team',
          teamAScore: participants.filter(p => p.team === 'A' && p.gameState?.alive !== false).length,
          teamBScore: participants.filter(p => p.team === 'B' && p.gameState?.alive !== false).length
        }}
        attackTarget={attackTarget}
        onTargetChange={setAttackTarget}
        incomingGarbage={incomingGarbage}
        outgoingGarbage={outgoingGarbage}
        onBack={onBackToMenu}
        isGameActive={gameStarted}
        isPaused={gameLogic.isPaused}
        achievements={achievements}
        onAchievementComplete={handleAchievementComplete}
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
          </Card>
        </div>
      )}
    </div>
  );
};

export default TeamGameArea;
