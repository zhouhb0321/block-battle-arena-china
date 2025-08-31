import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import GameBoard from './GameBoard';
import { createEmptyBoard, TETROMINO_TYPES } from '@/utils/tetrisLogic';
import { clearLines, placePiece } from '@/utils/tetrisCore';
import type { GameReplay, ReplayAction, GamePiece, TetrominoType } from '@/utils/gameTypes';
import { SeededRandom } from '@/utils/replayCompression';

interface ReplayPlayerProps {
  replay: GameReplay | null;
  isOpen: boolean;
  onClose: () => void;
}

const ReplayPlayer: React.FC<ReplayPlayerProps> = ({ replay, isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [board, setBoard] = useState(createEmptyBoard());
  const [gameStats, setGameStats] = useState({
    score: 0,
    lines: 0,
    level: 1,
    pieces: 0
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionsRef = useRef<ReplayAction[]>([]);
  const maxTimeRef = useRef(0);

  // 简易重放模拟器（仅根据 place 动作重建棋盘，最小化服务器压力）
  const seedRef = useRef<SeededRandom | null>(null);
  const pieceSeqRef = useRef<string[]>([]);
  const pieceIndexRef = useRef(0);
  const currentPieceRef = useRef<GamePiece | null>(null);
  const initialBoardRef = useRef<number[][]>(createEmptyBoard());
  const boardRef = useRef<number[][]>(createEmptyBoard());

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // 根据字母创建方块
  const makeGamePiece = (letter: string): GamePiece => {
    const t: TetrominoType = TETROMINO_TYPES[letter] as unknown as TetrominoType;
    return {
      type: t,
      x: 4,
      y: 0,
      rotation: 0
    };
  };

  const ensureQueue = (minLength: number) => {
    if (pieceSeqRef.current.length >= minLength) return;
    const needed = minLength - pieceSeqRef.current.length;
    const seed = seedRef.current;
    if (seed) {
      const extra = seed.generatePieceSequence(needed);
      pieceSeqRef.current.push(...extra);
    } else {
      const order = ['I','O','T','S','Z','J','L'];
      while (pieceSeqRef.current.length < minLength) {
        pieceSeqRef.current.push(...order);
      }
    }
  };

  const getNextPiece = (): GamePiece => {
    ensureQueue(pieceIndexRef.current + 1);
    const letter = pieceSeqRef.current[pieceIndexRef.current] || 'T';
    pieceIndexRef.current += 1;
    return makeGamePiece(letter);
  };

  // 初始化回放数据
  useEffect(() => {
    if (!replay) return;
    actionsRef.current = replay.actions || [];
    maxTimeRef.current = Math.max(...actionsRef.current.map(a => a.timestamp), 0);

    // 初始化种子与初始棋盘
    seedRef.current = replay.metadata?.seed ? new SeededRandom(replay.metadata.seed) : null;
    pieceSeqRef.current = [];
    pieceIndexRef.current = 0;

    const initBoard = replay.metadata?.initialBoard && Array.isArray(replay.metadata.initialBoard)
      ? replay.metadata.initialBoard
      : createEmptyBoard();

    initialBoardRef.current = initBoard.map(row => [...row]);
    boardRef.current = initBoard.map(row => [...row]);
    setBoard(initBoard.map(row => [...row]));

    currentPieceRef.current = getNextPiece();
    setGameStats({ score: 0, lines: 0, level: 1, pieces: 0 });
    setCurrentTime(0);
    setIsPlaying(false);
  }, [replay]);

  const resetReplay = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    // 重置到初始棋盘与方块队列
    const init = initialBoardRef.current.map(r => [...r]);
    boardRef.current = init.map(r => [...r]);
    setBoard(init);
    pieceIndexRef.current = 0;
    pieceSeqRef.current = [];
    currentPieceRef.current = getNextPiece();
    setGameStats({
      score: 0,
      lines: 0,
      level: 1,
      pieces: 0
    });
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const playReplay = () => {
    if (!replay) return;

    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + (50 * playbackSpeed);
        
        if (newTime >= maxTimeRef.current) {
          setIsPlaying(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return maxTimeRef.current;
        }

        // 执行到当前时间的所有动作
        const actionsToExecute = actionsRef.current.filter(
          action => action.timestamp <= newTime && action.timestamp > prev
        );

        if (actionsToExecute.length > 0) {
          let piecesDelta = 0;
          let linesDelta = 0;
          let boardLocal = boardRef.current;
          for (const a of actionsToExecute) {
            if (a.action === 'place') {
              const piece = currentPieceRef.current || getNextPiece();
              const x = a.data?.x ?? piece.x;
              const y = a.data?.y ?? piece.y;
              const placed = { ...piece, x, y };
              const after = placePiece(boardLocal, placed);
              const cleared = clearLines(after);
              boardLocal = cleared.newBoard;
              linesDelta += cleared.linesCleared;
              piecesDelta += 1;
              currentPieceRef.current = getNextPiece();
            }
          }
          boardRef.current = boardLocal;
          if (piecesDelta || linesDelta) {
            setBoard(boardLocal.map(r => [...r]));
            setGameStats(prevStats => ({
              ...prevStats,
              pieces: prevStats.pieces + piecesDelta,
              lines: prevStats.lines + linesDelta
            }));
          }
        }

        return newTime;
      });
    }, 50);
  };

  const pauseReplay = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
    // 重新计算到这个时间点的游戏状态
    const actionsUpToTime = actionsRef.current.filter(action => action.timestamp <= time);
    setGameStats({
      score: 0,
      lines: 0,
      level: 1,
      pieces: actionsUpToTime.filter(a => a.action === 'place').length
    });
  };

  if (!replay) return null;

  // 检查回放是否有足够的数据进行播放
  const placeCount = replay.actions.filter(action => action.action === 'place').length;
  const hasPlayableData = placeCount > 0 && replay.actions.length > 0;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = maxTimeRef.current > 0 ? (currentTime / maxTimeRef.current) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>回放播放器 - {replay.playerName}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6">
          {/* 游戏板区域 */}
          <div className="flex-1">
            <GameBoard
              board={board}
              currentPiece={null}
              enableGhost={false}
              cellSize={25}
            />
          </div>

          {/* 控制面板 */}
          <div className="w-80 space-y-4">
            {/* 游戏信息 */}
            <div className="bg-gray-800 p-4 rounded-lg text-white">
              <h3 className="font-bold mb-2">游戏信息</h3>
              <div className="space-y-1 text-sm">
                <div>玩家: {replay.playerName}</div>
                <div>模式: {replay.gameMode}</div>
                <div>最终得分: {replay.score.toLocaleString()}</div>
                <div>消除行数: {replay.lines}</div>
                <div>等级: {replay.level}</div>
                <div>时长: {formatTime(replay.duration)}</div>
                <div>日期: {new Date(replay.date).toLocaleDateString()}</div>
                {replay.isPersonalBest && (
                  <div className="text-yellow-400">🏆 个人最佳</div>
                )}
              </div>
            </div>

            {/* 当前状态 */}
            <div className="bg-gray-800 p-4 rounded-lg text-white">
              <h3 className="font-bold mb-2">当前状态</h3>
              <div className="space-y-1 text-sm">
                <div>时间: {formatTime(currentTime)}</div>
                <div>方块数: {gameStats.pieces}</div>
                <div>得分: {gameStats.score.toLocaleString()}</div>
                <div>行数: {gameStats.lines}</div>
              </div>
            </div>

            {/* 播放控制 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  size="sm"
                  onClick={isPlaying ? pauseReplay : playReplay}
                  disabled={!hasPlayableData || currentTime >= maxTimeRef.current}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? '暂停' : '播放'}
                </Button>
                
                <Button 
                  size="sm" 
                  onClick={resetReplay}
                  disabled={!hasPlayableData}
                >
                  <RotateCcw className="w-4 h-4" />
                  重置
                </Button>
              </div>

              {/* 进度条 */}
              <div className="space-y-2">
                <div className="bg-gray-600 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={maxTimeRef.current}
                  value={Math.min(currentTime, maxTimeRef.current)}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="w-full"
                  disabled={!hasPlayableData}
                />
              </div>

              {/* 播放速度 */}
              <div className="mt-4">
                <label className="block text-white text-sm mb-2">播放速度</label>
                <div className="flex gap-1">
                  {[0.5, 1, 1.5, 2, 4].map(speed => (
                    <Button
                      key={speed}
                      size="sm"
                      variant={playbackSpeed === speed ? "default" : "outline"}
                      onClick={() => setPlaybackSpeed(speed)}
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* 动作统计 */}
            <div className="bg-gray-800 p-4 rounded-lg text-white">
              <h3 className="font-bold mb-2">动作统计</h3>
              <div className="space-y-1 text-sm">
                <div>总动作数: {actionsRef.current.length}</div>
                <div>移动: {actionsRef.current.filter(a => a.action === 'move').length}</div>
                <div>旋转: {actionsRef.current.filter(a => a.action === 'rotate').length}</div>
                <div>硬降: {actionsRef.current.filter(a => a.action === 'drop').length}</div>
                <div>暂存: {actionsRef.current.filter(a => a.action === 'hold').length}</div>
                <div>放置: {actionsRef.current.filter(a => a.action === 'place').length}</div>
                {actionsRef.current.filter(a => a.action === 'place').length === 0 && (
                  <div className="text-yellow-400 mt-2">⚠️ 无放置动作记录，回放可能无法正常显示</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReplayPlayer;
