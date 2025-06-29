
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// 简化的方块类型定义
interface PieceType {
  shape: number[][];
  color: string;
  name: string;
}

interface GamePiece {
  type: PieceType;
  x: number;
  y: number;
  rotation: number;
}

interface GameState {
  board: number[][];
  currentPiece: GamePiece | null;
  nextPiece: PieceType | null;
  score: number;
  lines: number;
  level: number;
  gameOver: boolean;
  paused: boolean;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

// 标准俄罗斯方块类型
const PIECE_TYPES: PieceType[] = [
  {
    shape: [[1, 1, 1, 1]],
    color: '#00f0f0',
    name: 'I'
  },
  {
    shape: [[1, 1], [1, 1]],
    color: '#f0f000',
    name: 'O'
  },
  {
    shape: [[0, 1, 0], [1, 1, 1]],
    color: '#a000f0',
    name: 'T'
  },
  {
    shape: [[0, 1, 1], [1, 1, 0]],
    color: '#00f000',
    name: 'S'
  },
  {
    shape: [[1, 1, 0], [0, 1, 1]],
    color: '#f00000',
    name: 'Z'
  },
  {
    shape: [[1, 0, 0], [1, 1, 1]],
    color: '#0000f0',
    name: 'J'
  },
  {
    shape: [[0, 0, 1], [1, 1, 1]],
    color: '#f0a000',
    name: 'L'
  }
];

interface SimpleTetrisGameProps {
  onBackToMenu: () => void;
}

const SimpleTetrisGame: React.FC<SimpleTetrisGameProps> = ({ onBackToMenu }) => {
  const [gameState, setGameState] = useState<GameState>({
    board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
    currentPiece: null,
    nextPiece: null,
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
    paused: false
  });

  const gameLoopRef = useRef<number>();
  const lastDropTime = useRef<number>(0);

  // 创建空棋盘
  const createEmptyBoard = () => {
    return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
  };

  // 随机生成方块
  const getRandomPiece = (): PieceType => {
    return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  };

  // 创建新的游戏方块
  const createNewPiece = (pieceType: PieceType): GamePiece => {
    return {
      type: pieceType,
      x: Math.floor((BOARD_WIDTH - pieceType.shape[0].length) / 2),
      y: 0,
      rotation: 0
    };
  };

  // 检查位置是否有效
  const isValidPosition = (board: number[][], piece: GamePiece, offsetX: number = 0, offsetY: number = 0): boolean => {
    const newX = piece.x + offsetX;
    const newY = piece.y + offsetY;

    for (let y = 0; y < piece.type.shape.length; y++) {
      for (let x = 0; x < piece.type.shape[y].length; x++) {
        if (piece.type.shape[y][x] !== 0) {
          const boardX = newX + x;
          const boardY = newY + y;

          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return false;
          }
          if (boardY >= 0 && board[boardY][boardX] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // 旋转方块
  const rotatePiece = (piece: GamePiece): GamePiece => {
    const rotated = piece.type.shape[0].map((_, i) =>
      piece.type.shape.map(row => row[i]).reverse()
    );
    
    return {
      ...piece,
      type: { ...piece.type, shape: rotated }
    };
  };

  // 将方块放置到棋盘
  const placePiece = (board: number[][], piece: GamePiece): number[][] => {
    const newBoard = board.map(row => [...row]);
    const pieceIndex = PIECE_TYPES.findIndex(p => p.name === piece.type.name) + 1;

    for (let y = 0; y < piece.type.shape.length; y++) {
      for (let x = 0; x < piece.type.shape[y].length; x++) {
        if (piece.type.shape[y][x] !== 0) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = pieceIndex;
          }
        }
      }
    }
    return newBoard;
  };

  // 清除满行
  const clearLines = (board: number[][]): { newBoard: number[][], linesCleared: number } => {
    const fullRows: number[] = [];
    
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (board[y].every(cell => cell !== 0)) {
        fullRows.push(y);
      }
    }

    if (fullRows.length === 0) {
      return { newBoard: board, linesCleared: 0 };
    }

    let newBoard = board.filter((_, index) => !fullRows.includes(index));
    
    // 在顶部添加新的空行
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }

    return { newBoard, linesCleared: fullRows.length };
  };

  // 计算硬降位置
  const getHardDropPosition = (board: number[][], piece: GamePiece): number => {
    let dropY = piece.y;
    while (isValidPosition(board, piece, 0, dropY - piece.y + 1)) {
      dropY++;
    }
    return dropY;
  };

  // 硬降 - 立即降到底部并锁定
  const hardDrop = useCallback(() => {
    if (!gameState.currentPiece || gameState.paused || gameState.gameOver) return;

    setGameState(prev => {
      const dropY = getHardDropPosition(prev.board, prev.currentPiece!);
      const droppedPiece = { ...prev.currentPiece!, y: dropY };
      
      // 立即放置方块
      const newBoard = placePiece(prev.board, droppedPiece);
      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
      
      // 计算得分 - 硬降距离 + 消行得分
      const dropDistance = dropY - prev.currentPiece!.y;
      const lineScore = linesCleared * 100 * prev.level;
      const hardDropScore = dropDistance * 2;
      const totalScore = prev.score + lineScore + hardDropScore;
      
      const newLines = prev.lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;

      // 显示消行提示
      if (linesCleared > 0) {
        toast.success(`消除了 ${linesCleared} 行! +${lineScore} 分`);
      }

      return {
        ...prev,
        board: clearedBoard,
        currentPiece: null,
        score: totalScore,
        lines: newLines,
        level: newLevel
      };
    });
  }, [gameState.currentPiece, gameState.paused, gameState.gameOver]);

  // 移动方块
  const movePiece = useCallback((dx: number, dy: number) => {
    if (!gameState.currentPiece || gameState.paused || gameState.gameOver) return false;

    if (isValidPosition(gameState.board, gameState.currentPiece, dx, dy)) {
      setGameState(prev => ({
        ...prev,
        currentPiece: {
          ...prev.currentPiece!,
          x: prev.currentPiece!.x + dx,
          y: prev.currentPiece!.y + dy
        }
      }));
      return true;
    }
    return false;
  }, [gameState.currentPiece, gameState.board, gameState.paused, gameState.gameOver]);

  // 旋转方块
  const rotate = useCallback(() => {
    if (!gameState.currentPiece || gameState.paused || gameState.gameOver) return;

    const rotatedPiece = rotatePiece(gameState.currentPiece);
    if (isValidPosition(gameState.board, rotatedPiece)) {
      setGameState(prev => ({
        ...prev,
        currentPiece: rotatedPiece
      }));
    }
  }, [gameState.currentPiece, gameState.board, gameState.paused, gameState.gameOver]);

  // 锁定方块
  const lockPiece = useCallback(() => {
    if (!gameState.currentPiece) return;

    const newBoard = placePiece(gameState.board, gameState.currentPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    const lineScore = linesCleared * 100 * gameState.level;
    const newLines = gameState.lines + linesCleared;
    const newLevel = Math.floor(newLines / 10) + 1;

    if (linesCleared > 0) {
      toast.success(`消除了 ${linesCleared} 行! +${lineScore} 分`);
    }

    setGameState(prev => ({
      ...prev,
      board: clearedBoard,
      currentPiece: null,
      score: prev.score + lineScore,
      lines: newLines,
      level: newLevel
    }));
  }, [gameState.currentPiece, gameState.board, gameState.level, gameState.lines]);

  // 生成新方块
  const spawnNewPiece = useCallback(() => {
    const nextPiece = gameState.nextPiece || getRandomPiece();
    const newPiece = createNewPiece(nextPiece);
    
    if (!isValidPosition(gameState.board, newPiece)) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      toast.error('游戏结束!');
      return;
    }

    setGameState(prev => ({
      ...prev,
      currentPiece: newPiece,
      nextPiece: getRandomPiece()
    }));
  }, [gameState.nextPiece, gameState.board]);

  // 键盘控制
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState.gameOver) return;

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
        rotate();
        break;
      case 'p':
      case 'P':
        event.preventDefault();
        setGameState(prev => ({ ...prev, paused: !prev.paused }));
        break;
    }
  }, [movePiece, hardDrop, rotate, gameState.gameOver]);

  // 游戏循环
  useEffect(() => {
    if (gameState.gameOver || gameState.paused) return;

    const gameLoop = (timestamp: number) => {
      const dropSpeed = Math.max(100, 1000 - (gameState.level - 1) * 50);
      
      if (timestamp - lastDropTime.current > dropSpeed) {
        if (gameState.currentPiece) {
          if (!movePiece(0, 1)) {
            lockPiece();
          }
        }
        lastDropTime.current = timestamp;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.gameOver, gameState.paused, gameState.level, gameState.currentPiece, movePiece, lockPiece]);

  // 生成新方块
  useEffect(() => {
    if (!gameState.currentPiece && !gameState.gameOver) {
      const timer = setTimeout(spawnNewPiece, 100);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPiece, gameState.gameOver, spawnNewPiece]);

  // 键盘事件监听
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // 初始化游戏
  useEffect(() => {
    if (!gameState.nextPiece) {
      setGameState(prev => ({ ...prev, nextPiece: getRandomPiece() }));
    }
  }, [gameState.nextPiece]);

  // 重新开始游戏
  const restartGame = () => {
    setGameState({
      board: createEmptyBoard(),
      currentPiece: null,
      nextPiece: getRandomPiece(),
      score: 0,
      lines: 0,
      level: 1,
      gameOver: false,
      paused: false
    });
  };

  // 渲染游戏板
  const renderBoard = () => {
    const displayBoard = gameState.board.map(row => [...row]);
    
    // 绘制当前方块
    if (gameState.currentPiece) {
      const { currentPiece } = gameState;
      for (let y = 0; y < currentPiece.type.shape.length; y++) {
        for (let x = 0; x < currentPiece.type.shape[y].length; x++) {
          if (currentPiece.type.shape[y][x] !== 0) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = PIECE_TYPES.findIndex(p => p.name === currentPiece.type.name) + 1;
            }
          }
        }
      }
    }

    return displayBoard;
  };

  // 获取颜色
  const getCellColor = (cellValue: number): string => {
    if (cellValue === 0) return '#1a1a1a';
    return PIECE_TYPES[cellValue - 1]?.color || '#ffffff';
  };

  const displayBoard = renderBoard();

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen text-white">
      <div className="flex gap-6 max-w-4xl w-full justify-center">
        {/* 左侧信息 */}
        <div className="flex flex-col gap-4 w-48">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-sm mb-3 font-bold">下一个</h3>
            {gameState.nextPiece && (
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(4, 1fr)` }}>
                {Array(4).fill(null).map((_, y) => 
                  Array(4).fill(null).map((_, x) => {
                    const shape = gameState.nextPiece!.shape;
                    const hasBlock = shape[y] && shape[y][x];
                    return (
                      <div
                        key={`${y}-${x}`}
                        className="w-4 h-4 border border-gray-600"
                        style={{
                          backgroundColor: hasBlock ? gameState.nextPiece!.color : '#1a1a1a'
                        }}
                      />
                    );
                  })
                )}
              </div>
            )}
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg text-sm">
            <div className="space-y-2">
              <div>得分: {gameState.score.toLocaleString()}</div>
              <div>行数: {gameState.lines}</div>
              <div>等级: {gameState.level}</div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg text-xs">
            <div className="font-bold mb-2">操作说明:</div>
            <div>← → 移动</div>
            <div>↓ 软降</div>
            <div>↑/空格 硬降</div>
            <div>Z 旋转</div>
            <div>P 暂停</div>
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="flex flex-col items-center">
          {gameState.gameOver && (
            <div className="mb-4 p-4 bg-red-600 text-white rounded-lg text-center">
              <div className="text-xl font-bold mb-2">游戏结束</div>
              <div className="mb-2">最终得分: {gameState.score.toLocaleString()}</div>
            </div>
          )}
          
          {gameState.paused && (
            <div className="mb-4 p-4 bg-yellow-600 text-white rounded-lg text-center">
              <div className="text-xl font-bold">游戏暂停</div>
              <div className="text-sm">按 P 键继续</div>
            </div>
          )}

          <div className="flex gap-3 mb-4">
            <Button
              onClick={() => setGameState(prev => ({ ...prev, paused: !prev.paused }))}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={gameState.gameOver}
            >
              {gameState.paused ? '继续' : '暂停'}
            </Button>
            <Button onClick={restartGame} className="bg-green-600 hover:bg-green-700">
              重新开始
            </Button>
            <Button onClick={onBackToMenu} className="bg-red-600 hover:bg-red-700">
              返回菜单
            </Button>
          </div>

          {/* 游戏板 */}
          <div 
            className="grid gap-0 border-2 border-gray-600 bg-gray-900 rounded-lg p-2"
            style={{ 
              gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
              gridTemplateRows: `repeat(${BOARD_HEIGHT}, 1fr)`
            }}
          >
            {displayBoard.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  className="w-6 h-6 border border-gray-700"
                  style={{
                    backgroundColor: getCellColor(cell)
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleTetrisGame;
