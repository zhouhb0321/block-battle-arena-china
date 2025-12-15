import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBattleWebSocket, BattleWebSocketMessage } from '@/hooks/useBattleWebSocket';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Zap } from 'lucide-react';
import { toast } from 'sonner';
import TetrioBattleLayout from '@/components/game/TetrioBattleLayout';
import type { GameState } from '@/utils/gameTypes';

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
  const { connect, disconnect, sendMessage, lastMessage, isConnected } = useBattleWebSocket();
  
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [currentMatch, setCurrentMatch] = useState(1);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [pendingGarbage, setPendingGarbage] = useState(0);
  
  // 玩家状态 - 使用完整的 GameState
  const [playerState, setPlayerState] = useState<GameState>({
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
  
  const [opponentUsername, setOpponentUsername] = useState('Opponent');

  // 连接 WebSocket
  useEffect(() => {
    if (user && roomId) {
      connect(roomId);
    }
    
    return () => {
      disconnect();
    };
  }, [user, roomId, connect, disconnect]);

  // 处理 WebSocket 消息
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
        toast.warning(`收到 ${attackLines} 行攻击!`, { duration: 1500 });
        break;
        
      case 'match_result':
        if (msg.winner && msg.scores && msg.nextMatch) {
          setMatchResult({
            winnerId: msg.winner,
            scores: msg.scores,
            currentMatch: msg.nextMatch
          });
          setMatchScores(msg.scores);
          setCurrentMatch(msg.nextMatch);
        }
        break;
        
      case 'match_ended':
        setGameOver(true);
        if (msg.finalScores) {
          setMatchScores(msg.finalScores);
        }
        break;
        
      case 'player_left':
        toast.info('对手已离开房间');
        break;
    }
  }, [lastMessage, user?.id]);

  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setGameStarted(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 发送游戏状态更新
  const handleGameStateUpdate = useCallback((state: any) => {
    if (!isConnected) return;
    
    setPlayerState(prev => ({
      ...prev,
      score: state.score || 0,
      lines: state.lines || 0,
      level: state.level || 1,
      apm: state.apm || 0,
      pps: state.pps || 0,
      board: state.board || prev.board,
      currentPiece: state.currentPiece || null,
      nextPieces: state.nextPieces || [],
      holdPiece: state.holdPiece || null,
      pieces: state.pieces || 0,
      attack: state.attack || 0,
      combo: state.combo || 0,
      b2b: state.b2b || 0
    }));
    
    sendMessage({
      type: 'game_state_update',
      data: {
        username: user?.username,
        score: state.score,
        lines: state.lines,
        level: state.level,
        apm: state.apm,
        pps: state.pps,
        board: state.board,
        pieces: state.pieces,
        attack: state.attack,
        combo: state.combo,
        b2b: state.b2b
      }
    });
  }, [isConnected, sendMessage, user]);

  // 发送攻击
  const handleAttack = useCallback((lines: number, attackType: string) => {
    if (!isConnected || lines <= 0) return;
    
    sendMessage({
      type: 'attack',
      data: { lines, attackType }
    });
    
    toast.success(`发送 ${lines} 行攻击!`, { duration: 1500 });
  }, [isConnected, sendMessage]);

  // 下一局
  const handleNextMatch = () => {
    setMatchResult(null);
    setGameStarted(false);
    startCountdown();
  };

  // 渲染倒计时
  if (countdown !== null) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-9xl font-bold text-primary animate-bounce">
            {countdown}
          </div>
          <p className="text-2xl text-muted-foreground mt-4">
            第 {currentMatch} 局 - 准备开始
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

  // 渲染比赛结果
  if (matchResult && !gameOver) {
    const isWinner = matchResult.winnerId === user?.id;
    
    return (
      <div className="fixed inset-0 bg-background/95 flex items-center justify-center z-50">
        <Card className="p-8 max-w-md text-center">
          <div className={`text-6xl mb-4 ${isWinner ? 'text-green-500' : 'text-red-500'}`}>
            {isWinner ? <Trophy className="w-16 h-16 mx-auto" /> : <Zap className="w-16 h-16 mx-auto" />}
          </div>
          <h2 className="text-3xl font-bold mb-2">
            {isWinner ? '本局胜利!' : '本局失败'}
          </h2>
          <p className="text-muted-foreground mb-6">
            当前比分: {matchScores[user?.id || ''] || 0} - {Object.entries(matchScores).find(([id]) => id !== user?.id)?.[1] || 0}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleNextMatch}>
              下一局
            </Button>
            <Button variant="outline" onClick={onExit}>
              退出
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 渲染最终结果
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
            {isWinner ? '比赛胜利!' : '比赛结束'}
          </h2>
          <p className="text-2xl text-muted-foreground mb-6">
            最终比分: {myScore} : {opponentScore}
          </p>
          <Button size="lg" onClick={onExit}>
            返回大厅
          </Button>
        </Card>
      </div>
    );
  }

  // 渲染游戏界面 - 使用 TETR.IO 风格双人对战布局
  return (
    <div className="h-screen bg-background flex flex-col">
      {/* 顶部状态栏 */}
      <div className="p-2 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Button size="sm" variant="ghost" onClick={onExit}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            退出
          </Button>
          
          {pendingGarbage > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              待接收: {pendingGarbage} 行
            </Badge>
          )}
        </div>
      </div>

      {/* 游戏区域 - TETR.IO 风格双人布局 */}
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
          enableGhost={true}
        />
      </div>

      {/* 提示信息 */}
      <div className="p-2 text-center text-muted-foreground text-sm border-t border-border">
        消除行数会向对手发送攻击
      </div>
    </div>
  );
};

export default BattleGameView;
