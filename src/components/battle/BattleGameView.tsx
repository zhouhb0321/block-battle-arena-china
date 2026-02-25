import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBattleWebSocket, BattleWebSocketMessage } from '@/hooks/useBattleWebSocket';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useUserSettings } from '@/hooks/useUserSettings';
import { calculateAttack } from '@/utils/garbageSystem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Zap } from 'lucide-react';
import { toast } from 'sonner';
import TetrioBattleLayout from '@/components/game/TetrioBattleLayout';
import GameMusicManager from '@/components/GameMusicManager';
import type { GameState, GameMode } from '@/utils/gameTypes';

interface BattleGameViewProps {
  roomId: string;
  onExit: () => void;
}

interface MatchResult {
  winnerId: string;
  scores: Record<string, number>;
  currentMatch: number;
}

const BattleGameView: React.FC<BattleGameViewProps> = ({ roomId, onExit }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useUserSettings();
  const { connect, disconnect, sendMessage, lastMessage, isConnected } = useBattleWebSocket();
  
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [currentMatch, setCurrentMatch] = useState(1);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [pendingGarbage, setPendingGarbage] = useState(0);
  const [opponentUsername, setOpponentUsername] = useState('Opponent');

  // Opponent state
  const [opponentState, setOpponentState] = useState<GameState>({
    board: Array(23).fill(null).map(() => Array(10).fill(0)),
    currentPiece: null,
    ghostPiece: null,
    nextPieces: [],
    holdPiece: null,
    canHold: true,
    isHolding: false,
    score: 0,
    lines: 0,
    level: 1,
    pps: 0,
    apm: 0,
    pieces: 0,
    attack: 0,
    combo: 0,
    b2b: 0,
    paused: false,
    gameOver: false,
    startTime: Date.now(),
    endTime: null,
    clearingLines: [],
    achievements: []
  });

  // Local game logic
  const gameLogic = useGameLogic({
    gameMode: {
      id: 'battle',
      name: 'Battle',
      displayName: 'Battle',
      description: 'Multiplayer battle',
      isTimeAttack: false
    } as GameMode,
    onAttack: (attackData) => {
      const attackLines = calculateAttack(
        attackData.linesCleared,
        attackData.isTSpin,
        attackData.isB2B,
        attackData.combo
      );
      if (attackLines > 0 && isConnected) {
        sendMessage({
          type: 'attack',
          data: { lines: attackLines, attackType: 'line_clear' }
        });
        toast.success(`${t('battle.attack_sent')} ${attackLines} ${t('battle.lines_attack')}!`, { duration: 1500 });
      }
    }
  });

  // Keyboard controls - active only during gameplay
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

  // Build player GameState from gameLogic
  const playerState: GameState = {
    board: gameLogic.board,
    currentPiece: gameLogic.currentPiece,
    ghostPiece: gameLogic.ghostPiece,
    nextPieces: gameLogic.nextPieces,
    holdPiece: gameLogic.holdPiece,
    canHold: gameLogic.canHold,
    isHolding: false,
    score: gameLogic.score,
    lines: gameLogic.lines,
    level: gameLogic.level,
    pps: gameLogic.pps,
    apm: gameLogic.apm,
    pieces: 0,
    attack: 0,
    combo: gameLogic.comboCount,
    b2b: typeof gameLogic.isB2B === 'number' ? gameLogic.isB2B : 0,
    paused: gameLogic.isPaused,
    gameOver: gameLogic.gameOver,
    startTime: Date.now(),
    endTime: null,
    clearingLines: [],
    achievements: []
  };

  // Connect WebSocket
  useEffect(() => {
    if (user && roomId) {
      connect(roomId);
    }
    return () => { disconnect(); };
  }, [user, roomId, connect, disconnect]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const msg = lastMessage as BattleWebSocketMessage & {
      winner?: string;
      scores?: Record<string, number>;
      nextMatch?: number;
      finalScores?: Record<string, number>;
    };

    switch (msg.type) {
      case 'game_start':
        startCountdown();
        break;
      case 'opponent_state_update':
        if (msg.userId !== user?.id && msg.data) {
          setOpponentUsername(msg.data?.username || 'Opponent');
          setOpponentState(prev => ({
            ...prev,
            score: msg.data?.score || 0,
            lines: msg.data?.lines || 0,
            level: msg.data?.level || 1,
            apm: msg.data?.apm || 0,
            pps: msg.data?.pps || 0,
            board: msg.data?.board || prev.board,
            currentPiece: msg.data?.currentPiece || null,
            nextPieces: msg.data?.nextPieces || [],
            holdPiece: msg.data?.holdPiece || null,
            pieces: msg.data?.pieces || 0,
            attack: msg.data?.attack || 0,
            combo: msg.data?.combo || 0,
            b2b: msg.data?.b2b || 0
          }));
        }
        break;
      case 'receive_attack':
        const attackLines = msg.data?.lines || 0;
        setPendingGarbage(prev => prev + attackLines);
        toast.warning(`${t('battle.attack_received')} ${attackLines} ${t('battle.lines_attack')}!`, { duration: 1500 });
        break;
      case 'match_result':
        if (msg.winner && msg.scores && msg.nextMatch) {
          setMatchResult({ winnerId: msg.winner, scores: msg.scores, currentMatch: msg.nextMatch });
          setMatchScores(msg.scores);
          setCurrentMatch(msg.nextMatch);
        }
        break;
      case 'match_ended':
        setGameOver(true);
        if (msg.finalScores) setMatchScores(msg.finalScores);
        break;
      case 'player_left':
        toast.info(t('battle.opponent_left'));
        break;
    }
  }, [lastMessage, user?.id, t]);

  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setGameStarted(true);
          gameLogic.startGame();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Send game state updates periodically
  const stateUpdateRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!gameStarted || !isConnected) return;
    
    stateUpdateRef.current = setInterval(() => {
      sendMessage({
        type: 'game_state_update',
        data: {
          username: user?.username,
          score: gameLogic.score,
          lines: gameLogic.lines,
          level: gameLogic.level,
          apm: gameLogic.apm,
          pps: gameLogic.pps,
          board: gameLogic.board,
          pieces: 0,
          attack: 0,
          combo: gameLogic.comboCount,
          b2b: gameLogic.isB2B
        }
      });
    }, 100);
    
    return () => {
      if (stateUpdateRef.current) clearInterval(stateUpdateRef.current);
    };
  }, [gameStarted, isConnected, sendMessage, user, gameLogic.score, gameLogic.lines]);

  // Handle game over
  useEffect(() => {
    if (gameLogic.gameOver && gameStarted && isConnected) {
      sendMessage({
        type: 'game_over',
        data: { finalScore: gameLogic.score, finalLines: gameLogic.lines }
      });
    }
  }, [gameLogic.gameOver, gameStarted, isConnected, sendMessage]);

  const handleNextMatch = () => {
    setMatchResult(null);
    setGameStarted(false);
    startCountdown();
  };

  // Render countdown
  if (countdown !== null) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-9xl font-bold text-primary animate-bounce">{countdown}</div>
          <p className="text-2xl text-muted-foreground mt-4">
            {t('battle.round')}{currentMatch}{t('battle.round_suffix')} - {t('battle.preparing')}
          </p>
          <div className="flex justify-center gap-8 mt-8">
            <div className="text-center">
              <p className="text-lg font-medium">{user?.username}</p>
              <Badge variant="outline" className="text-2xl px-4 py-1">
                {matchScores[user?.id || ''] || 0}
              </Badge>
            </div>
            <span className="text-3xl font-bold text-muted-foreground">VS</span>
            <div className="text-center">
              <p className="text-lg font-medium">{opponentUsername}</p>
              <Badge variant="outline" className="text-2xl px-4 py-1">
                {Object.entries(matchScores).find(([id]) => id !== user?.id)?.[1] || 0}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render match result
  if (matchResult && !gameOver) {
    const isWinner = matchResult.winnerId === user?.id;
    return (
      <div className="fixed inset-0 bg-background/95 flex items-center justify-center z-50">
        <Card className="p-8 max-w-md text-center">
          <div className={`text-6xl mb-4 ${isWinner ? 'text-green-500' : 'text-red-500'}`}>
            {isWinner ? <Trophy className="w-16 h-16 mx-auto" /> : <Zap className="w-16 h-16 mx-auto" />}
          </div>
          <h2 className="text-3xl font-bold mb-2">
            {isWinner ? t('battle.round_win') : t('battle.round_lose')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('battle.current_score')}: {matchScores[user?.id || ''] || 0} - {Object.entries(matchScores).find(([id]) => id !== user?.id)?.[1] || 0}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleNextMatch}>{t('battle.next_round')}</Button>
            <Button variant="outline" onClick={onExit}>{t('battle.exit')}</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Render final result
  if (gameOver) {
    const myScore = matchScores[user?.id || ''] || 0;
    const opponentScore = Object.entries(matchScores).find(([id]) => id !== user?.id)?.[1] || 0;
    const isWinner = myScore > opponentScore;
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <Card className="p-8 max-w-lg text-center">
          <div className={`text-6xl mb-4 ${isWinner ? 'text-yellow-500' : 'text-muted-foreground'}`}>
            <Trophy className="w-20 h-20 mx-auto" />
          </div>
          <h2 className="text-4xl font-bold mb-2">
            {isWinner ? t('battle.match_victory') : t('battle.match_over')}
          </h2>
          <p className="text-2xl text-muted-foreground mb-6">
            {t('battle.final_score')}: {myScore} : {opponentScore}
          </p>
          <Button size="lg" onClick={onExit}>{t('battle.return_lobby')}</Button>
        </Card>
      </div>
    );
  }

  // Render game
  return (
    <div className="h-screen bg-background flex flex-col">
      <GameMusicManager isGameActive={gameStarted} isGamePaused={gameLogic.isPaused} />
      
      <div className="p-2 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Button size="sm" variant="ghost" onClick={onExit}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('battle.exit')}
          </Button>
          {pendingGarbage > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {t('battle.pending_garbage')}: {pendingGarbage} {t('battle.lines_attack')}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center overflow-hidden">
        <TetrioBattleLayout
          player1={{
            state: playerState,
            username: user?.username || 'Player',
            matchWins: matchScores[user?.id || ''] || 0
          }}
          player2={{
            state: opponentState,
            username: opponentUsername,
            matchWins: Object.entries(matchScores).find(([id]) => id !== user?.id)?.[1] || 0
          }}
          matchNumber={currentMatch}
          totalMatches={5}
          cellSize={20}
          enableGhost={settings.enableGhost}
        />
      </div>

      <div className="p-2 text-center text-muted-foreground text-sm border-t border-border">
        {t('battle.clear_lines_attack')}
      </div>
    </div>
  );
};

export default BattleGameView;
