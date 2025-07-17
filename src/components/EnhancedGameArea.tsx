
import React from 'react';
import GameBoard from './GameBoard';
import NextPiecePreview from './NextPiecePreview';
import HoldPieceDisplay from './HoldPieceDisplay';
import TimeChallengeClock from './TimeChallengeClock';
import type { GameState, GameSettings, GameMode } from '@/utils/gameTypes';

interface EnhancedGameAreaProps {
  gameState: GameState;
  gameSettings: GameSettings;
  gameMode: GameMode;
  onTimeUp?: () => void;
  gameStarted: boolean;
}

const EnhancedGameArea: React.FC<EnhancedGameAreaProps> = ({
  gameState,
  gameSettings,
  gameMode,
  onTimeUp,
  gameStarted
}) => {
  return (
    <div className="flex gap-6 justify-center items-start max-w-6xl mx-auto">
      {/* 左侧面板 - Next区域（4个方块预览）*/}
      <div className="flex flex-col gap-4 w-48">
        <NextPiecePreview nextPieces={gameState.nextPieces} />
        
        {/* 游戏统计信息 */}
        <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
          <div className="text-white text-sm space-y-1">
            <div>分数: {gameState.score.toLocaleString()}</div>
            <div>行数: {gameState.lines}</div>
            <div>等级: {gameState.level}</div>
            {gameState.combo > 0 && (
              <div className="text-yellow-400">连击: {gameState.combo + 1}</div>
            )}
            {gameState.b2b > 0 && (
              <div className="text-purple-400">B2B: x{gameState.b2b}</div>
            )}
          </div>
        </div>

        {/* 时间挑战倒计时 */}
        {gameMode.isTimeAttack && gameMode.timeLimit && onTimeUp && (
          <TimeChallengeClock
            timeLimit={gameMode.timeLimit}
            gameStarted={gameStarted}
            gameOver={gameState.gameOver}
            onTimeUp={onTimeUp}
          />
        )}

        {/* 目标进度 */}
        {gameMode.targetLines && (
          <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
            <h3 className="text-white text-sm font-bold mb-2 text-center">目标进度</h3>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {gameState.lines} / {gameMode.targetLines}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((gameState.lines / gameMode.targetLines) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                还需 {Math.max(gameMode.targetLines - gameState.lines, 0)} 行
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 中央游戏区域 */}
      <div className="flex-shrink-0">
        <GameBoard
          board={gameState.board}
          currentPiece={gameState.currentPiece}
          ghostPiece={gameSettings.enableGhost ? gameState.ghostPiece : null}
          cellSize={30}
        />
      </div>

      {/* 右侧面板 - Hold区域和详细统计 */}
      <div className="flex flex-col gap-4 w-48">
        <HoldPieceDisplay 
          holdPiece={gameState.holdPiece}
          canHold={gameState.canHold}
        />
        
        {/* 详细统计信息 */}
        <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
          <h3 className="text-white text-sm font-bold mb-2 text-center">详细统计</h3>
          <div className="text-white text-xs space-y-1">
            <div>方块数: {gameState.pieces}</div>
            <div>PPS: {gameState.pps.toFixed(2)}</div>
            <div>APM: {gameState.apm.toFixed(1)}</div>
            <div>攻击: {gameState.attack}</div>
            {gameState.startTime && (
              <div>时间: {Math.floor((Date.now() - gameState.startTime) / 60000)}:{Math.floor(((Date.now() - gameState.startTime) % 60000) / 1000).toString().padStart(2, '0')}</div>
            )}
          </div>
        </div>

        {/* 操作提示 */}
        <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
          <h3 className="text-white text-sm font-bold mb-2 text-center">操作提示</h3>
          <div className="text-white text-xs space-y-1">
            <div>← → 移动</div>
            <div>↓ 软降</div>
            <div>空格 硬降</div>
            <div>↑ 旋转</div>
            <div>C 暂存</div>
            <div>P 暂停</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedGameArea;
