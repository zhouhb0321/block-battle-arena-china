import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GameBoard from './GameBoard';
import PiecePreview from './PiecePreview';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  TETROMINO_TYPES,
  generateSevenBag,
  rotatePiece,
  isValidPosition,
  placePiece,
  clearLines,
  calculateDropPosition,
  calculateScore,
  calculateAttackLines,
  createEmptyBoard,
  createNewPiece,
  createGhostPiece,
  checkTSpin,
  getKickTests,
  BOARD_WIDTH,
  BOARD_HEIGHT
} from '@/utils/tetrisLogic';
import type { TetrominoType, GamePiece, GameState } from '@/utils/gameTypes';

interface FixedTetrisGameProps {
  onBackToMenu?: () => void;
}

const FixedTetrisGame: React.FC<FixedTetrisGameProps> = ({ onBackToMenu }) => {
  const { user } = useAuth();
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [sevenBag, setSevenBag] = useState<TetrominoType[]>(() => generateSevenBag());
  const [nextBag, setNextBag] = useState<TetrominoType[]>(() => generateSevenBag());
  const [bagIndex, setBagIndex] = useState(0);
  
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(),
    currentPiece: null,
    nextPieces: [],
    holdPiece: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    combo: -1,
    b2b: 0,
    pieces: 0,
    startTime: Date.now(),
    paused: false,
    gameOver: false,
    clearingLines: [],
    ghostPiece: null,
    attack: 0,
    pps: 0,
    apm: 0
  });

  // 获取下一个方块（7-bag系统）
  const getNextPiece = useCallback((): TetrominoType => {
    const currentBag = sevenBag;
    const currentIndex = bagIndex;
    
    if (currentIndex >= currentBag.length) {
      // 当前包用完，切换到下一个包
      setSevenBag(nextBag);
      setNextBag(generateSevenBag());
      setBagIndex(1);
      return nextBag[0];
    } else {
      setBagIndex(currentIndex + 1);
      return currentBag[currentIndex];
    }
  }, [sevenBag, nextBag, bagIndex]);

  // 获取接下来的方块预览
  const getUpcomingPieces = useCallback((): GamePiece[] => {
    const upcoming: GamePiece[] = [];
    let currentBag = sevenBag;
    let currentNextBag = nextBag;
    let currentIndex = bagIndex;
    
    for (let i = 0; i < 6; i++) {
      if (currentIndex >= currentBag.length) {
        currentBag = currentNextBag;
        currentNextBag = generateSevenBag();
        currentIndex = 0;
      }
      upcoming.push(createNewPiece(currentBag[currentIndex]));
      currentIndex++;
    }
    
    return upcoming;
  }, [sevenBag, nextBag, bagIndex]);

  // 生成新方块
  const spawnNewPiece = useCallback(() => {
    const nextPieceType = getNextPiece();
    const newPiece = createNewPiece(nextPieceType);

    // 检查游戏是否结束
    if (!isValidPosition(gameState.board, newPiece)) {
      toast.error('游戏结束！');
      setGameState(prev => ({ ...prev, gameOver: true }));
      return;
    }

    // 生成幽灵方块
    const ghostPiece = createGhostPiece(gameState.board, newPiece);

    setGameState(prev => ({
      ...prev,
      currentPiece: newPiece,
      nextPieces: getUpcomingPieces(),
      canHold: true,
      pieces: prev.pieces + 1,
      ghostPiece: ghostPiece
    }));
  }, [getNextPiece, getUpcomingPieces, gameState.board]);

  // 移动方块
  const movePiece = useCallback((dx: number, dy: number) => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.paused || prev.gameOver) return prev;

      const newPiece = {
        ...prev.currentPiece,
        x: prev.currentPiece.x + dx,
        y: prev.currentPiece.y + dy
      };

      if (isValidPosition(prev.board, newPiece)) {
        const newGhostPiece = createGhostPiece(prev.board, newPiece);
        
        return {
          ...prev,
          currentPiece: newPiece,
          ghostPiece: newGhostPiece
        };
      }
      return prev;
    });
  }, []);

  // 旋转方块
  const rotatePieceClockwise = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.paused || prev.gameOver) return prev;

      const rotatedType = rotatePiece(prev.currentPiece.type);
      const newRotation = (prev.currentPiece.rotation + 1) % 4;
      
      const kickTests = getKickTests(
        prev.currentPiece.type.name, 
        prev.currentPiece.rotation, 
        newRotation
      );

      for (const kick of kickTests) {
        const testPiece: GamePiece = {
          type: rotatedType,
          x: prev.currentPiece.x + kick.x,
          y: prev.currentPiece.y + kick.y,
          rotation: newRotation
        };
        
        if (isValidPosition(prev.board, testPiece)) {
          const newGhostPiece = createGhostPiece(prev.board, testPiece);
          
          return {
            ...prev,
            currentPiece: testPiece,
            ghostPiece: newGhostPiece
          };
        }
      }
      return prev;
    });
  }, []);

  // 修复硬降落 - 立即锁定方块
  const hardDrop = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.paused || prev.gameOver) return prev;

      const dropY = calculateDropPosition(prev.board, prev.currentPiece);
      const dropDistance = dropY - prev.currentPiece.y;
      
      console.log('硬降落: 当前Y =', prev.currentPiece.y, '目标Y =', dropY, '距离 =', dropDistance);
      
      const droppedPiece = {
        ...prev.currentPiece,
        y: dropY
      };

      // 立即放置方块并处理消行
      const tSpinType = checkTSpin(prev.board, droppedPiece, 'move');
      const newBoard = placePiece(prev.board, droppedPiece);
      const { newBoard: clearedBoard, linesCleared, clearedLineIndices } = clearLines(newBoard);
      
      const newCombo = linesCleared > 0 ? prev.combo + 1 : -1;
      const isSpecialClear = tSpinType !== null || linesCleared === 4;
      const newB2B = isSpecialClear ? prev.b2b + 1 : (linesCleared > 0 ? 0 : prev.b2b);
      const newScore = calculateScore(linesCleared, prev.level, !!tSpinType, newB2B > 0, newCombo);
      const attackLines = calculateAttackLines(linesCleared, !!tSpinType, newB2B > 0, newCombo);
      const newLevel = Math.floor((prev.lines + linesCleared) / 10) + 1;
      
      const timeElapsed = (Date.now() - prev.startTime) / 1000;
      const newPps = prev.pieces > 0 ? prev.pieces / Math.max(timeElapsed, 1) : 0;
      const newApm = attackLines > 0 ? (prev.attack + attackLines) / Math.max(timeElapsed / 60, 1/60) : prev.apm;

      // 显示消行提示
      if (linesCleared > 0) {
        setTimeout(() => {
          if (tSpinType) {
            toast.success(`${tSpinType}! +${newScore} 分${newB2B > 1 ? ` B2B x${newB2B}` : ''}`, { duration: 2000 });
          } else if (linesCleared === 4) {
            toast.success(`Tetris! +${newScore} 分${newB2B > 1 ? ` B2B x${newB2B}` : ''}`, { duration: 2000 });
          } else {
            toast.success(`消除了 ${linesCleared} 行! +${newScore} 分`, { duration: 1500 });
          }
          
          if (newCombo >= 0) {
            toast.success(`${newCombo + 1} 连击! +${attackLines} 攻击`, { duration: 1500 });
          }
        }, 100);
      }

      return {
        ...prev,
        board: clearedBoard,
        currentPiece: null,
        score: prev.score + newScore + dropDistance * 2,
        lines: prev.lines + linesCleared,
        level: newLevel,
        combo: newCombo,
        b2b: newB2B,
        attack: prev.attack + attackLines,
        pps: newPps,
        apm: newApm,
        clearingLines: [],
        ghostPiece: null
      };
    });
  }, []);

  // 放置方块到棋盘
  const placePieceOnBoard = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece) return prev;

      const tSpinType = checkTSpin(prev.board, prev.currentPiece, 'move');
      const newBoard = placePiece(prev.board, prev.currentPiece);
      const { newBoard: clearedBoard, linesCleared, clearedLineIndices } = clearLines(newBoard);
      
      if (linesCleared > 0) {
        setTimeout(() => {
          const newCombo = linesCleared > 0 ? prev.combo + 1 : -1;
          const isSpecialClear = tSpinType !== null || linesCleared === 4;
          const newB2B = isSpecialClear ? prev.b2b + 1 : (linesCleared > 0 ? 0 : prev.b2b);
          const newScore = calculateScore(linesCleared, prev.level, !!tSpinType, newB2B > 0, newCombo);
          const attackLines = calculateAttackLines(linesCleared, !!tSpinType, newB2B > 0, newCombo);
          const newLevel = Math.floor((prev.lines + linesCleared) / 10) + 1;
          
          const timeElapsed = (Date.now() - prev.startTime) / 1000;
          const newPps = prev.pieces > 0 ? prev.pieces / Math.max(timeElapsed, 1) : 0;
          const newApm = attackLines > 0 ? (prev.attack + attackLines) / Math.max(timeElapsed / 60, 1/60) : prev.apm;
          
          setGameState(current => ({
            ...current,
            board: clearedBoard,
            currentPiece: null,
            score: current.score + newScore,
            lines: current.lines + linesCleared,
            level: newLevel,
            combo: newCombo,
            b2b: newB2B,
            attack: current.attack + attackLines,
            pps: newPps,
            apm: newApm,
            clearingLines: [],
            ghostPiece: null
          }));

          if (tSpinType) {
            toast.success(`${tSpinType}! +${newScore} 分${newB2B > 1 ? ` B2B x${newB2B}` : ''}`, { duration: 2000 });
          } else if (linesCleared === 4) {
            toast.success(`Tetris! +${newScore} 分${newB2B > 1 ? ` B2B x${newB2B}` : ''}`, { duration: 2000 });
          } else {
            toast.success(`消除了 ${linesCleared} 行! +${newScore} 分`, { duration: 1500 });
          }
          
          if (newCombo >= 0) {
            toast.success(`${newCombo + 1} 连击! +${attackLines} 攻击`, { duration: 1500 });
          }
        }, 300);

        return {
          ...prev,
          clearingLines: clearedLineIndices
        };
      } else {
        return {
          ...prev,
          board: newBoard,
          currentPiece: null,
          combo: -1,
          ghostPiece: null
        };
      }
    });
  }, []);

  // 暂存方块
  const holdPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || !prev.canHold || prev.paused || prev.gameOver) return prev;

      if (prev.holdPiece) {
        const newPiece = createNewPiece(prev.holdPiece.type);
        const newGhostPiece = createGhostPiece(prev.board, newPiece);
        
        return {
          ...prev,
          holdPiece: prev.currentPiece,
          currentPiece: newPiece,
          canHold: false,
          ghostPiece: newGhostPiece
        };
      } else {
        const nextPieceType = getNextPiece();
        const newPiece = createNewPiece(nextPieceType);
        const newGhostPiece = createGhostPiece(prev.board, newPiece);

        return {
          ...prev,
          holdPiece: prev.currentPiece,
          currentPiece: newPiece,
          nextPieces: getUpcomingPieces(),
          canHold: false,
          ghostPiece: newGhostPiece
        };
      }
    });
  }, [getNextPiece, getUpcomingPieces, gameState.board]);

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
      case 'b':
      case 'B':
        event.preventDefault();
        if (onBackToMenu) {
          onBackToMenu();
        }
        break;
    }
  }, [movePiece, hardDrop, rotatePieceClockwise, holdPiece, gameState.paused, gameState.gameOver, onBackToMenu]);

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
      setGameState(prev => {
        if (!prev.currentPiece) {
          return prev;
        }

        const newPiece = { ...prev.currentPiece, y: prev.currentPiece.y + 1 };
        
        if (isValidPosition(prev.board, newPiece)) {
          const newGhostPiece = createGhostPiece(prev.board, newPiece);
          return {
            ...prev,
            currentPiece: newPiece,
            ghostPiece: newGhostPiece
          };
        } else {
          setTimeout(() => placePieceOnBoard(), 10);
          return prev;
        }
      });
    }, dropInterval);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState.level, gameState.paused, gameState.gameOver, placePieceOnBoard]);

  // 检查是否需要生成新方块
  useEffect(() => {
    if (!gameState.currentPiece && !gameState.gameOver && !gameState.paused) {
      const timer = setTimeout(() => {
        spawnNewPiece();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPiece, gameState.gameOver, gameState.paused, spawnNewPiece]);

  // 初始化next pieces
  useEffect(() => {
    if (gameState.nextPieces.length === 0) {
      setGameState(prev => ({
        ...prev,
        nextPieces: getUpcomingPieces()
      }));
    }
  }, [gameState.nextPieces.length, getUpcomingPieces]);

  // 键盘事件监听
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const restartGame = () => {
    setSevenBag(generateSevenBag());
    setNextBag(generateSevenBag());
    setBagIndex(0);
    
    setGameState({
      board: createEmptyBoard(),
      currentPiece: null,
      nextPieces: [],
      holdPiece: null,
      canHold: true,
      score: 0,
      lines: 0,
      level: 1,
      combo: -1,
      b2b: 0,
      pieces: 0,
      startTime: Date.now(),
      paused: false,
      gameOver: false,
      clearingLines: [],
      ghostPiece: null,
      attack: 0,
      pps: 0,
      apm: 0
    });
  };

  const currentTime = Date.now();
  const elapsedTime = Math.floor((currentTime - gameState.startTime) / 1000);

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen">
      <div className="flex gap-6 max-w-6xl w-full justify-center">
        {/* 左侧信息栏 */}
        <div className="flex flex-col gap-4 w-48">
          <PiecePreview 
            piece={gameState.holdPiece?.type || null} 
            title="暂存 (C键)" 
            size="large" 
          />
          
          <div className="bg-gray-800 p-4 rounded-lg text-white text-sm">
            <div className="space-y-2">
              <div>得分: {gameState.score.toLocaleString()}</div>
              <div>行数: {gameState.lines}</div>
              <div>等级: {gameState.level}</div>
              <div>连击: {gameState.combo >= 0 ? `${gameState.combo + 1}x` : '无'}</div>
              <div>B2B: {gameState.b2b > 0 ? `${gameState.b2b}x` : '无'}</div>
              <div>方块数: {gameState.pieces}</div>
              <div>PPS: {gameState.pps.toFixed(2)}</div>
              <div>攻击力: {gameState.attack}</div>
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
            <div>B 返回菜单</div>
          </div>
        </div>

        {/* 游戏区域 - 居中 */}
        <div className="flex flex-col items-center">
          {gameState.gameOver && (
            <div className="mb-4 p-4 bg-red-600 text-white rounded-lg text-center">
              <div className="text-xl font-bold mb-2">游戏结束</div>
              <div className="mb-2">最终得分: {gameState.score.toLocaleString()}</div>
              <div className="mb-2">PPS: {gameState.pps.toFixed(2)}</div>
              <div className="mb-2">攻击力: {gameState.attack}</div>
              <div className="flex gap-2 justify-center">
                <Button onClick={restartGame} className="bg-blue-600 hover:bg-blue-700">
                  重新开始
                </Button>
                {onBackToMenu && (
                  <Button onClick={onBackToMenu} variant="outline">
                    返回菜单
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {gameState.paused && (
            <div className="mb-4 p-4 bg-yellow-600 text-white rounded-lg text-center">
              <div className="text-xl font-bold">游戏暂停</div>
              <div className="text-sm">按 P 键继续</div>
              {onBackToMenu && (
                <Button onClick={onBackToMenu} variant="outline" className="mt-2">
                  返回菜单
                </Button>
              )}
            </div>
          )}

          {/* 修复按钮可见性 - 使用高对比度颜色 */}
          <div className="flex gap-3 mb-4">
            <Button
              onClick={() => setGameState(prev => ({ ...prev, paused: !prev.paused }))}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 shadow-lg border-2 border-blue-400"
              disabled={gameState.gameOver}
            >
              {gameState.paused ? '继续' : '暂停'}
            </Button>
            <Button
              onClick={restartGame}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 shadow-lg border-2 border-green-400"
            >
              重新开始
            </Button>
            {onBackToMenu && (
              <Button
                onClick={onBackToMenu}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 shadow-lg border-2 border-red-400"
              >
                返回菜单
              </Button>
            )}
          </div>

          <GameBoard
            board={gameState.board}
            currentPiece={gameState.currentPiece}
            ghostPiece={gameState.ghostPiece}
            enableGhost={true}
            cellSize={30}
            clearingLines={gameState.clearingLines}
          />
        </div>

        {/* 右侧信息栏 */}
        <div className="flex flex-col gap-4 w-48">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-white text-sm mb-3 text-center font-bold">接下来</h3>
            <div className="space-y-3">
              {gameState.nextPieces.slice(0, 4).map((piece, index) => (
                <PiecePreview 
                  key={index} 
                  piece={piece.type} 
                  title="" 
                  size={index === 0 ? "large" : "medium"}
                />
              ))}
            </div>
          </div>
          
          {gameState.gameOver && (
            <div className="bg-gray-800 p-4 rounded-lg text-white text-sm">
              <div className="font-bold mb-2">游戏统计:</div>
              <div>持续时间: {Math.floor(elapsedTime / 60)}分{elapsedTime % 60}秒</div>
              <div>平均PPS: {gameState.pps.toFixed(2)}</div>
              <div>总攻击力: {gameState.attack}</div>
              <div>消行效率: {gameState.pieces > 0 ? (gameState.lines / gameState.pieces * 100).toFixed(1) : 0}%</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FixedTetrisGame;
