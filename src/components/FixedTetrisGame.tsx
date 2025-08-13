import React, { useState, useEffect } from 'react';
import { TetrisGameProvider, useTetrisGame } from './game/TetrisGameProvider';
import { GameModeHandler } from './game/GameModeHandler';
import { GameKeyboardHandler } from './game/GameKeyboardHandler';
import SinglePlayerGameArea from './game/SinglePlayerGameArea';
import OutOfFocusOverlay from './OutOfFocusOverlay';
import { type GameMode } from '@/utils/gameTypes';
import GameOverDialog from './GameOverDialog';

interface FixedTetrisGameProps {
  onBackToMenu: () => void;
  gameConfig?: any;
}

const TetrisGameContent: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
  const { gameLogic, onRestart } = useTetrisGame();
  
  useEffect(() => {
    if (gameLogic.phase === 'gameOver' && gameLogic.isNewRecord) {
      // Potentially show a new record animation or toast
    }
  }, [gameLogic.phase, gameLogic.isNewRecord]);

  return (
    <div
      className="w-full h-full relative bg-gray-900"
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <GameKeyboardHandler
        gameStarted={gameLogic.gameStarted}
        onBackToMenu={onBackToMenu}
        // No undo/redo in fixed game
        onUndo={() => {}}
        onRedo={() => {}}
        canUndo={false}
        canRedo={false}
      />
      
      <SinglePlayerGameArea />
      
      <OutOfFocusOverlay
        show={gameLogic.isPaused && !gameLogic.gameOver}
        onResume={gameLogic.resumeGame}
      />

      <GameOverDialog
        isOpen={gameLogic.phase === 'gameOver'}
        score={gameLogic.score}
        lines={gameLogic.lines}
        level={gameLogic.level}
        time={gameLogic.time}
        gameMode="Game Mode"
        onRestart={onRestart}
        onBackToMenu={onBackToMenu}
        isNewRecord={gameLogic.isNewRecord}
      />
    </div>
  );
};

const FixedTetrisGame: React.FC<FixedTetrisGameProps> = ({ onBackToMenu, gameConfig }) => {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameId, setGameId] = useState(1);

  const handleModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    setGameId(id => id + 1);
  };

  const handleBackToMenu = () => {
    setGameMode(null);
    onBackToMenu();
  };

  const handleRestart = () => {
    setGameId(id => id + 1);
  };
  
  // This effect will ensure that if gameConfig is ever passed, it's used.
  useEffect(() => {
    if (gameConfig?.gameMode && !gameMode) {
      handleModeSelect(gameConfig.gameMode);
    }
  }, [gameConfig, gameMode]);


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

export default FixedTetrisGame;
