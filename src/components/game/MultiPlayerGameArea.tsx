
import React from 'react';
import { Button } from '@/components/ui/button';
import GameBoard from '../GameBoard';
import GameInfo from '../GameInfo';
import PiecePreview from '../PiecePreview';
import GameOverlay from '../GameOverlay';
import GameStatusIndicators from '../GameStatusIndicators';
import GameCountdown from '../GameCountdown';
import AdSpace from '../AdSpace';
import type { GameState, GameSettings } from '@/utils/gameTypes';

interface MultiPlayerGameAreaProps {
  gameState: GameState;
  gameSettings: GameSettings;
  username: string;
  onPause: () => void;
  onShare: () => void;
  onReset: () => void;
  onBackToMenu: () => void;
  showCountdown?: boolean;
  onCountdownEnd?: () => void;
}

const MultiPlayerGameArea: React.FC<MultiPlayerGameAreaProps> = ({
  gameState,
  gameSettings,
  username,
  onPause,
  onShare,
  onReset,
  onBackToMenu,
  showCountdown = false,
  onCountdownEnd = () => {}
}) => {
  return (
    <div className="flex gap-6 items-center justify-center w-full">
      {/* 左侧广告位 */}
      <AdSpace position="left" width={240} height={600} />

      {/* 主游戏区域 */}
      <div className="flex gap-6">
        {/* 玩家1区域 */}
        <div className="flex gap-4 items-start">
          {/* 左侧信息面板 */}
          <div className="flex flex-col gap-4">
            <PiecePreview 
              piece={gameState.holdPiece?.type || null} 
              title="HOLD" 
              size="small" 
            />
            
            <GameStatusIndicators 
              combo={gameState.combo || -1}
              b2b={gameState.b2b || 0}
              totalAttack={gameState.attack || 0}
            />

            {/* 返回菜单按钮 */}
            <Button 
              onClick={onBackToMenu}
              variant="outline"
              size="sm"
              className="w-full bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
            >
              返回菜单
            </Button>
          </div>

          {/* 游戏板 */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 relative">
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
            />
            
            <div className="relative">
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
                onBackToMenu={onBackToMenu}
              />

              {/* 倒计时覆盖层 */}
              <GameCountdown show={showCountdown} onCountdownEnd={onCountdownEnd} />
            </div>
          </div>

          {/* 右侧NEXT面板 - 显示4个方块 */}
          <div className="bg-gray-800 p-3 rounded-lg shadow-lg">
            <h3 className="text-white text-xs mb-2 text-center font-bold">NEXT</h3>
            <div className="space-y-2">
              {gameState.nextPieces.slice(0, 4).map((piece, index) => (
                <PiecePreview 
                  key={index} 
                  piece={piece.type} 
                  title="" 
                  size="small" 
                />
              ))}
            </div>
          </div>
        </div>

        {/* 对手区域 (占位符) */}
        <div className="flex gap-4 opacity-50 items-start">
          <div className="flex flex-col gap-4">
            <PiecePreview 
              piece={null} 
              title="HOLD" 
              size="small" 
            />
          </div>

          <div className="bg-gray-700 p-4 rounded-lg shadow-lg border border-gray-600 relative">
            <div className="text-white text-center mb-2 text-sm">对手</div>
            <div className="w-64 h-80 bg-gray-600 rounded border-2 border-gray-500 flex items-center justify-center">
              <span className="text-gray-400 text-sm">等待对手...</span>
            </div>
          </div>

          <div className="bg-gray-700 p-3 rounded-lg shadow-lg">
            <h3 className="text-gray-400 text-xs mb-2 text-center font-bold">NEXT</h3>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="w-12 h-8 bg-gray-600 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧广告位 */}
      <AdSpace position="right" width={240} height={600} />
    </div>
  );
};

export default MultiPlayerGameArea;
