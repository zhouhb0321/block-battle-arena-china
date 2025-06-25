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
  
  // 新增计分相关状态
  const [b2b, setB2b] = useState(0); // Back-to-Back计数
  const [totalAttack, setTotalAttack] = useState(0);
  const [pps, setPps] = useState(0); // Pieces Per Second
  const [apm, setApm] = useState(0); // Attack Per Minute
  const [startTime] = useState(Date.now());

  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const LOCK_DELAY_TIME = 500;

  const spawnNewPiece = useCallback(() => {
    if (nextPieces.length === 0) return;

    const newPiece = {
      type: nextPieces[0],
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(nextPieces[0].shape[0].length / 2),
      y: 0, // 修复：从顶部可见区域开始，而不是-1
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
    setPieces(prev => {
      const newPieces = prev + 1;
      // 计算PPS
      const timeElapsed = (Date.now() - startTime) / 1000;
      setPps(newPieces / Math.max(timeElapsed, 1));
      return newPieces;
    });
  }, [board, nextPieces, startTime]);

  const calculateScore = useCallback((linesCleared: number, tSpinType: string | null, comboCount: number, level: number): number => {
    let baseScore = 0;
    let isSpecialClear = false;

    if (tSpinType) {
      isSpecialClear = true;
      switch (tSpinType) {
        case 'Mini T-Spin':
          baseScore = linesCleared === 0 ? 100 : linesCleared === 1 ? 200 : 400;
          break;
        case 'T-Spin-Single':
          baseScore = 800;
          break;
        case 'T-Spin-Double':
          baseScore = 1200;
          break;
        case 'T-Spin-Triple':
          baseScore = 1600;
          break;
      }
    } else if (linesCleared > 0) {
      const lineScores = [0, 100, 300, 500, 800]; // Single, Double, Triple, Tetris
      baseScore = lineScores[Math.min(linesCleared, 4)] || 0;
      isSpecialClear = linesCleared === 4; // Tetris
    }

    // B2B奖励
    let b2bBonus = 1;
    if (isSpecialClear && b2b > 0) {
      b2bBonus = 1.5; // 50%奖励
    }

    // 连击奖励
    let comboBonus = 0;
    if (comboCount > 0) {
      comboBonus = Math.min(comboCount * 50, 400);
    }

    return Math.floor((baseScore * b2bBonus + comboBonus) * level);
  }, [b2b]);

  const calculateAttack = useCallback((linesCleared: number, tSpinType: string | null, comboCount: number, b2bCount: number): number => {
    let attackValue = 0;
    let isSpecialClear = false;
    
    if (tSpinType) {
      isSpecialClear = true;
      const tSpinAttack = {
        'Mini T-Spin': linesCleared === 0 ? 0 : linesCleared === 1 ? 0 : 1,
        'T-Spin-Single': 2,
        'T-Spin-Double': 4,
        'T-Spin-Triple': 6
      };
      attackValue = tSpinAttack[tSpinType as keyof typeof tSpinAttack] || 0;
    } else if (linesCleared > 0) {
      const lineAttack = [0, 0, 1, 2, 4]; // Single, Double, Triple, Tetris
      attackValue = lineAttack[Math.min(linesCleared, 4)] || 0;
      isSpecialClear = linesCleared === 4; // Tetris
    }
    
    // B2B奖励
    if (isSpecialClear && b2bCount > 0) {
      attackValue += 1; // B2B额外攻击力
    }
    
    // 连击加成
    if (comboCount > 0) {
      const comboAttack = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5]; // 连击攻击力表
      attackValue += comboAttack[Math.min(comboCount, 11)] || 5;
    }
    
    return attackValue;
  }, []);

  const addGarbageLines = useCallback((count: number) => {
    if (count <= 0) return;
    
    setBoard(prevBoard => {
      const newBoard = [...prevBoard];
      // 删除顶部行数
      newBoard.splice(0, count);
      
      // 在底部添加垃圾行
      for (let i = 0; i < count; i++) {
        const garbageLine = Array(10).fill(8); // 8表示垃圾块
        const holePosition = Math.floor(Math.random() * 10);
        garbageLine[holePosition] = 0; // 随机位置留洞
        newBoard.push(garbageLine);
      }
      
      return newBoard;
    });
  }, []);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    const tSpinType = checkTSpin(board, currentPiece, lastAction || 'move');
    const newBoard = placePiece(board, currentPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    setBoard(clearedBoard);
    setLines(prev => prev + linesCleared);
    
    // 更新连击
    const newCombo = linesCleared > 0 ? combo + 1 : -1;
    setCombo(newCombo);
    
    // 更新B2B
    const isSpecialClear = tSpinType !== null || linesCleared === 4;
    if (isSpecialClear) {
      setB2b(prev => prev + 1);
    } else if (linesCleared > 0) {
      setB2b(0);
    }
    
    // 计算得分
    const lineScore = calculateScore(linesCleared, tSpinType, newCombo, level);
    setScore(prev => prev + lineScore);
    
    // 计算攻击力
    const attackValue = calculateAttack(linesCleared, tSpinType, newCombo, b2b);
    if (attackValue > 0) {
      setTotalAttack(prev => {
        const newTotal = prev + attackValue;
        // 计算APM
        const timeElapsed = (Date.now() - startTime) / 60000; // 分钟
        setApm(newTotal / Math.max(timeElapsed, 1/60));
        return newTotal;
      });
      
      // 多人模式下发送垃圾行
      if (mode === 'multi') {
        // 这里应该通过WebSocket发送攻击
        console.log(`发送 ${attackValue} 行垃圾块给对手`);
      }
    }
    
    // 显示特殊操作提示
    if (tSpinType) {
      toast.success(`${tSpinType}!${b2b > 1 ? ` B2B x${b2b}` : ''}`, { duration: 2000 });
    } else if (linesCleared === 4) {
      toast.success(`Tetris!${b2b > 1 ? ` B2B x${b2b}` : ''}`, { duration: 2000 });
    }
    
    // 连击提示
    if (newCombo > 0) {
      toast.success(`${newCombo + 1} 连击! +${attackValue} 攻击`, { duration: 1500 });
    }
    
    const newLevel = Math.floor((lines + linesCleared) / 10) + 1;
    setLevel(newLevel);
    
    setLastAction(null);
    spawnNewPiece();
  }, [currentPiece, board, level, lines, spawnNewPiece, lastAction, combo, calculateScore, calculateAttack, b2b, mode, startTime]);

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
    const dropDistance = dropY - currentPiece.y;
    setScore(prev => prev + dropDistance * 2); // 硬降奖励分数
    setCurrentPiece(prev => prev ? { ...prev, y: dropY } : null);
    
    setTimeout(lockPiece, 50);
  }, [currentPiece, board, gameOver, paused, lockPiece]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || paused) return;

    if (holdPiece) {
      const newPiece = {
        type: holdPiece,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(holdPiece.shape[0].length / 2),
        y: 0, // 修复：从顶部开始
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
              const moved = movePiece(0, 1);
              if (moved) setScore(prev => prev + 1); // 软降奖励分数
            }
          }
        } else if (heldTime < 16) {
          if (key === controls.moveLeft) {
            movePiece(-1, 0);
          } else if (key === controls.moveRight) {
            movePiece(1, 0);
          } else if (key === controls.softDrop) {
            const moved = movePiece(0, 1);
            if (moved) setScore(prev => prev + 1);
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
    const text = `我在方块竞技场获得了 ${score.toLocaleString()} 分！消除了 ${lines} 行，攻击力 ${totalAttack}！一起来挑战吧！`;
    
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
    setB2b(0);
    setTotalAttack(0);
    setPps(0);
    setApm(0);
    lastDropTime.current = 0;
    lockDelayTime.current = 0;
    keyPressedTime.current = {};
    setTimeout(() => spawnNewPiece(), 100);
    resetGame();
  };

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
    <div className="flex gap-4 p-4 justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {mode === 'single' && (
        <div className="flex gap-6 items-center">
          {/* 左侧广告位 */}
          <div className="w-64 h-[600px] bg-gray-800 border-2 border-gray-600 flex items-center justify-center rounded-lg shadow-lg">
            <span className="text-gray-400 text-sm text-center">广告位<br/>招租中<br/>联系管理员</span>
          </div>

          <div className="flex gap-6">
            {/* 左侧信息面板 */}
            <div className="flex flex-col gap-4">
              <PiecePreview piece={holdPiece} title="HOLD" size="medium" />
              
              {/* 游戏状态指示器 */}
              <div className="bg-gray-800 rounded-lg p-3 text-white text-sm space-y-2">
                {combo >= 0 && (
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-2 rounded text-center font-bold">
                    {combo + 1}x 连击
                  </div>
                )}
                {b2b > 0 && (
                  <div className="bg-gradient-to-r from-red-500 to-pink-500 p-2 rounded text-center font-bold">
                    B2B x{b2b}
                  </div>
                )}
                <div className="text-center">
                  <div className="text-xs text-gray-400">攻击力</div>
                  <div className="text-lg font-bold text-red-400">{totalAttack}</div>
                </div>
              </div>
            </div>

            {/* 主游戏区域 */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-700">
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
                combo={combo >= 0 ? combo : undefined}
              />
              
              <div className="relative">
                <GameBoard
                  board={board}
                  currentPiece={currentPiece}
                  enableGhost={gameSettings.enableGhost}
                  cellSize={30}
                />
                
                {paused && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
                    <div className="text-white text-2xl font-bold">游戏暂停</div>
                  </div>
                )}
                
                {gameOver && (
                  <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center rounded-lg">
                    <div className="text-white text-center p-6 bg-gray-800 rounded-lg">
                      <div className="text-3xl mb-4 font-bold text-red-400">游戏结束</div>
                      <div className="space-y-2 mb-6">
                        <div>最终得分: <span className="font-bold text-yellow-400">{score.toLocaleString()}</span></div>
                        <div>消除行数: <span className="font-bold">{lines}</span></div>
                        <div>攻击力: <span className="font-bold text-red-400">{totalAttack}</span></div>
                        <div>PPS: <span className="font-bold">{pps.toFixed(2)}</span></div>
                        <div>APM: <span className="font-bold">{apm.toFixed(1)}</span></div>
                      </div>
                      <Button onClick={handleReset} className="bg-blue-600 hover:bg-blue-700">
                        重新开始
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧NEXT面板 */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
              <h3 className="text-white text-sm mb-3 text-center font-bold">NEXT</h3>
              <div className="space-y-3">
                {nextPieces.slice(0, 5).map((piece, index) => (
                  <PiecePreview 
                    key={index} 
                    piece={piece} 
                    title="" 
                    size={index === 0 ? "medium" : "small"} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 右侧广告位 */}
          <div className="w-64 h-[600px] bg-gray-800 border-2 border-gray-600 flex items-center justify-center rounded-lg shadow-lg">
            <span className="text-gray-400 text-sm text-center">广告位<br/>招租中<br/>联系管理员</span>
          </div>
        </div>
      )}

      {mode === 'multi' && (
        <div className="flex gap-8 w-full max-w-7xl justify-center">
          {/* 玩家1区域 */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <PiecePreview piece={holdPiece} title="HOLD" size="small" />
              {combo >= 0 && (
                <div className="bg-yellow-600 p-1 rounded text-white text-center text-xs font-bold">
                  {combo + 1}x
                </div>
              )}
              {b2b > 0 && (
                <div className="bg-red-600 p-1 rounded text-white text-center text-xs font-bold">
                  B2B x{b2b}
                </div>
              )}
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg relative shadow-xl">
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
                rank="B+"
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
            
            <div className="space-y-2">
              {nextPieces.slice(0, 3).map((piece, index) => (
                <PiecePreview key={index} piece={piece} title="" size="small" />
              ))}
            </div>
          </div>

          {/* 中央VS区域 */}
          <div className="flex flex-col items-center justify-center text-white min-w-[200px]">
            <div className="text-4xl font-bold mb-6 bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
              VS
            </div>
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">方块联盟</div>
              <div className="text-sm text-gray-400">排位匹配</div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-xs text-gray-400">当前排位</div>
                <div className="text-lg font-bold text-blue-400">B+</div>
              </div>
              <div className="text-xs text-gray-500">等待匹配...</div>
            </div>
          </div>

          {/* 玩家2区域（对手） */}
          <div className="flex gap-4">
            <div className="space-y-2">
              {nextPieces.slice(0, 3).map((piece, index) => (
                <PiecePreview key={index} piece={piece} title="" size="small" />
              ))}
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg relative shadow-xl opacity-75">
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
                rank="B"
              />
              
              <GameBoard
                board={Array(20).fill(null).map(() => Array(10).fill(0))}
                currentPiece={null}
                enableGhost={false}
                cellSize={25}
              />
              
              <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="text-white text-center">
                  <div className="animate-pulse text-lg">寻找对手中...</div>
                  <div className="text-sm text-gray-400 mt-2">预计等待时间: 30秒</div>
                </div>
              </div>
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
