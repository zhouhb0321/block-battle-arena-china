
import React from 'react';
import GameBoard from '../GameBoard';
import GameInfo from '../GameInfo';
import PiecePreview from '../PiecePreview';
import GameOverlay from '../GameOverlay';
import GameStatusIndicators from '../GameStatusIndicators';
import AdSpace from '../AdSpace';
import type { GameState, GameSettings } from '@/utils/gameTypes';

interface SinglePlayerGameAreaProps {
  gameState: GameState;
  gameSettings: GameSettings;
  username: string;
  onPause: () => void;
  onShare: () => void;
  onReset: () => void;
  onBackToMenu: () => void;
}

const SinglePlayerGameArea: React.FC<SinglePlayerGameAreaProps> = ({
  gameState,
  gameSettings,
  username,
  onPause,
  onShare,
  onReset,
  onBackToMenu
}) => {
  return (
    <div className="flex gap-6 items-center justify-center w-full">
      {/* 左侧广告位 */}
      <AdSpace position="left" width={240} height={600} />

      <div className="flex gap-6">
        {/* 左侧信息面板 */}
        <div className="flex flex-col gap-4">
          <PiecePreview 
            piece={gameState.holdPiece?.type || null} 
            title="HOLD" 
            size="medium" 
          />
          
          <GameStatusIndicators 
            combo={gameState.combo || -1}
            b2b={gameState.b2b || 0}
            totalAttack={gameState.attack || 0}
          />
        </div>

        {/* 主游戏区域 */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-700">
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
            mode="single"
            combo={gameState.combo && gameState.combo >= 0 ? gameState.combo : undefined}
          />
          
          <div className="relative">
            <GameBoard
              board={gameState.board}
              currentPiece={gameState.currentPiece}
              ghostPiece={gameState.ghostPiece}
              enableGhost={gameSettings.enableGhost}
              cellSize={30}
            />
            
            <GameOverlay
              paused={gameState.paused}
              gameOver={gameState.gameOver}
              score={gameState.score}
              lines={gameState.lines}
              totalAttack={gameState.attack || 0}
              pps={gameState.pps || 0}
              apm={gameState.apm || 0}
              onReset={onReset}
              onBackToMenu={onBackToMenu}
            />
          </div>
        </div>

        {/* 右侧NEXT面板 */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h3 className="text-white text-sm mb-3 text-center font-bold">NEXT</h3>
          <div className="space-y-3">
            {gameState.nextPieces.slice(0, 4).map((piece, index) => (
              <PiecePreview 
                key={index} 
                piece={piece.type} 
                title="" 
                size={index === 0 ? "medium" : "small"} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* 右侧广告位 */}
      <AdSpace position="right" width={240} height={600} />

      {/* 游戏中的动态广告 */}
      <AdSpace position="left" width={200} height={100} gameContext={true} />
    </div>
  );
};

export default SinglePlayerGameArea;
