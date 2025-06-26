
import React, { useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import GameBoard from './GameBoard';
import GameInfo from './GameInfo';
import PiecePreview from './PiecePreview';
import GameOverlay from './GameOverlay';
import GameStatusIndicators from './GameStatusIndicators';
import AdSpace from './AdSpace';
import { useGameState } from '@/hooks/useGameState';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useGameLogic } from '@/hooks/useGameLogic';

interface TetrisGameProps {
  mode: 'single' | 'multi';
  gameType?: 'sprint40' | 'ultra2min' | 'endless';
  onBackToMenu?: () => void;
}

const TetrisGame: React.FC<TetrisGameProps> = ({ mode, gameType = 'endless', onBackToMenu }) => {
  const { gameSettings, resetGame, pauseGame, resumeGame } = useGame();
  const { user } = useAuth();
  const gameLoopRef = useRef<number>();
  const lastDropTime = useRef<number>(0);
  
  const gameState = useGameState();
  
  const gameLogic = useGameLogic({
    ...gameState,
    mode
  });

  const LOCK_DELAY_TIME = 500;

  const togglePause = useCallback(() => {
    if (gameState.paused) {
      gameState.setPaused(false);
      resumeGame();
    } else {
      gameState.setPaused(true);
      pauseGame();
    }
  }, [gameState.paused, gameState.setPaused, pauseGame, resumeGame]);

  const handleShare = () => {
    const url = window.location.href;
    const text = `我在方块竞技场获得了 ${gameState.score.toLocaleString()} 分！消除了 ${gameState.lines} 行，攻击力 ${gameState.totalAttack}！一起来挑战吧！`;
    
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
    gameState.resetGameState();
    lastDropTime.current = 0;
    setTimeout(() => gameLogic.spawnNewPiece(), 100);
    resetGame();
  };

  const handleBackToMenu = useCallback(() => {
    if (onBackToMenu) {
      onBackToMenu();
    }
  }, [onBackToMenu]);

  const keyboardControls = useKeyboardControls({
    gameSettings,
    gameOver: gameState.gameOver,
    paused: gameState.paused,
    onMoveLeft: () => gameLogic.movePiece(-1, 0),
    onMoveRight: () => gameLogic.movePiece(1, 0),
    onSoftDrop: () => {
      const moved = gameLogic.movePiece(0, 1);
      if (moved) gameState.setScore(prev => prev + 1);
    },
    onHardDrop: gameLogic.hardDrop,
    onRotateClockwise: gameLogic.rotatePieceClockwise,
    onRotateCounterclockwise: gameLogic.rotatePieceCounterclockwise,
    onHold: gameLogic.holdCurrentPiece,
    onPause: togglePause,
    onBackToMenu: handleBackToMenu
  });

  const gameLoop = useCallback((timestamp: number) => {
    if (gameState.gameOver) return;

    if (!gameState.paused) {
      keyboardControls.processHeldKeys(timestamp);

      const dropSpeed = Math.max(50, 1000 - (gameState.level - 1) * 50);
      if (timestamp - lastDropTime.current > dropSpeed) {
        const moved = gameLogic.movePiece(0, 1);
        if (!moved && gameState.lockDelay) {
          if (timestamp - gameLogic.lockDelayTime > LOCK_DELAY_TIME) {
            gameLogic.lockPiece();
          }
        }
        lastDropTime.current = timestamp;
      } else if (gameState.lockDelay) {
        if (timestamp - gameLogic.lockDelayTime > LOCK_DELAY_TIME) {
          gameLogic.lockPiece();
        }
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    gameState.gameOver, gameState.paused, gameState.level, gameState.lockDelay,
    keyboardControls.processHeldKeys, gameLogic.movePiece, gameLogic.lockPiece, gameLogic.lockDelayTime
  ]);

  useEffect(() => {
    if (!gameState.currentPiece && gameState.nextPieces.length > 0) {
      setTimeout(() => gameLogic.spawnNewPiece(), 100);
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop, gameState.currentPiece, gameState.nextPieces, gameLogic.spawnNewPiece]);

  return (
    <div className="flex gap-4 p-4 justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {mode === 'single' && (
        <div className="flex gap-6 items-center justify-center w-full">
          {/* 左侧广告位 */}
          <AdSpace position="left" width={240} height={600} />

          <div className="flex gap-6">
            {/* 左侧信息面板 */}
            <div className="flex flex-col gap-4">
              <PiecePreview piece={gameState.holdPiece} title="HOLD" size="medium" />
              
              <GameStatusIndicators 
                combo={gameState.combo}
                b2b={gameState.b2b}
                totalAttack={gameState.totalAttack}
              />
            </div>

            {/* 主游戏区域 */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-700">
              <GameInfo
                username={user?.username || '游客'}
                score={gameState.score}
                lines={gameState.lines}
                level={gameState.level}
                pieces={gameState.pieces}
                pps={gameState.pps}
                attack={gameState.apm}
                paused={gameState.paused}
                onPause={togglePause}
                onShare={handleShare}
                mode="single"
                combo={gameState.combo >= 0 ? gameState.combo : undefined}
              />
              
              <div className="relative">
                <GameBoard
                  board={gameState.board}
                  currentPiece={gameState.currentPiece}
                  ghostPiece={gameState.ghostPiece}
                  enableGhost={gameSettings.enableGhost}
                  cellSize={30}
                />
                
                <GameOverlay
                  paused={gameState.paused}
                  gameOver={gameState.gameOver}
                  score={gameState.score}
                  lines={gameState.lines}
                  totalAttack={gameState.totalAttack}
                  pps={gameState.pps}
                  apm={gameState.apm}
                  onReset={handleReset}
                  onBackToMenu={handleBackToMenu}
                />
              </div>
            </div>

            {/* 右侧NEXT面板 */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
              <h3 className="text-white text-sm mb-3 text-center font-bold">NEXT</h3>
              <div className="space-y-3">
                {gameState.nextPieces.slice(0, 4).map((piece, index) => (
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
          <AdSpace position="right" width={240} height={600} />

          {/* 游戏中的动态广告 */}
          <AdSpace position="left" width={200} height={100} gameContext={true} />
        </div>
      )}

      {mode === 'multi' && (
        <div className="flex gap-8 w-full max-w-7xl justify-center">
          {/* 玩家1区域 */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <PiecePreview piece={gameState.holdPiece} title="HOLD" size="small" />
              {gameState.combo >= 0 && (
                <div className="bg-yellow-600 p-1 rounded text-white text-center text-xs font-bold">
                  {gameState.combo + 1}x
                </div>
              )}
              {gameState.b2b > 0 && (
                <div className="bg-red-600 p-1 rounded text-white text-center text-xs font-bold">
                  B2B x{gameState.b2b}
                </div>
              )}
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg relative shadow-xl">
              <GameInfo
                username={user?.username || 'Player 1'}
                score={gameState.score}
                lines={gameState.lines}
                level={gameState.level}
                pieces={gameState.pieces}
                pps={gameState.pps}
                attack={gameState.apm}
                paused={gameState.paused}
                onPause={togglePause}
                onShare={handleShare}
                mode="multi"
                rank="B+"
              />
              
              <GameBoard
                board={gameState.board}
                currentPiece={gameState.currentPiece}
                ghostPiece={gameState.ghostPiece}
                enableGhost={gameSettings.enableGhost}
                cellSize={25}
              />
              
              <GameOverlay
                paused={gameState.paused}
                gameOver={gameState.gameOver}
                score={gameState.score}
                lines={gameState.lines}
                totalAttack={gameState.totalAttack}
                pps={gameState.pps}
                apm={gameState.apm}
                onReset={handleReset}
              />
            </div>
            
            <div className="space-y-2">
              {gameState.nextPieces.slice(0, 3).map((piece, index) => (
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

          {/* 玩家 2 区域（对手） */}
          <div className="flex gap-4">
            <div className="space-y-2">
              {gameState.nextPieces.slice(0, 3).map((piece, index) => (
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
