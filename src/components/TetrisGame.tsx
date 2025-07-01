
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import GameModeSelector from './GameModeSelector';
import EnhancedGameArea from './EnhancedGameArea';
import GameCountdown from './GameCountdown';
import { GAME_MODES, type GameMode, type GameSettings } from '@/utils/gameTypes';

interface TetrisGameProps {
  onBackToMenu: () => void;
}

const TetrisGame: React.FC<TetrisGameProps> = ({ onBackToMenu }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useUserSettings();
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const gameSettings: GameSettings = {
    enableGhost: settings.enableGhost,
    enableSound: settings.enableSound,
    masterVolume: settings.masterVolume,
    arr: settings.arr,
    das: settings.das,
    sdf: settings.sdf,
    controls: settings.controls,
    backgroundMusic: settings.backgroundMusic || '',
    musicVolume: settings.musicVolume || 30,
    ghostOpacity: settings.ghostOpacity || 50
  };

  const calculateDropSpeed = useCallback((lines: number): number => {
    const baseSpeed = 1000;
    const level = Math.min(Math.floor(lines / 40), 4);
    const speedMultiplier = Math.pow(1.5, level);
    return Math.max(baseSpeed / speedMultiplier, 50);
  }, []);

  // Find the default game mode or use the first one
  const defaultGameMode = GAME_MODES.find(mode => mode.id === 'endless') || GAME_MODES[0];
  const gameLogic = useGameLogic(gameMode || defaultGameMode, gameSettings, calculateDropSpeed);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // 180度旋转功能
  const rotate180 = useCallback(() => {
    if (gameLogic.rotatePieceClockwise) {
      gameLogic.rotatePieceClockwise();
      setTimeout(() => gameLogic.rotatePieceClockwise(), 50);
    }
  }, [gameLogic]);

  const keyboardControls = useKeyboardControls({
    gameSettings,
    gameOver: gameLogic.gameState.gameOver,
    paused: gameLogic.gameState.paused,
    onMoveLeft: () => gameLogic.movePiece(-1, 0),
    onMoveRight: () => gameLogic.movePiece(1, 0),
    onSoftDrop: () => {
      const moved = gameLogic.movePiece(0, 1);
      if (moved) {
        // Add soft drop points
      }
    },
    onHardDrop: gameLogic.hardDrop,
    onRotateClockwise: gameLogic.rotatePieceClockwise,
    onRotateCounterclockwise: gameLogic.rotatePieceCounterclockwise,
    onHold: gameLogic.holdCurrentPiece,
    onPause: gameLogic.pauseGame,
    onBackToMenu: onBackToMenu
  });

  const handleModeSelect = (mode: GameMode) => {
    console.log('Mode selected:', mode);
    setGameMode(mode);
    setShowModeSelector(false);
    setShowCountdown(true);
  };

  const handleCountdownEnd = () => {
    console.log('Countdown ended, starting game...');
    setShowCountdown(false);
    setGameStarted(true);
    gameLogic.startGame();
  };

  const handleBackToMenu = () => {
    console.log('Back to menu called');
    gameLogic.resetGame();
    setGameStarted(false);
    setShowCountdown(false);
    setShowModeSelector(true);
    onBackToMenu();
  };

  const handleReset = () => {
    console.log('Reset called');
    gameLogic.resetGame();
    setGameStarted(false);
    setShowCountdown(true);
  };

  const handleTimeUp = () => {
    console.log('Time up!');
    gameLogic.pauseGame();
  };

  useEffect(() => {
    if (gameContainerRef.current && gameStarted) {
      gameContainerRef.current.focus();
    }
  }, [gameStarted]);

  if (showModeSelector) {
    return (
      <GameModeSelector
        onModeSelect={handleModeSelect}
        onBack={handleBackToMenu}
      />
    );
  }

  return (
    <div 
      ref={gameContainerRef} 
      className="w-full h-full relative" 
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {showCountdown && (
        <GameCountdown
          show={showCountdown}
          onCountdownEnd={handleCountdownEnd}
        />
      )}
      
      {/* 游戏控制按钮 */}
      <div className="flex justify-center gap-4 mb-6">
        <Button
          onClick={gameLogic.pauseGame}
          disabled={gameLogic.gameState.gameOver}
          variant={gameLogic.gameState.paused ? "default" : "outline"}
        >
          {gameLogic.gameState.paused ? '继续' : '暂停'}
        </Button>
        <Button onClick={handleReset} variant="outline">
          重新开始
        </Button>
        <Button onClick={handleBackToMenu} variant="outline">
          返回菜单
        </Button>
      </div>

      {/* 游戏状态提示 */}
      {gameLogic.gameState.gameOver && (
        <div className="text-center mb-4 p-4 bg-red-600 text-white rounded-lg">
          <h3 className="text-xl font-bold">游戏结束</h3>
          <p>最终得分: {gameLogic.gameState.score.toLocaleString()}</p>
        </div>
      )}

      {gameLogic.gameState.paused && !gameLogic.gameState.gameOver && (
        <div className="text-center mb-4 p-4 bg-yellow-600 text-white rounded-lg">
          <h3 className="text-xl font-bold">游戏暂停</h3>
          <p>按继续按钮或 P 键恢复游戏</p>
        </div>
      )}

      {/* 增强的游戏区域 */}
      {gameMode && (
        <EnhancedGameArea
          gameState={gameLogic.gameState}
          gameSettings={gameSettings}
          gameMode={gameMode}
          onTimeUp={handleTimeUp}
          gameStarted={gameStarted}
        />
      )}
    </div>
  );
};

export default TetrisGame;
