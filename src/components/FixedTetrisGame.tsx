
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import GameBoard from './GameBoard';
import PiecePreview from './PiecePreview';
import GameInfo from './GameInfo';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  TETROMINO_TYPES,
  generateRandomTetromino,
  rotatePiece,
  isValidPosition,
  placePiece,
  clearLines,
  calculateDropPosition,
  calculateScore,
  calculateAttackLines,
  createEmptyBoard,
  BOARD_WIDTH,
  BOARD_HEIGHT
} from '@/utils/tetrisLogic';

interface GameState {
  board: number[][];
  currentPiece: {
    type: any;
    x: number;
    y: number;
  } | null;
  nextPiece: any;
  holdPiece: any;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  combo: number;
  b2b: number;
  pieces: number;
  startTime: number;
  paused: boolean;
  gameOver: boolean;
  clearingLines: number[];
}

const FixedTetrisGame: React.FC = () => {
  const { user } = useAuth();
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(),
    currentPiece: null,
    nextPiece: generateRandomTetromino(),
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
    clearingLines: []
  });

  // 生成新方块
  const spawnNewPiece = useCallback(() => {
    const newPiece = {
      type: gameState.nextPiece,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(gameState.nextPiece.shape[0].length / 2),
      y: 0
    };

    // 检查游戏是否结束
    if (!isValidPosition(gameState.board, newPiece.type.shape, newPiece.x, newPiece.y)) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      toast.error('游戏结束！');
      return;
    }

    setGameState(prev => ({
      ...prev,
      currentPiece: newPiece,
      nextPiece: generateRandomTetromino(),
      canHold: true,
      pieces: prev.pieces + 1
    }));
  }, [gameState.nextPiece, gameState.board]);

  // 移动方块
  const movePiece = useCallback((dx: number, dy: number) => {
    if (!gameState.currentPiece || gameState.paused || gameState.gameOver) return false;

    const newX = gameState.currentPiece.x + dx;
    const newY = gameState.currentPiece.y + dy;

    if (isValidPosition(gameState.board, gameState.currentPiece.type.shape, newX, newY)) {
      setGameState(prev => ({
        ...prev,
        currentPiece: prev.currentPiece ? {
          ...prev.currentPiece,
          x: newX,
          y: newY
        } : null
      }));
      return true;
    }
    return false;
  }, [gameState.currentPiece, gameState.board, gameState.paused, gameState.gameOver]);

  // 旋转方块
  const rotatePieceClockwise = useCallback(() => {
    if (!gameState.currentPiece || gameState.paused || gameState.gameOver) return;

    const rotatedShape = rotatePiece(gameState.currentPiece.type.shape);
    
    if (isValidPosition(gameState.board, rotatedShape, gameState.currentPiece.x, gameState.currentPiece.y)) {
      setGameState(prev => ({
        ...prev,
        currentPiece: prev.currentPiece ? {
          ...prev.currentPiece,
          type: {
            ...prev.currentPiece.type,
            shape: rotatedShape
          }
        } : null
      }));
    }
  }, [gameState.currentPiece, gameState.board, gameState.paused, gameState.gameOver]);

  // 瞬时降落
  const hardDrop = useCallback(() => {
    if (!gameState.currentPiece || gameState.paused || gameState.gameOver) return;

    const dropY = calculateDropPosition(gameState.board, gameState.currentPiece);
    
    setGameState(prev => ({
      ...prev,
      currentPiece: prev.currentPiece ? {
        ...prev.currentPiece,
        y: dropY
      } : null
    }));

    // 立即放置方块
    setTimeout(() => {
      placePieceOnBoard();
    }, 50);
  }, [gameState.currentPiece, gameState.board, gameState.paused, gameState.gameOver]);

  // 放置方块到棋盘
  const placePieceOnBoard = useCallback(() => {
    if (!gameState.currentPiece) return;

    const newBoard = placePiece(
      gameState.board,
      gameState.currentPiece.type.shape,
      gameState.currentPiece.x,
      gameState.currentPiece.y,
      Object.keys(TETROMINO_TYPES).indexOf(gameState.currentPiece.type.name) + 1
    );

    // 检查消行
    const { newBoard: clearedBoard, linesCleared, clearedLineIndices } = clearLines(newBoard);
    
    if (linesCleared > 0) {
      // 显示消行动画
      setGameState(prev => ({ ...prev, clearingLines: clearedLineIndices }));
      
      setTimeout(() => {
        const newScore = calculateScore(linesCleared, gameState.level, false, gameState.b2b > 0, gameState.combo);
        const newCombo = linesCleared > 0 ? gameState.combo + 1 : 0;
        const newLevel = Math.floor((gameState.lines + linesCleared) / 10) + 1;
        
        setGameState(prev => ({
          ...prev,
          board: clearedBoard,
          currentPiece: null,
          score: prev.score + newScore,
          lines: prev.lines + linesCleared,
          level: newLevel,
          combo: newCombo,
          b2b: linesCleared === 4 ? prev.b2b + 1 : 0,
          clearingLines: []
        }));

        toast.success(`消除了 ${linesCleared} 行! +${newScore} 分`);
      }, 300);
    } else {
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        currentPiece: null,
        combo: 0
      }));
    }
  }, [gameState.currentPiece, gameState.board, gameState.level, gameState.combo, gameState.b2b, gameState.lines]);

  // 暂存方块
  const holdPiece = useCallback(() => {
    if (!gameState.currentPiece || !gameState.canHold || gameState.paused || gameState.gameOver) return;

    if (gameState.holdPiece) {
      // 交换当前方块和暂存方块
      const temp = gameState.holdPiece;
      setGameState(prev => ({
        ...prev,
        holdPiece: prev.currentPiece?.type || null,
        currentPiece: {
          type: temp,
          x: Math.floor(BOARD_WIDTH / 2) - Math.floor(temp.shape[0].length / 2),
          y: 0
        },
        canHold: false
      }));
    } else {
      // 将当前方块放入暂存
      setGameState(prev => ({
        ...prev,
        holdPiece: prev.currentPiece?.type || null,
        currentPiece: {
          type: prev.nextPiece,
          x: Math.floor(BOARD_WIDTH / 2) - Math.floor(prev.nextPiece.shape[0].length / 2),
          y: 0
        },
        nextPiece: generateRandomTetromino(),
        canHold: false
      }));
    }
  }, [gameState.currentPiece, gameState.holdPiece, gameState.canHold, gameState.paused, gameState.gameOver, gameState.nextPiece]);

  // 键盘控制
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState.paused || gameState.gameOver) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        movePiece(-1, 0);
        break;
      case 'ArrowRight':
        event.preventDefault();
        movePiece(1, 0);
        break;
      case 'ArrowDown':
        event.preventDefault();
        movePiece(0, 1);
        break;
      case 'ArrowUp':
      case ' ':
        event.preventDefault();
        hardDrop();
        break;
      case 'z':
      case 'Z':
        event.preventDefault();
        rotatePieceClockwise();
        break;
      case 'c':
      case 'C':
        event.preventDefault();
        holdPiece();
        break;
      case 'p':
      case 'P':
        event.preventDefault();
        setGameState(prev => ({ ...prev, paused: !prev.paused }));
        break;
    }
  }, [movePiece, hardDrop, rotatePieceClockwise, holdPiece, gameState.paused, gameState.gameOver]);

  // 游戏循环
  useEffect(() => {
    if (gameState.paused || gameState.gameOver) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const dropInterval = Math.max(50, 1000 - (gameState.level - 1) * 50);
    
    gameLoopRef.current = setInterval(() => {
      if (!gameState.currentPiece) {
        spawnNewPiece();
        return;
      }

      if (!movePiece(0, 1)) {
        placePieceOnBoard();
      }
    }, dropInterval);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState.level, gameState.paused, gameState.gameOver, gameState.currentPiece, movePiece, spawnNewPiece, placePieceOnBoard]);

  // 键盘事件监听
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // 初始化游戏
  useEffect(() => {
    if (!gameState.currentPiece && !gameState.gameOver) {
      spawnNewPiece();
    }
  }, []);

  const restartGame = () => {
    setGameState({
      board: createEmptyBoard(),
      currentPiece: null,
      nextPiece: generateRandomTetromino(),
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
      clearingLines: []
    });
  };

  const currentTime = Date.now();
  const elapsedTime = Math.floor((currentTime - gameState.startTime) / 1000);
  const pps = gameState.pieces > 0 ? (gameState.pieces / Math.max(elapsedTime, 1)).toFixed(2) : '0.00';

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen">
      <div className="flex gap-6 max-w-6xl w-full">
        {/* 左侧信息栏 */}
        <div className="flex flex-col gap-4 w-48">
          <PiecePreview 
            piece={gameState.holdPiece} 
            title="暂存 (C键)" 
            size="medium" 
          />
          
          <div className="bg-gray-800 p-4 rounded-lg text-white text-sm">
            <div className="space-y-2">
              <div>得分: {gameState.score.toLocaleString()}</div>
              <div>行数: {gameState.lines}</div>
              <div>等级: {gameState.level}</div>
              <div>连击: {gameState.combo > 0 ? `${gameState.combo}x` : '无'}</div>
              <div>方块数: {gameState.pieces}</div>
              <div>PPS: {pps}</div>
              <div>时间: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg text-white text-xs">
            <div className="font-bold mb-2">操作说明:</div>
            <div>← → 移动</div>
            <div>↓ 软降</div>
            <div>↑/空格 硬降</div>
            <div>Z 旋转</div>
            <div>C 暂存</div>
            <div>P 暂停</div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="flex flex-col items-center">
          {gameState.gameOver && (
            <div className="mb-4 p-4 bg-red-600 text-white rounded-lg text-center">
              <div className="text-xl font-bold mb-2">游戏结束</div>
              <div className="mb-2">最终得分: {gameState.score.toLocaleString()}</div>
              <Button onClick={restartGame} className="bg-blue-600 hover:bg-blue-700">
                重新开始
              </Button>
            </div>
          )}
          
          {gameState.paused && (
            <div className="mb-4 p-4 bg-yellow-600 text-white rounded-lg text-center">
              <div className="text-xl font-bold">游戏暂停</div>
              <div className="text-sm">按 P 键继续</div>
            </div>
          )}

          <GameBoard
            board={gameState.board}
            currentPiece={gameState.currentPiece}
            enableGhost={true}
            cellSize={30}
            clearingLines={gameState.clearingLines}
          />
        </div>

        {/* 右侧信息栏 */}
        <div className="flex flex-col gap-4 w-48">
          <PiecePreview 
            piece={gameState.nextPiece} 
            title="下一个" 
            size="medium" 
          />
          
          {gameState.gameOver && (
            <div className="bg-gray-800 p-4 rounded-lg text-white text-sm">
              <div className="font-bold mb-2">游戏统计:</div>
              <div>持续时间: {Math.floor(elapsedTime / 60)}分{elapsedTime % 60}秒</div>
              <div>平均PPS: {pps}</div>
              <div>消行效率: {gameState.pieces > 0 ? (gameState.lines / gameState.pieces * 100).toFixed(1) : 0}%</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FixedTetrisGame;
