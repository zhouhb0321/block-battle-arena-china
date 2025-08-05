
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
  const [actualGameStarted, setActualGameStarted] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // 键盘控制在选择模式后即可激活，无需等待双重条件
  const gameStarted = !!gameMode;

  const handleModeReady = (mode: GameMode) => {
    console.log('Game mode ready:', mode);
    setGameMode(mode);
    // 只设置模式，不启动游戏，游戏将由倒计时完成后启动
  };

  const handleBackToMenu = () => {
    console.log('Back to menu called');
    gameLogic.resetGame();
    setGameMode(null);
    setActualGameStarted(false);
    onBackToMenu();
  };

  const handleReset = () => {
    console.log('Reset called');
    gameLogic.resetGame();
    setActualGameStarted(false);
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

  // 如果还没选择模式，显示模式选择器
  if (!gameMode) {
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
        gameStarted={true}
        onBackToMenu={handleBackToMenu}
        onUndo={gameLogic.undo}
        onRedo={gameLogic.redo}
        canUndo={gameLogic.canUndo}
        canRedo={gameLogic.canRedo}
      />
      
      <SinglePlayerGameArea
        gameMode={gameMode}
        gameStarted={!!gameMode}
        onGameEnd={(stats) => {
          console.log('Game ended with stats:', stats);
          handleBackToMenu();
        }}
        onActualGameStart={() => setActualGameStarted(true)}
      />
      
      <OutOfFocusOverlay 
        show={gameLogic.isPaused && gameStarted && !gameLogic.gameOver} 
      />
    </div>
  );
};

const TetrisGame: React.FC<TetrisGameProps> = (props) => {
  const defaultGameMode = GAME_MODES.find(mode => mode.id === 'endless') || GAME_MODES[0];

  return (
    <TetrisGameProvider gameMode={defaultGameMode}>
      <TetrisGameContent {...props} />
    </TetrisGameProvider>
  );
};

export default TetrisGame;
