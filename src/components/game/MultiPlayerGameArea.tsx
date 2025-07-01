
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
  opponentState: GameState;
  opponentUsername: string;
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
  opponentState,
  opponentUsername,
  onPause,
  onShare,
  onReset,
  onBackToMenu,
  showCountdown = false,
  onCountdownEnd = () => {}
}) => {
  const mainCellSize = 30; // 主游戏板的方块大小
  
  // 判断游戏是否已开始
  const gameStarted = !showCountdown && (gameState.score > 0 || gameState.lines > 0 || gameState.pieces !== undefined);

  return (
    <div className="flex gap-6 items-center justify-center w-full min-h-screen">
      {/* 左侧广告位 */}
      <div className="hidden xl:block">
        <AdSpace position="left" width={240} height={600} />
      </div>

      <div className="flex gap-8 items-start">
        {/* 玩家1游戏区域 */}
        <div className="flex gap-4 items-start">
          {/* 玩家1左侧HOLD面板 */}
          <div className="flex flex-col gap-4">
            <PiecePreview 
              piece={gameState.holdPiece?.type || null} 
              title="HOLD" 
              cellSize={mainCellSize}
            />
            
            <GameStatusIndicators 
              combo={gameState.combo || -1}
              b2b={gameState.b2b || 0}
              totalAttack={gameState.attack || 0}
            />
          </div>

          {/* 玩家1主游戏区域 */}
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
                cellSize={mainCellSize}
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

          {/* 玩家1右侧NEXT面板 */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-white text-sm mb-3 text-center font-bold">NEXT</h3>
            <div className="space-y-3">
              {gameState.nextPieces.slice(0, 4).map((piece, index) => (
                <PiecePreview 
                  key={index} 
                  piece={piece.type} 
                  title=""
                  cellSize={mainCellSize}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 玩家2游戏区域 */}
        <div className="flex gap-4 items-start">
          {/* 玩家2左侧HOLD面板 */}
          <div className="flex flex-col gap-4">
            <PiecePreview 
              piece={opponentState.holdPiece?.type || null} 
              title="HOLD" 
              cellSize={mainCellSize}
            />
            
            <GameStatusIndicators 
              combo={opponentState.combo || -1}
              b2b={opponentState.b2b || 0}
              totalAttack={opponentState.attack || 0}
            />
          </div>

          {/* 玩家2主游戏区域 */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-700 relative">
            <GameInfo
              username={opponentUsername}
              score={opponentState.score}
              lines={opponentState.lines}
              level={opponentState.level}
              pieces={opponentState.pieces || 0}
              pps={opponentState.pps || 0}
              attack={opponentState.apm || 0}
              paused={opponentState.paused}
              onPause={() => {}}
              onShare={() => {}}
              mode="multi"
              combo={opponentState.combo && opponentState.combo >= 0 ? opponentState.combo : undefined}
              gameStarted={gameStarted}
            />
            
            <div className="relative">
              <GameBoard
                board={opponentState.board}
                currentPiece={opponentState.currentPiece}
                ghostPiece={opponentState.ghostPiece}
                enableGhost={gameSettings.enableGhost}
                cellSize={mainCellSize}
              />
            </div>
          </div>

          {/* 玩家2右侧NEXT面板 */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-white text-sm mb-3 text-center font-bold">NEXT</h3>
            <div className="space-y-3">
              {opponentState.nextPieces.slice(0, 4).map((piece, index) => (
                <PiecePreview 
                  key={index} 
                  piece={piece.type} 
                  title=""
                  cellSize={mainCellSize}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧广告位 */}
      <div className="hidden xl:block">
        <AdSpace position="right" width={240} height={600} />
      </div>

      {/* 控制按钮 */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button onClick={onBackToMenu} variant="outline" size="sm">
          返回菜单
        </Button>
      </div>
    </div>
  );
};

export default MultiPlayerGameArea;
