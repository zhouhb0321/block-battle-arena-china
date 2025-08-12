import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TetrisGameProvider, useTetrisGame } from './game/TetrisGameProvider';
import { GameModeHandler } from './game/GameModeHandler';
import { GameKeyboardHandler } from './game/GameKeyboardHandler';
import SinglePlayerGameArea from './game/SinglePlayerGameArea';
import OutOfFocusOverlay from './OutOfFocusOverlay';
import { GAME_MODES, type GameMode } from '@/utils/gameTypes';

interface TetrisGameProps {
  onBackToMenu: () => void;
  gameConfig?: any;
}

const TetrisGameContent: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
  const { gameLogic } = useTetrisGame();
  const [actualGameStarted, setActualGameStarted] = useState(false);

  return (
    <div 
      className="w-full h-full relative bg-gray-900" 
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <GameKeyboardHandler
        gameStarted={true}
        onBackToMenu={onBackToMenu}
        onUndo={gameLogic.undo}
        onRedo={gameLogic.redo}
        canUndo={gameLogic.canUndo}
        canRedo={gameLogic.canRedo}
      />
      
      <SinglePlayerGameArea
        onActualGameStart={() => setActualGameStarted(true)}
      />
      
      <OutOfFocusOverlay 
        show={gameLogic.isPaused && !gameLogic.gameOver}
      />
    </div>
  );
};

const TetrisGame: React.FC<TetrisGameProps> = ({ onBackToMenu, gameConfig }) => {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameId, setGameId] = useState(1);

  const handleModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    setGameId(id => id + 1); // Also increment gameId to ensure a fresh game state
  };

  const handleBackToMenu = () => {
    setGameMode(null);
    onBackToMenu();
  };

  const handleRestart = () => {
    setGameId(id => id + 1);
  };

  if (!gameMode) {
    return (
      <GameModeHandler
        gameConfig={gameConfig}
        onModeReady={handleModeSelect}
        onBackToMenu={onBackToMenu}
      />
    );
  }

  return (
    <TetrisGameProvider
      key={gameId}
      gameMode={gameMode}
      onBackToMenu={handleBackToMenu}
      onRestart={handleRestart}
    >
      <TetrisGameContent onBackToMenu={handleBackToMenu} />
    </TetrisGameProvider>
  );
};

export default TetrisGame;
