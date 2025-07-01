
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import GameModeSelector from './GameModeSelector';
import SinglePlayerGameArea from './game/SinglePlayerGameArea';
import GameCountdown from './GameCountdown';
import { GAME_MODES, type GameMode, type GameSettings } from '@/utils/gameTypes';

interface TetrisGameProps {
  onBackToMenu: () => void;
  gameConfig?: any;
}

const TetrisGame: React.FC<TetrisGameProps> = ({ onBackToMenu, gameConfig }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useUserSettings();
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(!gameConfig);
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Use gameConfig if provided, otherwise show mode selector
  useEffect(() => {
    if (gameConfig && gameConfig.gameMode) {
      console.log('Setting game mode from config:', gameConfig.gameMode);
      setGameMode(gameConfig.gameMode);
      setShowModeSelector(false);
      setShowCountdown(true);
    }
  }, [gameConfig]);

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
      className="w-full h-full relative bg-gray-900" 
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {showCountdown && (
        <div className="fixed inset-0 z-50">
          <GameCountdown
            show={showCountdown}
            onCountdownEnd={handleCountdownEnd}
          />
        </div>
      )}
      
      {gameMode && gameStarted && (
        <SinglePlayerGameArea
          gameState={gameLogic.gameState}
          gameSettings={gameSettings}
          username={user?.email || 'Player'}
          onPause={gameLogic.pauseGame}
          onShare={() => console.log('Share game')}
          onReset={handleReset}
          onBackToMenu={handleBackToMenu}
          showCountdown={false}
          onCountdownEnd={() => {}}
          onMoveLeft={() => gameLogic.movePiece(-1, 0)}
          onMoveRight={() => gameLogic.movePiece(1, 0)}
          onSoftDrop={() => gameLogic.movePiece(0, 1)}
          onHardDrop={gameLogic.hardDrop}
          onRotateClockwise={gameLogic.rotatePieceClockwise}
          onRotateCounterclockwise={gameLogic.rotatePieceCounterclockwise}
          onRotate180={rotate180}
          onHold={gameLogic.holdCurrentPiece}
        />
      )}
    </div>
  );
};

export default TetrisGame;
