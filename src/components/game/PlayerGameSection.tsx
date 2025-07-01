
import React from 'react';
import GameBoard from '../GameBoard';
import GameInfo from '../GameInfo';
import PiecePreview from '../PiecePreview';
import GameStatusIndicators from '../GameStatusIndicators';
import GameOverlay from '../GameOverlay';
import type { GameState, GameSettings } from '@/utils/gameTypes';

interface PlayerGameSectionProps {
  gameState: GameState;
  gameSettings: GameSettings;
  username: string;
  onPause: () => void;
  onShare: () => void;
  onReset?: () => void;
  onBackToMenu?: () => void;
  gameStarted: boolean;
  cellSize: number;
  showOverlay?: boolean;
}

const PlayerGameSection: React.FC<PlayerGameSectionProps> = ({
  gameState,
  gameSettings,
  username,
  onPause,
  onShare,
  onReset,
  onBackToMenu,
  gameStarted,
  cellSize,
  showOverlay = false
}) => {
  return (
    <div className="flex gap-4 items-start">
      {/* HOLD面板 */}
      <div className="flex flex-col gap-4">
        <PiecePreview 
          piece={gameState.holdPiece?.type || null} 
          title="HOLD" 
          cellSize={cellSize}
        />
        
        <GameStatusIndicators 
          combo={gameState.combo || -1}
          b2b={gameState.b2b || 0}
          totalAttack={gameState.attack || 0}
        />
      </div>

      {/* 主游戏区域 */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-700 relative">
        <GameInfo
          username={username}
          score={gameState.score}
          lines={gameState.lines}
          level={gameState.level}
          pieces={gameState.pieces || 0}
          pps={gameState.pps || 0}
          attack={gameState.apm || 0}
          paused={gameState.paused}
          onPause={onPause}
          onShare={onShare}
          mode="multi"
          combo={gameState.combo && gameState.combo >= 0 ? gameState.combo : undefined}
          gameStarted={gameStarted}
        />
        
        <div className="relative">
          <GameBoard
            board={gameState.board}
            currentPiece={gameState.currentPiece}
            ghostPiece={gameState.ghostPiece}
            enableGhost={gameSettings.enableGhost}
            cellSize={cellSize}
          />
          
          {showOverlay && (
            <GameOverlay
              paused={gameState.paused}
              gameOver={gameState.gameOver}
              score={gameState.score}
              lines={gameState.lines}
              totalAttack={gameState.attack || 0}
              pps={gameState.pps || 0}
              apm={gameState.apm || 0}
              onReset={onReset || (() => {})}
              onBackToMenu={onBackToMenu || (() => {})}
            />
          )}
        </div>
      </div>

      {/* NEXT面板 */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <h3 className="text-white text-sm mb-3 text-center font-bold">NEXT</h3>
        <div className="space-y-3">
          {gameState.nextPieces.slice(0, 4).map((piece, index) => (
            <PiecePreview 
              key={index} 
              piece={piece.type} 
              title=""
              cellSize={cellSize}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerGameSection;
