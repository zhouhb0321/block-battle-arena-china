
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
  const [gameMode, setGameMode] = useState<GameMode>('sprint');
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
    controls: settings.controls
  };

  // 计算下落速度，基于消除行数实现5级速度系统
  const calculateDropSpeed = useCallback((lines: number): number => {
    const baseSpeed = 1000; // 基础速度1秒
    const level = Math.min(Math.floor(lines / 40), 4); // 每40行提升一级，最多5级
    const speedMultiplier = Math.pow(1.5, level); // 1.5的幂次方
    return Math.max(baseSpeed / speedMultiplier, 50); // 最快不超过50ms
  }, []);

  const gameLogic = useGameLogic(gameMode, gameSettings, calculateDropSpeed);

  const gameContainerRef = useRef<HTMLDivElement>(null);

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

  const handleModeSelect = (mode: any) => {
    setGameMode(mode.id as GameMode);
    setShowModeSelector(false);
    setShowCountdown(true);
  };

  const handleCountdownEnd = () => {
    setShowCountdown(false);
    setGameStarted(true);
    gameLogic.startGame();
  };

  const handleBackToMenu = () => {
    gameLogic.resetGame();
    setGameStarted(false);
    setShowModeSelector(true);
    onBackToMenu();
  };

  const handleReset = () => {
    gameLogic.resetGame();
    setGameStarted(false);
    setShowCountdown(true);
  };

  if (showModeSelector) {
    return (
      <GameModeSelector
        onModeSelect={handleModeSelect}
        onBackToMenu={handleBackToMenu}
      />
    );
  }

  return (
    <div ref={gameContainerRef} className="w-full h-full relative" tabIndex={0}>
      {gameMode === 'versus' ? (
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
        />
      )}
    </div>
  );
};

export default TetrisGame;
