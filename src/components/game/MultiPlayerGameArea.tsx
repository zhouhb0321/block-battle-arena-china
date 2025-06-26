
import React from 'react';
import GameBoard from '../GameBoard';
import GameInfo from '../GameInfo';
import PiecePreview from '../PiecePreview';
import GameOverlay from '../GameOverlay';
import type { GameState, GameSettings } from '@/utils/gameTypes';

interface MultiPlayerGameAreaProps {
  gameState: GameState;
  gameSettings: GameSettings;
  username: string;
  onPause: () => void;
  onShare: () => void;
  onReset: () => void;
}

const MultiPlayerGameArea: React.FC<MultiPlayerGameAreaProps> = ({
  gameState,
  gameSettings,
  username,
  onPause,
  onShare,
  onReset
}) => {
  return (
    <div className="flex gap-8 w-full max-w-7xl justify-center">
      {/* 玩家1区域 */}
      <div className="flex gap-4">
        <div className="flex flex-col gap-2">
          <PiecePreview 
            piece={gameState.holdPiece?.type || null} 
            title="HOLD" 
            size="small" 
          />
          {gameState.combo && gameState.combo >= 0 && (
            <div className="bg-yellow-600 p-1 rounded text-white text-center text-xs font-bold">
              {gameState.combo + 1}x
            </div>
          )}
          {gameState.b2b && gameState.b2b > 0 && (
            <div className="bg-red-600 p-1 rounded text-white text-center text-xs font-bold">
              B2B x{gameState.b2b}
            </div>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg relative shadow-xl">
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
            rank="B+"
          />
          
          <GameBoard
            board={gameState.board}
            currentPiece={gameState.currentPiece}
            ghostPiece={gameState.ghostPiece}
            enableGhost={gameSettings.enableGhost}
            cellSize={25}
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
          />
        </div>
        
        <div className="space-y-2">
          {gameState.nextPieces.slice(0, 3).map((piece, index) => (
            <PiecePreview 
              key={index} 
              piece={piece.type} 
              title="" 
              size="small" 
            />
          ))}
        </div>
      </div>

      {/* 中央VS区域 */}
      <div className="flex flex-col items-center justify-center text-white min-w-[200px]">
        <div className="text-4xl font-bold mb-6 bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
          VS
        </div>
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">方块联盟</div>
          <div className="text-sm text-gray-400">排位匹配</div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="text-xs text-gray-400">当前排位</div>
            <div className="text-lg font-bold text-blue-400">B+</div>
          </div>
          <div className="text-xs text-gray-500">等待匹配...</div>
        </div>
      </div>

      {/* 玩家 2 区域（对手） */}
      <div className="flex gap-4">
        <div className="space-y-2">
          {Array(3).fill(null).map((_, index) => (
            <PiecePreview key={index} piece={null} title="" size="small" />
          ))}
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg relative shadow-xl opacity-75">
          <GameInfo
            username="等待对手..."
            score={0}
            lines={0}
            level={1}
            pieces={0}
            pps={0}
            attack={0}
            paused={false}
            onPause={() => {}}
            onShare={() => {}}
            mode="multi"
            rank="B"
          />
          
          <GameBoard
            board={Array(20).fill(null).map(() => Array(10).fill(0))}
            currentPiece={null}
            enableGhost={false}
            cellSize={25}
          />
          
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="text-white text-center">
              <div className="animate-pulse text-lg">寻找对手中...</div>
              <div className="text-sm text-gray-400 mt-2">预计等待时间: 30秒</div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <PiecePreview piece={null} title="HOLD" size="small" />
        </div>
      </div>
    </div>
  );
};

export default MultiPlayerGameArea;
