import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EnhancedGameBoard from './EnhancedGameBoard';
import GameAreaCountdown from './GameAreaCountdown';
import OutOfFocusOverlay from './OutOfFocusOverlay';
import PiecePreview from './PiecePreview';
import AchievementAnimation from './AchievementAnimation';
import AchievementDetector from './game/AchievementDetector';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Undo2, Redo2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWindowFocus } from '@/hooks/useWindowFocus';
import { useGameHistory } from '@/hooks/useGameHistory';
import { debugLog } from '@/utils/debugLogger';
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
import { calculateDropSpeed, getGravityInfo } from '@/utils/gravitySystem';
import { getB2BDisplayText } from '@/utils/b2bSystem';
import type { TetrominoType, GamePiece, GameState } from '@/utils/gameTypes';

interface FixedTetrisGameProps {
  onBackToMenu?: () => void;
  gameMode?: string;
}

const FixedTetrisGame: React.FC<FixedTetrisGameProps> = ({ onBackToMenu, gameMode = 'sprint' }) => {
  const { user } = useAuth();
  const isWindowFocused = useWindowFocus();
  const [gameStarted, setGameStarted] = useState(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [sevenBag, setSevenBag] = useState<TetrominoType[]>(() => generateSevenBag());
  const [nextBag, setNextBag] = useState<TetrominoType[]>(() => generateSevenBag());
  const [bagIndex, setBagIndex] = useState(0);
  const wasPausedBeforeFocusLoss = useRef(false);
  const [achievementText, setAchievementText] = useState<string | null>(null);
  const [lockDelayActive, setLockDelayActive] = useState(false);
  
  // 添加撤销/重做功能
  const { saveState, undo, redo, canUndo, canRedo, clearHistory } = useGameHistory(50);
  
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard() as number[][],
    currentPiece: null,
    nextPieces: [],
    holdPiece: null,
    canHold: true,
    isHolding: false,
    score: 0,
    lines: 0,
    level: 1,
    combo: -1,
    b2b: 0,
    pieces: 0,
    startTime: Date.now(),
    endTime: null,
    paused: false,
    gameOver: false,
    clearingLines: [],
    ghostPiece: null,
    attack: 0,
    pps: 0,
    apm: 0
  });

  // 保存游戏状态用于撤销/重做
  useEffect(() => {
    if (gameStarted && !gameState.gameOver) {
      saveState(gameState);
    }
  }, [gameState.board, gameState.currentPiece, gameState.score, gameState.lines, gameStarted, gameState.gameOver, saveState]);

  // 撤销/重做功能
  const handleUndo = useCallback(() => {
    if (canUndo && !gameState.gameOver) {
      const previousState = undo();
      if (previousState) {
        setGameState(previousState);
        debugLog.game('撤销操作执行');
      }
    }
  }, [canUndo, gameState.gameOver, undo]);

  const handleRedo = useCallback(() => {
    if (canRedo && !gameState.gameOver) {
      const nextState = redo();
      if (nextState) {
        setGameState(nextState);
        debugLog.game('重做操作执行');
      }
    }
  }, [canRedo, gameState.gameOver, redo]);

  // 成就检测处理
  const handleAchievement = useCallback((achievement: string) => {
    setAchievementText(achievement);
  }, []);

  const handleAchievementComplete = useCallback(() => {
    setAchievementText(null);
  }, []);

  // 处理窗口焦点变化
  useEffect(() => {
    if (!isWindowFocused && !gameState.gameOver && gameStarted) {
      if (!gameState.paused) {
        wasPausedBeforeFocusLoss.current = false;
        setGameState(prev => ({ ...prev, paused: true }));
        debugLog.game('窗口失焦，游戏自动暂停');
      } else {
        wasPausedBeforeFocusLoss.current = true;
      }
    } else if (isWindowFocused && gameState.paused && !wasPausedBeforeFocusLoss.current && gameStarted) {
      setTimeout(() => {
        setGameState(prev => ({ ...prev, paused: false }));
        debugLog.game('窗口重获焦点，游戏自动恢复');
      }, 100);
    }
  }, [isWindowFocused, gameState.paused, gameState.gameOver, gameStarted]);

  const getNextPiece = useCallback((): TetrominoType => {
    const currentBag = sevenBag;
    const currentIndex = bagIndex;
    
    if (currentIndex >= currentBag.length) {
      setSevenBag(nextBag);
      setNextBag(generateSevenBag());
      setBagIndex(1);
      return nextBag[0];
    } else {
      setBagIndex(currentIndex + 1);
      return currentBag[currentIndex];
    }
  }, [sevenBag, nextBag, bagIndex]);

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

  const initializePieces = useCallback(() => {
    debugLog.game('倒计时开始，初始化方块队列');
    const nextPieceType = getNextPiece();
    const newPiece = createNewPiece(nextPieceType);
    const ghostPiece = createGhostPiece(gameState.board, newPiece);
    const nextPieces = getUpcomingPieces();

    setGameState(prev => ({
      ...prev,
      currentPiece: newPiece,
      ghostPiece: ghostPiece,
      nextPieces: nextPieces,
      pieces: prev.pieces + 1
    }));

    debugLog.game('方块队列初始化完成', {
      currentPiece: newPiece.type.type,
      nextPieces: nextPieces.map(p => p.type.type)
    });
  }, [getNextPiece, getUpcomingPieces, gameState.board]);

  const spawnNewPiece = useCallback(() => {
    const nextPieceType = getNextPiece();
    const newPiece = createNewPiece(nextPieceType);

    if (!isValidPosition(gameState.board, newPiece)) {
      toast.error('游戏结束！');
      setGameState(prev => ({ ...prev, gameOver: true }));
      return;
    }

    const ghostPiece = createGhostPiece(gameState.board, newPiece);

    setGameState(prev => ({
      ...prev,
      currentPiece: newPiece,
      ghostPiece: ghostPiece,
      nextPieces: getUpcomingPieces(),
      canHold: true,
      pieces: prev.pieces + 1
    }));
  }, [getNextPiece, getUpcomingPieces, gameState.board]);

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
        
        // 优化软降时的锁定延迟处理
        if (dy > 0) {
          // 检查是否到达底部
          const testPiece = { ...newPiece, y: newPiece.y + 1 };
          if (!isValidPosition(prev.board, testPiece)) {
            setLockDelayActive(true);
            setTimeout(() => setLockDelayActive(false), 500); // 500ms锁定延迟
          }
        }
        
        return {
          ...prev,
          currentPiece: newPiece,
          ghostPiece: newGhostPiece
        };
      }
      return prev;
    });
  }, []);

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

  const hardDrop = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.paused || prev.gameOver) return prev;

      const dropY = calculateDropPosition(prev.board, prev.currentPiece);
      const dropDistance = dropY - prev.currentPiece.y;
      
      debugLog.game('硬降落', { 当前Y: prev.currentPiece.y, 目标Y: dropY, 距离: dropDistance });
      
      const droppedPiece = {
        ...prev.currentPiece,
        y: dropY
      };

      const tSpinResult = checkTSpin(prev.board, droppedPiece, 'rotate');
      const newBoard = placePiece(prev.board, droppedPiece);
      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
      
      const newCombo = linesCleared > 0 ? prev.combo + 1 : -1;
      const isSpecialClear = tSpinResult !== null || linesCleared === 4;
      const newB2B = isSpecialClear ? prev.b2b + 1 : (linesCleared > 0 ? 0 : prev.b2b);
      
      const isPerfectClear = clearedBoard.every(row => row.every(cell => cell === 0));
      
      const newTotalLines = prev.lines + linesCleared;
      const gravityInfo = getGravityInfo(newTotalLines);
      
      const newScore = calculateScore(linesCleared, gravityInfo.level, tSpinResult, newB2B > 1, newCombo, isPerfectClear);
      const attackLines = calculateAttackLines(linesCleared, tSpinResult, newB2B > 1, newCombo);
      
      const timeElapsed = (Date.now() - prev.startTime) / 1000;
      const newPps = prev.pieces > 0 ? prev.pieces / Math.max(timeElapsed, 1) : 0;
      const newApm = attackLines > 0 ? (prev.attack + attackLines) / Math.max(timeElapsed / 60, 1/60) : prev.apm;

      if (linesCleared > 0) {
        setTimeout(() => {
          if (isPerfectClear) {
            toast.success('全清！+3500分！', { duration: 3000 });
          }
          
          if (tSpinResult) {
            const miniText = tSpinResult.isMini ? ' Mini' : '';
            const b2bText = newB2B > 1 ? ` ${getB2BDisplayText(newB2B)}` : '';
            toast.success(`${tSpinResult.type}${miniText}!${b2bText}`, { duration: 2000 });
          } else if (linesCleared === 4) {
            const b2bText = newB2B > 1 ? ` ${getB2BDisplayText(newB2B)}` : '';
            toast.success(`Tetris!${b2bText}`, { duration: 2000 });
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
        lines: newTotalLines,
        level: gravityInfo.level,
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

  const placePieceOnBoard = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece) return prev;

      const tSpinResult = checkTSpin(prev.board, prev.currentPiece, 'move');
      const newBoard = placePiece(prev.board, prev.currentPiece);
      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
      
      if (linesCleared > 0) {
        setTimeout(() => {
          const newCombo = linesCleared > 0 ? prev.combo + 1 : -1;
          const isSpecialClear = tSpinResult !== null || linesCleared === 4;
          const newB2B = isSpecialClear ? prev.b2b + 1 : (linesCleared > 0 ? 0 : prev.b2b);
          
          // 检查是否为全清
          const isPerfectClear = clearedBoard.every(row => row.every(cell => cell === 0));
          
          // 使用新的重力系统计算等级
          const newTotalLines = prev.lines + linesCleared;
          const gravityInfo = getGravityInfo(newTotalLines);
          
          const newScore = calculateScore(linesCleared, gravityInfo.level, tSpinResult, newB2B > 1, newCombo, isPerfectClear);
          const attackLines = calculateAttackLines(linesCleared, tSpinResult, newB2B > 1, newCombo);
          
          const timeElapsed = (Date.now() - prev.startTime) / 1000;
          const newPps = prev.pieces > 0 ? prev.pieces / Math.max(timeElapsed, 1) : 0;
          const newApm = attackLines > 0 ? (prev.attack + attackLines) / Math.max(timeElapsed / 60, 1/60) : prev.apm;
          
          setGameState(current => ({
            ...current,
            board: clearedBoard,
            currentPiece: null,
            score: current.score + newScore,
            lines: newTotalLines,
            level: gravityInfo.level,
            combo: newCombo,
            b2b: newB2B,
            attack: current.attack + attackLines,
            pps: newPps,
            apm: newApm,
            clearingLines: [],
            ghostPiece: null
          }));

          // 显示提示
          if (isPerfectClear) {
            toast.success('全清！+3500分！', { duration: 3000 });
          }
          
          if (tSpinResult) {
            const miniText = tSpinResult.isMini ? ' Mini' : '';
            const b2bText = newB2B > 1 ? ` ${getB2BDisplayText(newB2B)}` : '';
            toast.success(`${tSpinResult.type}${miniText}!${b2bText}`, { duration: 2000 });
          } else if (linesCleared === 4) {
            const b2bText = newB2B > 1 ? ` ${getB2BDisplayText(newB2B)}` : '';
            toast.success(`Tetris!${b2bText}`, { duration: 2000 });
          } else {
            toast.success(`消除了 ${linesCleared} 行! +${newScore} 分`, { duration: 1500 });
          }
          
          if (newCombo >= 0) {
            toast.success(`${newCombo + 1} 连击! +${attackLines} 攻击`, { duration: 1500 });
          }
        }, 300);

        return {
          ...prev,
          clearingLines: []
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

  // 键盘控制 - 添加撤销/重做功能
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState.paused || gameState.gameOver || !isWindowFocused) return;

    if (event.ctrlKey) {
      if (event.code === 'KeyZ' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      } else if (event.code === 'KeyY' || (event.code === 'KeyZ' && event.shiftKey)) {
        event.preventDefault();
        handleRedo();
        return;
      }
    }

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
        wasPausedBeforeFocusLoss.current = true;
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
  }, [movePiece, hardDrop, rotatePieceClockwise, holdPiece, gameState.paused, gameState.gameOver, isWindowFocused, onBackToMenu, handleUndo, handleRedo]);

  useEffect(() => {
    if (gameState.paused || gameState.gameOver || !isWindowFocused || !gameStarted) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const dropInterval = calculateDropSpeed(gameState.lines);
    
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
          setTimeout(() => spawnNewPiece(), 10);
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
  }, [gameState.lines, gameState.paused, gameState.gameOver, isWindowFocused, gameStarted, spawnNewPiece]);

  useEffect(() => {
    if (!gameState.currentPiece && !gameState.gameOver && !gameState.paused && gameStarted) {
      const timer = setTimeout(() => {
        spawnNewPiece();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPiece, gameState.gameOver, gameState.paused, spawnNewPiece, gameStarted]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const startGame = () => {
    debugLog.game('开始游戏');
    setGameStarted(true);
    clearHistory(); // 清除历史记录
    wasPausedBeforeFocusLoss.current = false;
  };

  const handleCountdownStart = () => {
    debugLog.game('倒计时开始，初始化方块');
    initializePieces();
  };

  const handleCountdownEnd = () => {
    debugLog.game('倒计时结束，游戏正式开始');
  };

  const currentTime = Date.now();
  const elapsedTime = Math.floor((currentTime - gameState.startTime) / 1000);
  const gravityInfo = getGravityInfo(gameState.lines);
  
  const getDisplayName = (): string => {
    if (user?.email) {
      return user.email.includes('@') ? user.email.split('@')[0] : user.email;
    }
    return 'Player';
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen">
      {/* 返回菜单按钮和撤销/重做按钮 */}
      <div className="w-full max-w-6xl mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {onBackToMenu && (
            <Button
              onClick={onBackToMenu}
              variant="outline"
              className="flex items-center gap-2 text-white border-gray-600 hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              返回菜单
            </Button>
          )}
          
          {gameStarted && (gameMode === 'marathon' || gameMode === 'endless') && (
            <>
              <Button
                onClick={handleUndo}
                variant="outline"
                className="flex items-center gap-2 text-white border-gray-600 hover:bg-gray-800"
                disabled={!canUndo || gameState.gameOver}
                title="撤销 (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
                撤销
              </Button>
              
              <Button
                onClick={handleRedo}
                variant="outline"
                className="flex items-center gap-2 text-white border-gray-600 hover:bg-gray-800"
                disabled={!canRedo || gameState.gameOver}
                title="重做 (Ctrl+Y/Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
                重做
              </Button>
            </>
          )}
        </div>
        
        <div className="text-white text-xl font-bold">
          俄罗斯方块
        </div>
      </div>

      <div className="flex gap-6 max-w-6xl w-full justify-center">        
        {/* 左侧信息栏 */}
        <div className="flex flex-col gap-4 w-48">
          <PiecePreview 
            piece={gameState.holdPiece?.type || null} 
            title="暂存 (C键)" 
            size="large" 
          />
          
          {/* 成就动画显示区域 */}
          <div className="relative min-h-[80px]">
            {achievementText && (
              <AchievementAnimation
                achievement={achievementText}
                onComplete={handleAchievementComplete}
              />
            )}
          </div>
          
          {/* 游戏信息 */}
          <div className="flex-1 flex flex-col justify-end">
            <div className="bg-gray-800 p-4 rounded-lg text-white text-sm">
              <div className="space-y-2">
                <div className="font-bold text-lg">{getDisplayName()}</div>
                <div>得分: {gameState.score.toLocaleString()}</div>
                <div>行数: {gameState.lines}</div>
                <div className="flex items-center gap-2">
                  <span>等级: {gravityInfo.level}</span>
                  <span className="text-xs opacity-70">
                    (G: {gravityInfo.gravity.toFixed(3)})
                  </span>
                </div>
                <div>连击: {gameState.combo >= 0 ? `${gameState.combo + 1}x` : '无'}</div>
                {gameState.b2b > 1 && (
                  <div className="text-orange-400 font-bold">
                    {getB2BDisplayText(gameState.b2b)}
                  </div>
                )}
                <div>方块数: {gameState.pieces}</div>
                <div>PPS: {gameState.pps.toFixed(2)}</div>
                <div>攻击力: {gameState.attack}</div>
                <div>时间: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</div>
              </div>
            </div>
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
                <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
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

          {/* 控制按钮 */}
          <div className="flex gap-3 mb-4">
            {!gameStarted ? (
              <Button
                onClick={startGame}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 shadow-lg border-2 border-green-400"
              >
                开始游戏
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    wasPausedBeforeFocusLoss.current = true;
                    setGameState(prev => ({ ...prev, paused: !prev.paused }));
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 shadow-lg border-2 border-blue-400"
                  disabled={gameState.gameOver}
                >
                  {gameState.paused ? '继续' : '暂停'}
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 shadow-lg border-2 border-green-400"
                >
                  重新开始
                </Button>
              </>
            )}
          </div>

          {/* 游戏板容器 */}
          <div className="relative">
            <EnhancedGameBoard
              board={gameState.board}
              currentPiece={gameState.currentPiece}
              ghostPiece={gameState.ghostPiece}
              cellSize={30}
              clearingLines={gameState.clearingLines}
              showHiddenRows={true}
            />
            
            <GameAreaCountdown
              show={gameStarted && !gameState.gameOver}
              onCountdownStart={handleCountdownStart}
              onCountdownEnd={handleCountdownEnd}
            />
            
            <OutOfFocusOverlay 
              show={!isWindowFocused && gameStarted && !gameState.gameOver}
            />
          </div>
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
          
          <div className="bg-gray-800 p-4 rounded-lg text-white text-xs">
            <div className="font-bold mb-2">操作说明:</div>
            <div>← → 移动</div>
            <div>↓ 软降</div>
            <div>↑/空格 硬降</div>
            <div>Z 旋转</div>
            <div>C 暂存</div>
            <div>P 暂停</div>
            <div>Ctrl+Z 撤销</div>
            <div>Ctrl+Y 重做</div>
            <div>B 返回菜单</div>
          </div>
        </div>
      </div>
      
      {/* 成就检测器 */}
      <AchievementDetector
        linesCleared={0}
        tSpinResult={null}
        combo={gameState.combo}
        b2b={gameState.b2b}
        tetris={false}
        onAchievement={handleAchievement}
      />
    </div>
  );
};

export default FixedTetrisGame;
