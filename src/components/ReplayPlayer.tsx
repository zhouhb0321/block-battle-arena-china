
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, SkipBack, SkipForward, Clock } from 'lucide-react';
import GameBoard from './GameBoard';
import type { ReplayAction, GameState, TetrominoType } from '@/utils/gameTypes';
import { createEmptyBoard, TETROMINO_TYPES, createNewPiece } from '@/utils/tetrisLogic';

interface ReplayPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  replayData: {
    actions: ReplayAction[];
    startTime: number;
    initialBoard: number[][];
    settings: any;
  } | null;
  gameInfo: {
    playerName: string;
    gameMode: string;
    score: number;
    lines: number;
    duration: number;
    pps: number;
    apm: number;
  };
}

const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  isOpen,
  onClose,
  replayData,
  gameInfo
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [gameState, setGameState] = useState<GameState>(() => ({
    board: createEmptyBoard(),
    currentPiece: null,
    nextPieces: [],
    holdPiece: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    combo: 0,
    b2b: 0,
    pieces: 0,
    startTime: Date.now(),
    paused: false,
    gameOver: false,
    clearingLines: [],
    attack: 0,
    pps: 0,
    apm: 0
  }));

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionIndexRef = useRef(0);

  const totalDuration = replayData ? 
    Math.max(...replayData.actions.map(a => a.timestamp), gameInfo.duration * 1000) : 0;

  // 重置回放状态
  const resetReplay = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    lastActionIndexRef.current = 0;
    
    if (replayData) {
      setGameState({
        board: replayData.initialBoard.map(row => [...row]),
        currentPiece: null,
        nextPieces: [],
        holdPiece: null,
        canHold: true,
        score: 0,
        lines: 0,
        level: 1,
        combo: 0,
        b2b: 0,
        pieces: 0,
        startTime: Date.now(),
        paused: false,
        gameOver: false,
        clearingLines: [],
        attack: 0,
        pps: 0,
        apm: 0
      });
    }
  };

  // 播放回放
  const playReplay = () => {
    if (!replayData) return;
    
    setIsPlaying(true);
    
    intervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + (50 * playbackSpeed); // 50ms 间隔
        
        // 应用在这个时间点之前的所有动作
        const actionsToApply = replayData.actions.filter(
          (action, index) => 
            action.timestamp <= newTime && 
            index >= lastActionIndexRef.current
        );
        
        if (actionsToApply.length > 0) {
          lastActionIndexRef.current += actionsToApply.length;
          
          // 应用动作到游戏状态
          setGameState(prevState => {
            let newState = { ...prevState };
            
            actionsToApply.forEach(action => {
              switch (action.action) {
                case 'place':
                  // 方块放置
                  if (action.data.piece && action.data.board) {
                    newState.board = action.data.board;
                    newState.score = action.data.score || newState.score;
                    newState.lines = action.data.lines || newState.lines;
                    newState.level = action.data.level || newState.level;
                  }
                  break;
                case 'move':
                  // 方块移动
                  if (action.data.piece) {
                    newState.currentPiece = action.data.piece;
                  }
                  break;
                case 'rotate':
                  // 方块旋转
                  if (action.data.piece) {
                    newState.currentPiece = action.data.piece;
                  }
                  break;
                case 'hold':
                  // 暂存方块
                  if (action.data.holdPiece !== undefined) {
                    newState.holdPiece = action.data.holdPiece;
                    newState.canHold = action.data.canHold;
                  }
                  if (action.data.currentPiece) {
                    newState.currentPiece = action.data.currentPiece;
                  }
                  break;
              }
            });
            
            return newState;
          });
        }
        
        // 检查是否到达结尾
        if (newTime >= totalDuration) {
          setIsPlaying(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return totalDuration;
        }
        
        return newTime;
      });
    }, 50);
  };

  // 暂停回放
  const pauseReplay = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 当回放数据改变时重置
  useEffect(() => {
    if (replayData) {
      resetReplay();
    }
  }, [replayData]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  if (!replayData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            回放 - {gameInfo.playerName} ({gameInfo.gameMode})
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 游戏画面 */}
          <div className="lg:col-span-2 flex flex-col items-center">
            <div className="mb-4">
              <GameBoard
                board={gameState.board}
                currentPiece={gameState.currentPiece}
                ghostPiece={gameState.ghostPiece}
                enableGhost={true}
                cellSize={25}
                clearingLines={gameState.clearingLines}
              />
            </div>
            
            {/* 播放控制 */}
            <div className="w-full space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm w-12">{formatTime(currentTime)}</span>
                <Slider
                  value={[currentTime]}
                  onValueChange={([value]) => setCurrentTime(value)}
                  max={totalDuration}
                  min={0}
                  step={100}
                  className="flex-1"
                />
                <span className="text-sm w-12">{formatTime(totalDuration)}</span>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetReplay}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button
                  size="sm"
                  onClick={isPlaying ? pauseReplay : playReplay}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentTime(totalDuration)}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm">速度:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value={0.25}>0.25x</option>
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* 游戏信息 */}
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">游戏信息</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>得分: {gameInfo.score.toLocaleString()}</div>
                <div>行数: {gameInfo.lines}</div>
                <div>PPS: {gameInfo.pps.toFixed(2)}</div>
                <div>APM: {gameInfo.apm.toFixed(0)}</div>
                <div colSpan={2}>时长: {formatTime(gameInfo.duration * 1000)}</div>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">当前状态</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>得分: {gameState.score.toLocaleString()}</div>
                <div>行数: {gameState.lines}</div>
                <div>等级: {gameState.level}</div>
                <div>连击: {gameState.combo}</div>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">操作统计</h3>
              <div className="text-sm">
                总操作数: {replayData.actions.length}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReplayPlayer;
