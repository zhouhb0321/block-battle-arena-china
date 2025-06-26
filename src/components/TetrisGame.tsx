
import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import GameController from './game/GameController';
import SinglePlayerGameArea from './game/SinglePlayerGameArea';
import MultiPlayerGameArea from './game/MultiPlayerGameArea';

interface TetrisGameProps {
  mode: 'single' | 'multi';
  gameType?: 'sprint40' | 'ultra2min' | 'endless';
  onBackToMenu?: () => void;
}

const TetrisGame: React.FC<TetrisGameProps> = ({ mode, gameType = 'endless', onBackToMenu }) => {
  const { gameSettings, resetGame, pauseGame, resumeGame } = useGame();
  const { user } = useAuth();

  const handleShare = () => {
    const url = window.location.href;
    const text = `我在方块竞技场获得了高分！一起来挑战吧！`;
    
    if (navigator.share) {
      navigator.share({
        title: '方块竞技场',
        text: text,
        url: url
      });
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success('分享链接已复制到剪贴板');
    }
  };

  const handleBackToMenu = () => {
    console.log('TetrisGame handleBackToMenu called');
    if (onBackToMenu) {
      onBackToMenu();
    } else {
      // 如果没有提供回调，默认返回首页
      window.location.href = '/';
    }
  };

  return (
    <div className="flex gap-4 p-4 justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <GameController
        gameSettings={gameSettings}
        mode={mode}
        onBackToMenu={handleBackToMenu}
        resetGame={resetGame}
        pauseGame={pauseGame}
        resumeGame={resumeGame}
      >
        {({ gameState, onTogglePause, onReset }) => {
          // Convert gameState to proper GameState format
          const convertedGameState = {
            board: gameState.board,
            currentPiece: gameState.currentPiece,
            nextPieces: gameState.nextPieces,
            holdPiece: gameState.holdPiece,
            score: gameState.score,
            lines: gameState.lines,
            level: gameState.level,
            gameOver: gameState.gameOver,
            paused: gameState.paused,
            canHold: gameState.canHold,
            combo: gameState.combo,
            b2b: gameState.b2b,
            pieces: gameState.pieces,
            startTime: gameState.startTime,
            clearingLines: [],
            ghostPiece: gameState.ghostPiece,
            attack: gameState.attack || gameState.totalAttack,
            pps: gameState.pps,
            apm: gameState.apm
          };

          return (
            <>
              {mode === 'single' && (
                <SinglePlayerGameArea
                  gameState={convertedGameState}
                  gameSettings={gameSettings}
                  username={user?.username || '游客'}
                  onPause={onTogglePause}
                  onShare={handleShare}
                  onReset={onReset}
                  onBackToMenu={handleBackToMenu}
                />
              )}

              {mode === 'multi' && (
                <MultiPlayerGameArea
                  gameState={convertedGameState}
                  gameSettings={gameSettings}
                  username={user?.username || '玩家1'}
                  onPause={onTogglePause}
                  onShare={handleShare}
                  onReset={onReset}
                  onBackToMenu={handleBackToMenu}
                />
              )}
            </>
          );
        }}
      </GameController>
    </div>
  );
};

export default TetrisGame;
