
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import GameModeSelector from './GameModeSelector';
import SinglePlayerGameArea from './game/SinglePlayerGameArea';
import MultiPlayerGameArea from './game/MultiPlayerGameArea';
import GameCountdown from './GameCountdown';
import type { GameMode, GameSettings } from '@/utils/gameTypes';

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
    musicVolume: settings.musicVolume || 30
  };

  const calculateDropSpeed = useCallback((lines: number): number => {
    const baseSpeed = 1000;
    const level = Math.min(Math.floor(lines / 40), 4);
    const speedMultiplier = Math.pow(1.5, level);
    return Math.max(baseSpeed / speedMultiplier, 50);
  }, []);

  const gameLogic = useGameLogic(gameMode?.id || 'endless', gameSettings, calculateDropSpeed);
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
      
      {gameMode?.id === 'versus' ? (
        <MultiPlayerGameArea
          gameState={gameLogic.gameState}
          gameSettings={gameSettings}
          username={user?.username || t('common.guest')}
          onPause={gameLogic.pauseGame}
          onShare={gameLogic.shareGame}
          onReset={handleReset}
          onBackToMenu={handleBackToMenu}
          opponentState={gameLogic.gameState}
          opponentUsername="对手"
          showCountdown={showCountdown}
          onCountdownEnd={handleCountdownEnd}
        />
      ) : (
        <SinglePlayerGameArea
          gameState={gameLogic.gameState}
          gameSettings={gameSettings}
          username={user?.username || t('common.guest')}
          onPause={gameLogic.pauseGame}
          onShare={gameLogic.shareGame}
          onReset={handleReset}
          onBackToMenu={handleBackToMenu}
          showCountdown={showCountdown}
          onCountdownEnd={handleCountdownEnd}
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
