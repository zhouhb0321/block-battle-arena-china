
import React, { useRef, useState, useEffect } from 'react';
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

const TetrisGameContent: React.FC<TetrisGameProps> = ({ onBackToMenu, gameConfig }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { gameLogic, gameSettings } = useTetrisGame();
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const handleModeReady = (mode: GameMode) => {
    console.log('Game mode ready:', mode);
    setGameMode(mode);
    setGameStarted(true);
    gameLogic.startGame();
  };

  const handleBackToMenu = () => {
    console.log('Back to menu called');
    gameLogic.resetGame();
    setGameStarted(false);
    setGameMode(null);
    onBackToMenu();
  };

  const handleReset = () => {
    console.log('Reset called');
    gameLogic.resetGame();
    setGameStarted(false);
  };

  const handleTimeUp = () => {
    console.log('Time up!');
    gameLogic.pauseGame();
  };

  // 180度旋转功能
  const rotate180 = () => {
    if (gameLogic.rotatePiece180) {
      gameLogic.rotatePiece180();
    }
  };

  useEffect(() => {
    if (gameContainerRef.current && gameStarted) {
      gameContainerRef.current.focus();
    }
  }, [gameStarted]);

  if (!gameMode || !gameStarted) {
    return (
      <GameModeHandler
        gameConfig={gameConfig}
        onModeReady={handleModeReady}
        onBackToMenu={handleBackToMenu}
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
      <GameKeyboardHandler
        gameStarted={gameStarted}
        onBackToMenu={handleBackToMenu}
        onUndo={gameLogic.undoMove}
        onRedo={gameLogic.redoMove}
        canUndo={gameLogic.canUndo}
        canRedo={gameLogic.canRedo}
      />
      
      <SinglePlayerGameArea
        gameState={gameLogic.gameState}
        gameSettings={gameSettings}
        username={user?.username || 'Player'}
        onPause={gameLogic.pauseGame}
        onShare={() => console.log('Share game')}
        onReset={handleReset}
        onBackToMenu={handleBackToMenu}
        showCountdown={!gameStarted}
        onCountdownEnd={() => setGameStarted(true)}
        gameStarted={gameStarted}
        onMoveLeft={() => gameLogic.movePiece(-1, 0)}
        onMoveRight={() => gameLogic.movePiece(1, 0)}
        onSoftDrop={() => gameLogic.movePiece(0, 1)}
        onHardDrop={gameLogic.hardDrop}
        onRotateClockwise={gameLogic.rotatePieceClockwise}
        onRotateCounterclockwise={gameLogic.rotatePieceCounterclockwise}
        onRotate180={rotate180}
        onHold={gameLogic.holdCurrentPiece}
      />
      
      {/* 简化的失焦覆盖层 - 只有在暂停且游戏进行中时显示 */}
      <OutOfFocusOverlay 
        show={gameLogic.gameState.paused && gameStarted && !gameLogic.gameState.gameOver} 
      />
    </div>
  );
};

const TetrisGame: React.FC<TetrisGameProps> = (props) => {
  // Find the default game mode or use the first one
  const defaultGameMode = GAME_MODES.find(mode => mode.id === 'endless') || GAME_MODES[0];

  return (
    <TetrisGameProvider gameMode={defaultGameMode}>
      <TetrisGameContent {...props} />
    </TetrisGameProvider>
  );
};

export default TetrisGame;
