
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

  const {
    gameState,
    startGame,
    pauseGame,
    resetGame,
    shareGame
  } = useGameLogic(gameMode, gameSettings, calculateDropSpeed);

  const gameContainerRef = useRef<HTMLDivElement>(null);

  useKeyboardControls(
    gameState,
    gameSettings.controls,
    gameContainerRef,
    gameStarted && !gameState.paused && !gameState.gameOver
  );

  const handleModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    setShowModeSelector(false);
    setShowCountdown(true);
  };

  const handleCountdownEnd = () => {
    setShowCountdown(false);
    setGameStarted(true);
    startGame(); // 确保在倒计时结束后开始游戏
  };

  const handleBackToMenu = () => {
    resetGame();
    setGameStarted(false);
    setShowModeSelector(true);
    onBackToMenu();
  };

  const handleReset = () => {
    resetGame();
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
          gameState={gameState}
          gameSettings={gameSettings}
          username={user?.username || t('common.guest')}
          onPause={pauseGame}
          onShare={shareGame}
          onReset={handleReset}
          onBackToMenu={handleBackToMenu}
          opponentState={gameState}
          opponentUsername="对手"
          showCountdown={showCountdown}
          onCountdownEnd={handleCountdownEnd}
        />
      ) : (
        <SinglePlayerGameArea
          gameState={gameState}
          gameSettings={gameSettings}
          username={user?.username || t('common.guest')}
          onPause={pauseGame}
          onShare={shareGame}
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
