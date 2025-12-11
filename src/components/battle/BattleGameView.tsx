import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBattleWebSocket, BattleWebSocketMessage } from '@/hooks/useBattleWebSocket';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Zap } from 'lucide-react';
import { toast } from 'sonner';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';

interface BattleGameViewProps {
  roomId: string;
  onExit: () => void;
}

interface PlayerState {
  id: string;
  username: string;
  score: number;
  lines: number;
  level: number;
  apm: number;
  pps: number;
  alive: boolean;
  board?: number[][];
  currentPiece?: any;
  nextPieces?: any[];
  holdPiece?: any;
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
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [opponentState, setOpponentState] = useState<PlayerState | null>(null);
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [currentMatch, setCurrentMatch] = useState(1);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [pendingGarbage, setPendingGarbage] = useState(0);

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
          setOpponentState(prev => ({
            ...prev,
            id: msg.userId || '',
            username: msg.data?.username || 'Opponent',
            score: msg.data?.score || 0,
            lines: msg.data?.lines || 0,
            level: msg.data?.level || 1,
            apm: msg.data?.apm || 0,
            pps: msg.data?.pps || 0,
            alive: msg.data?.alive !== false,
            board: msg.data?.board,
            currentPiece: msg.data?.currentPiece,
            nextPieces: msg.data?.nextPieces,
            holdPiece: msg.data?.holdPiece
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
    
    setPlayerState({
      id: user?.id || '',
      username: user?.username || 'Player',
      score: state.score || 0,
      lines: state.lines || 0,
      level: state.level || 1,
      apm: state.apm || 0,
      pps: state.pps || 0,
      alive: true,
      board: state.board,
      currentPiece: state.currentPiece,
      nextPieces: state.nextPieces,
      holdPiece: state.holdPiece
    });
    
    sendMessage({
      type: 'game_state_update',
      data: {
        username: user?.username,
        score: state.score,
        lines: state.lines,
        level: state.level,
        apm: state.apm,
        pps: state.pps,
        alive: true,
        board: state.board
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

  // 创建空棋盘
  const createEmptyBoard = () => Array(23).fill(null).map(() => Array(10).fill(0));

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
              <p className="text-lg font-medium">{opponentState?.username || '对手'}</p>
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

  // 渲染游戏界面 - 双人对战布局
  return (
    <div className="h-screen bg-background flex flex-col">
      {/* 顶部状态栏 */}
      <div className="p-2 bg-background/80 backdrop-blur border-b">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Button size="sm" variant="ghost" onClick={onExit}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            退出
          </Button>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              第 {currentMatch} / 5 局
            </Badge>
            <div className="flex gap-2">
              <Badge className="bg-blue-500">
                {user?.username}: {matchScores[user?.id || ''] || 0}
              </Badge>
              <span className="text-muted-foreground font-bold">VS</span>
              <Badge className="bg-red-500">
                {opponentState?.username || '对手'}: {Object.entries(matchScores).find(([id]) => id !== user?.id)?.[1] || 0}
              </Badge>
            </div>
          </div>
          
          {pendingGarbage > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              待接收: {pendingGarbage} 行
            </Badge>
          )}
        </div>
      </div>

      {/* 游戏区域 - 左右双棋盘布局 */}
      <div className="flex-1 flex justify-center items-center gap-8 p-4">
        {/* 玩家1 (我方) */}
        <div className="flex flex-col items-center">
          <div className="text-blue-400 font-bold text-lg mb-2">{user?.username || 'Player'}</div>
          <div className="bg-card rounded-lg p-2 border-2 border-blue-500/50">
            <EnhancedGameBoard
              board={playerState?.board || createEmptyBoard()}
              currentPiece={playerState?.currentPiece || null}
              ghostPiece={null}
              cellSize={22}
            />
          </div>
          <div className="mt-2 text-center text-sm">
            <div>分数: {playerState?.score || 0}</div>
            <div>行数: {playerState?.lines || 0}</div>
          </div>
        </div>

        {/* VS 分隔 */}
        <div className="text-4xl font-bold text-yellow-500">VS</div>

        {/* 玩家2 (对手) */}
        <div className="flex flex-col items-center">
          <div className="text-red-400 font-bold text-lg mb-2">{opponentState?.username || 'Opponent'}</div>
          <div className="bg-card rounded-lg p-2 border-2 border-red-500/50">
            <EnhancedGameBoard
              board={opponentState?.board || createEmptyBoard()}
              currentPiece={opponentState?.currentPiece || null}
              ghostPiece={null}
              cellSize={22}
            />
          </div>
          <div className="mt-2 text-center text-sm">
            <div>分数: {opponentState?.score || 0}</div>
            <div>行数: {opponentState?.lines || 0}</div>
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="p-4 text-center text-muted-foreground text-sm">
        游戏进行中 - 消除行数会向对手发送攻击
      </div>
    </div>
  );
};

export default BattleGameView;
