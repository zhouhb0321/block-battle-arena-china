
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import GameBoard from './GameBoard';
import GameInfo from './GameInfo';
import PiecePreview from './PiecePreview';
import { 
  isValidPosition, 
  placePiece, 
  clearLines, 
  rotatePiece, 
  calculateDropPosition,
  generateSevenBag,
  checkTSpin,
  getKickTests
} from '@/utils/tetrisLogic';

interface TetrisGameProps {
  mode: 'single' | 'multi';
  gameType?: 'sprint40' | 'ultra2min' | 'endless';
}

const TetrisGame: React.FC<TetrisGameProps> = ({ mode, gameType = 'endless' }) => {
  const { gameState, gameSettings, resetGame, pauseGame, resumeGame } = useGame();
  const { user } = useAuth();
  const gameLoopRef = useRef<number>();
  const lastDropTime = useRef<number>(0);
  const keyPressedTime = useRef<{[key: string]: number}>({});
  const lockDelayTime = useRef<number>(0);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [lastAction, setLastAction] = useState<'rotate' | 'move' | null>(null);
  
  const [currentPiece, setCurrentPiece] = useState(gameState.currentPiece);
  const [board, setBoard] = useState(() => Array(20).fill(null).map(() => Array(10).fill(0)));
  const [nextPieces, setNextPieces] = useState(() => generateSevenBag());
  const [holdPiece, setHoldPiece] = useState(gameState.holdPiece);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [pieces, setPieces] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lockDelay, setLockDelay] = useState(false);
  const [combo, setCombo] = useState(-1);
  const [attack, setAttack] = useState(0);
  const [garbageLines, setGarbageLines] = useState<number[]>([]);

  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const LOCK_DELAY_TIME = 500;

  const spawnNewPiece = useCallback(() => {
    if (nextPieces.length === 0) return;

    const newPiece = {
      type: nextPieces[0],
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(nextPieces[0].shape[0].length / 2),
      y: -1, // 开始位置在可见区域上方
      rotation: 0
    };

    const newNextPieces = [...nextPieces.slice(1)];
    if (newNextPieces.length < 6) {
      newNextPieces.push(...generateSevenBag());
    }

    if (!isValidPosition(board, newPiece)) {
      setGameOver(true);
      return;
    }

    setCurrentPiece(newPiece);
    setNextPieces(newNextPieces);
    setCanHold(true);
    setLockDelay(false);
    lockDelayTime.current = 0;
    setPieces(prev => prev + 1);
  }, [board, nextPieces]);

  const calculateAttack = useCallback((linesCleared: number, tSpinType: string | null, comboCount: number): number => {
    let attackValue = 0;
    
    if (tSpinType) {
      const tSpinAttack = {
        'Mini T-Spin': 0,
        'T-Spin-Single': 2,
        'T-Spin-Double': 4,
        'T-Spin-Triple': 6
      };
      attackValue = tSpinAttack[tSpinType as keyof typeof tSpinAttack] || 0;
    } else {
      const lineAttack = [0, 0, 1, 2, 4];
      attackValue = lineAttack[Math.min(linesCleared, 4)] || 0;
    }
    
    // 连击加成
    if (comboCount > 0) {
      const comboBonus = Math.min(Math.floor(comboCount / 2), 4);
      attackValue += comboBonus;
    }
    
    return attackValue;
  }, []);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    const tSpinType = checkTSpin(board, currentPiece, lastAction || 'move');
    const newBoard = placePiece(board, currentPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    setBoard(clearedBoard);
    setLines(prev => prev + linesCleared);
    
    // 更新连击
    if (linesCleared > 0) {
      setCombo(prev => prev + 1);
    } else {
      setCombo(-1);
    }
    
    // 计算得分和攻击力
    let lineScore = 0;
    if (tSpinType) {
      const tSpinScores = {
        'Mini T-Spin': 100,
        'T-Spin-Single': 800,
        'T-Spin-Double': 1200,
        'T-Spin-Triple': 1600
      };
      lineScore = tSpinScores[tSpinType as keyof typeof tSpinScores] || 0;
      toast.success(`${tSpinType}!`, { duration: 2000 });
    } else {
      const lineScores = [0, 40, 100, 300, 1200];
      lineScore = lineScores[Math.min(linesCleared, 4)] || 0;
    }
    
    // 连击奖励
    if (combo >= 0 && linesCleared > 0) {
      lineScore += combo * 50;
      if (combo > 0) {
        toast.success(`${combo + 1} 连击!`, { duration: 1500 });
      }
    }
    
    setScore(prev => prev + lineScore * level);
    
    // 计算攻击力
    const attackValue = calculateAttack(linesCleared, tSpinType, combo);
    setAttack(prev => prev + attackValue);
    
    const newLevel = Math.floor((lines + linesCleared) / 10) + 1;
    setLevel(newLevel);
    
    setLastAction(null);
    spawnNewPiece();
  }, [currentPiece, board, level, lines, spawnNewPiece, lastAction, combo, calculateAttack]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameOver || paused) return false;

    const newX = currentPiece.x + dx;
    const newY = currentPiece.y + dy;

    if (isValidPosition(board, currentPiece, newX, newY)) {
      setCurrentPiece(prev => prev ? { ...prev, x: newX, y: newY } : null);
      setLastAction('move');
      
      if (dy > 0) {
        setLockDelay(false);
        lockDelayTime.current = 0;
      }
      
      return true;
    } else if (dy > 0) {
      if (!lockDelay) {
        setLockDelay(true);
        lockDelayTime.current = Date.now();
      }
      return false;
    }
    return false;
  }, [currentPiece, board, gameOver, paused, lockDelay]);

  const rotatePieceClockwise = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const rotated = rotatePiece(currentPiece.type, true);
    const newRotation = (currentPiece.rotation + 1) % 4;
    
    const kickTests = getKickTests(currentPiece.type.type, currentPiece.rotation, newRotation);

    for (const kick of kickTests) {
      const testPiece = { 
        ...currentPiece, 
        type: rotated, 
        x: currentPiece.x + kick.x, 
        y: currentPiece.y + kick.y,
        rotation: newRotation
      };
      
      if (isValidPosition(board, testPiece)) {
        setCurrentPiece(testPiece);
        setLastAction('rotate');
        
        setLockDelay(false);
        lockDelayTime.current = 0;
        return;
      }
    }
  }, [currentPiece, board, gameOver, paused]);

  const rotatePieceCounterclockwise = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const rotated = rotatePiece(currentPiece.type, false);
    const newRotation = (currentPiece.rotation + 3) % 4;
    
    const kickTests = getKickTests(currentPiece.type.type, currentPiece.rotation, newRotation);

    for (const kick of kickTests) {
      const testPiece = { 
        ...currentPiece, 
        type: rotated, 
        x: currentPiece.x + kick.x, 
        y: currentPiece.y + kick.y,
        rotation: newRotation
      };
      
      if (isValidPosition(board, testPiece)) {
        setCurrentPiece(testPiece);
        setLastAction('rotate');
        
        setLockDelay(false);
        lockDelayTime.current = 0;
        return;
      }
    }
  }, [currentPiece, board, gameOver, paused]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const dropY = calculateDropPosition(board, currentPiece);
    setCurrentPiece(prev => prev ? { ...prev, y: dropY } : null);
    
    setTimeout(lockPiece, 50);
  }, [currentPiece, board, gameOver, paused, lockPiece]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || paused) return;

    if (holdPiece) {
      const newPiece = {
        type: holdPiece,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(holdPiece.shape[0].length / 2),
        y: -1,
        rotation: 0
      };
      setHoldPiece(currentPiece.type);
      setCurrentPiece(newPiece);
    } else {
      setHoldPiece(currentPiece.type);
      spawnNewPiece();
    }
    
    setCanHold(false);
    setLockDelay(false);
    lockDelayTime.current = 0;
  }, [currentPiece, holdPiece, canHold, gameOver, paused, spawnNewPiece]);

  const togglePause = useCallback(() => {
    if (paused) {
      setPaused(false);
      resumeGame();
    } else {
      setPaused(true);
      pauseGame();
    }
  }, [paused, pauseGame, resumeGame]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (gameOver || paused) return;
    
    const { controls } = gameSettings;
    const now = Date.now();
    
    if (!keyPressedTime.current[event.code]) {
      keyPressedTime.current[event.code] = now;
      
      if (event.code === controls.rotateClockwise) {
        event.preventDefault();
        rotatePieceClockwise();
      } else if (event.code === controls.rotateCounterclockwise) {
        event.preventDefault();
        rotatePieceCounterclockwise();
      } else if (event.code === controls.hardDrop) {
        event.preventDefault();
        hardDrop();
      } else if (event.code === controls.hold) {
        event.preventDefault();
        holdCurrentPiece();
      } else if (event.code === controls.pause) {
        event.preventDefault();
        togglePause();
      }
    }
    
    setKeys(prev => new Set(prev).add(event.code));
  }, [gameSettings, gameOver, paused, rotatePieceClockwise, rotatePieceCounterclockwise, hardDrop, holdCurrentPiece, togglePause]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    delete keyPressedTime.current[event.code];
    setKeys(prev => {
      const newKeys = new Set(prev);
      newKeys.delete(event.code);
      return newKeys;
    });
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (gameOver) return;

    if (!paused) {
      const { controls } = gameSettings;
      
      keys.forEach(key => {
        const pressTime = keyPressedTime.current[key] || 0;
        const heldTime = timestamp - pressTime;
        
        if (heldTime > gameSettings.das) {
          if (key === controls.moveLeft) {
            if (heldTime % Math.max(gameSettings.arr, 16) < 16) {
              movePiece(-1, 0);
            }
          } else if (key === controls.moveRight) {
            if (heldTime % Math.max(gameSettings.arr, 16) < 16) {
              movePiece(1, 0);
            }
          } else if (key === controls.softDrop) {
            if (heldTime % Math.max(16, 1000 / gameSettings.sdf) < 16) {
              movePiece(0, 1);
            }
          }
        } else if (heldTime < 16) {
          if (key === controls.moveLeft) {
            movePiece(-1, 0);
          } else if (key === controls.moveRight) {
            movePiece(1, 0);
          } else if (key === controls.softDrop) {
            movePiece(0, 1);
          }
        }
      });

      const dropSpeed = Math.max(50, 1000 - (level - 1) * 50);
      if (timestamp - lastDropTime.current > dropSpeed) {
        const moved = movePiece(0, 1);
        if (!moved && lockDelay) {
          if (timestamp - lockDelayTime.current > LOCK_DELAY_TIME) {
            lockPiece();
          }
        }
        lastDropTime.current = timestamp;
      } else if (lockDelay) {
        if (timestamp - lockDelayTime.current > LOCK_DELAY_TIME) {
          lockPiece();
        }
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    gameOver, paused, keys, gameSettings, level,
    movePiece, lockDelay, lockPiece
  ]);

  const handleShare = () => {
    const url = window.location.href;
    const text = `我在方块竞技场获得了 ${score} 分！一起来挑战吧！`;
    
    if (navigator.share) {
      navigator.share({
        title: '方块竞技场',
        text: text,
        url: url
      });
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success('分享链接已复制到剪贴板');
    }
  };

  const handleReset = () => {
    setBoard(Array(20).fill(null).map(() => Array(10).fill(0)));
    setNextPieces(generateSevenBag());
    setCurrentPiece(null);
    setHoldPiece(null);
    setScore(0);
    setLines(0);
    setLevel(1);
    setPieces(0);
    setGameOver(false);
    setPaused(false);
    setCanHold(true);
    setLockDelay(false);
    setCombo(-1);
    setAttack(0);
    lastDropTime.current = 0;
    lockDelayTime.current = 0;
    keyPressedTime.current = {};
    setTimeout(() => spawnNewPiece(), 100);
    resetGame();
  };

  const pps = pieces > 0 ? pieces / Math.max((Date.now() - Date.now()) / 1000, 1) : 0;
  const apm = attack > 0 ? attack / Math.max((Date.now() - Date.now()) / 60000, 1) : 0;

  useEffect(() => {
    if (!currentPiece && nextPieces.length > 0) {
      setTimeout(() => spawnNewPiece(), 100);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [handleKeyDown, handleKeyUp, gameLoop, currentPiece, nextPieces, spawnNewPiece]);

  return (
    <div className="flex gap-4 p-4 justify-center min-h-screen bg-gray-900">
      {mode === 'single' && (
        <>
          <div className="w-60 h-[600px] bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center rounded-lg">
            <span className="text-gray-500 text-sm text-center">广告位<br/>招租中<br/>联系管理员</span>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-4">
              <PiecePreview piece={holdPiece} title="HOLD" size="medium" />
              {combo >= 0 && (
                <div className="bg-yellow-600 p-2 rounded text-white text-center text-sm font-bold">
                  {combo + 1}x 连击
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-4 rounded-lg relative">
              <GameInfo
                username={user?.username || '游客'}
                score={score}
                lines={lines}
                level={level}
                pieces={pieces}
                pps={pps}
                attack={apm}
                paused={paused}
                onPause={togglePause}
                onShare={handleShare}
                mode="single"
              />
              
              <GameBoard
                board={board}
                currentPiece={currentPiece}
                enableGhost={gameSettings.enableGhost}
                cellSize={30}
              />
              
              {paused && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
                  <div className="text-white text-2xl">游戏暂停</div>
                </div>
              )}
              
              {gameOver && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
                  <div className="text-white text-center">
                    <div className="text-2xl mb-4">游戏结束</div>
                    <div className="mb-4">最终得分: {score.toLocaleString()}</div>
                    <div className="mb-4">消除行数: {lines}</div>
                    <div className="mb-4">攻击力: {attack.toFixed(1)}</div>
                    <Button onClick={handleReset}>重新开始</Button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white text-sm mb-2 text-center font-bold">NEXT</h3>
              <div className="space-y-2">
                {nextPieces.slice(0, 5).map((piece, index) => (
                  <PiecePreview key={index} piece={piece} title="" size="small" />
                ))}
              </div>
            </div>
          </div>

          <div className="w-60 h-[600px] bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center rounded-lg">
            <span className="text-gray-500 text-sm text-center">广告位<br/>招租中<br/>联系管理员</span>
          </div>
        </>
      )}

      {mode === 'multi' && (
        <div className="flex gap-8 w-full max-w-6xl">
          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <PiecePreview piece={holdPiece} title="HOLD" size="small" />
              {combo >= 0 && (
                <div className="bg-yellow-600 p-1 rounded text-white text-center text-xs">
                  {combo + 1}x
                </div>
              )}
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg relative">
              <GameInfo
                username={user?.username || 'Player 1'}
                score={score}
                lines={lines}
                level={level}
                pieces={pieces}
                pps={pps}
                attack={apm}
                paused={paused}
                onPause={togglePause}
                onShare={handleShare}
                mode="multi"
              />
              
              <GameBoard
                board={board}
                currentPiece={currentPiece}
                enableGhost={gameSettings.enableGhost}
                cellSize={25}
              />
              
              {paused && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
                  <div className="text-white text-xl">暂停</div>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              {nextPieces.slice(0, 3).map((piece, index) => (
                <PiecePreview key={index} piece={piece} title="" size="small" />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center text-white">
            <div className="text-2xl font-bold mb-4">VS</div>
            <div className="text-sm opacity-75">等待匹配...</div>
            <div className="text-xs mt-2">排位: 待定</div>
          </div>

          <div className="flex gap-4">
            <div className="space-y-1">
              {nextPieces.slice(0, 3).map((piece, index) => (
                <PiecePreview key={index} piece={piece} title="" size="small" />
              ))}
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg relative">
              <GameInfo
                username="等待对手..."
                score={0}
                lines={0}
                level={1}
                pieces={0}
                pps={0}
                attack={0}
                paused={false}
                onPause={() => {}}
                onShare={() => {}}
                mode="multi"
              />
              
              <GameBoard
                board={Array(20).fill(null).map(() => Array(10).fill(0))}
                currentPiece={null}
                enableGhost={false}
                cellSize={25}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <PiecePreview piece={null} title="HOLD" size="small" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TetrisGame;
