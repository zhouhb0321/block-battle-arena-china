
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
    setGameStarted(true); // 直接开始游戏
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
        gameStarted={gameStarted}
        onBackToMenu={handleBackToMenu}
        onUndo={() => console.log('Undo not implemented')}
        onRedo={() => console.log('Redo not implemented')}
        canUndo={false}
        canRedo={false}
      />
      
      <SinglePlayerGameArea
        gameMode={gameMode}
        gameStarted={gameStarted}
        onGameEnd={(stats) => {
          console.log('Game ended with stats:', stats);
          handleBackToMenu();
        }}
      />
      
      <OutOfFocusOverlay 
        show={gameLogic.gameState.isPaused && gameStarted && !gameLogic.gameState.gameOver} 
      />
    </div>
  );
};

const TetrisGame: React.FC<TetrisGameProps> = (props) => {
  // Default to 40L mode for quick start
  const defaultGameMode = GAME_MODES.find(mode => mode.id === 'sprint40') || GAME_MODES[0];
  
  // 如果没有传入gameConfig，创建一个默认配置直接启动40L模式
  const gameConfigWithDefault = props.gameConfig || { gameMode: defaultGameMode };

  return (
    <TetrisGameProvider gameMode={defaultGameMode}>
      <TetrisGameContent {...props} gameConfig={gameConfigWithDefault} />
    </TetrisGameProvider>
  );
};

export default TetrisGame;
