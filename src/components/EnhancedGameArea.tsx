
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
    <div className="flex gap-8 justify-center items-start max-w-7xl mx-auto px-4">
      {/* 左侧面板 - Next区域（4个方块预览）*/}
      <div className="flex flex-col gap-6 w-56">
        <NextPiecePreview nextPieces={gameState.nextPieces} />
        
        {/* 游戏统计信息 */}
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <h3 className="text-white text-lg font-bold mb-3 text-center">游戏统计</h3>
          <div className="text-white text-base space-y-2">
            <div className="flex justify-between">
              <span>分数:</span>
              <span className="font-bold text-blue-400">{gameState.score.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>行数:</span>
              <span className="font-bold text-green-400">{gameState.lines}</span>
            </div>
            <div className="flex justify-between">
              <span>等级:</span>
              <span className="font-bold text-purple-400">{gameState.level}</span>
            </div>
            {gameState.combo > 0 && (
              <div className="flex justify-between">
                <span>连击:</span>
                <span className="font-bold text-yellow-400">{gameState.combo + 1}</span>
              </div>
            )}
            {gameState.b2b > 0 && (
              <div className="flex justify-between">
                <span>B2B:</span>
                <span className="font-bold text-purple-400">x{gameState.b2b}</span>
              </div>
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

      {/* 中央游戏区域 - 更大的游戏板 */}
      <div className="flex-shrink-0">
        <GameBoard
          board={gameState.board}
          currentPiece={gameState.currentPiece}
          ghostPiece={gameSettings.enableGhost ? gameState.ghostPiece : null}
          cellSize={36}
        />
      </div>

      {/* 右侧面板 - Hold区域和详细统计 */}
      <div className="flex flex-col gap-6 w-56">
        <HoldPieceDisplay 
          holdPiece={gameState.holdPiece}
          canHold={gameState.canHold}
        />
        
        {/* 详细统计信息 */}
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <h3 className="text-white text-lg font-bold mb-3 text-center">详细统计</h3>
          <div className="text-white text-base space-y-2">
            <div className="flex justify-between">
              <span>方块数:</span>
              <span className="font-bold text-cyan-400">{gameState.pieces}</span>
            </div>
            <div className="flex justify-between">
              <span>PPS:</span>
              <span className="font-bold text-orange-400">{gameState.pps.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>APM:</span>
              <span className="font-bold text-pink-400">{gameState.apm.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>攻击:</span>
              <span className="font-bold text-red-400">{gameState.attack}</span>
            </div>
            {gameState.startTime && (
              <div className="flex justify-between">
                <span>时间:</span>
                <span className="font-bold text-indigo-400">
                  {Math.floor((Date.now() - gameState.startTime) / 60000)}:{Math.floor(((Date.now() - gameState.startTime) % 60000) / 1000).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 操作提示 */}
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <h3 className="text-white text-lg font-bold mb-3 text-center">操作提示</h3>
          <div className="text-white text-base space-y-2">
            <div className="flex justify-between">
              <span>← →</span>
              <span className="text-gray-400">移动</span>
            </div>
            <div className="flex justify-between">
              <span>↓</span>
              <span className="text-gray-400">软降</span>
            </div>
            <div className="flex justify-between">
              <span>空格</span>
              <span className="text-gray-400">硬降</span>
            </div>
            <div className="flex justify-between">
              <span>↑</span>
              <span className="text-gray-400">旋转</span>
            </div>
            <div className="flex justify-between">
              <span>C</span>
              <span className="text-gray-400">暂存</span>
            </div>
            <div className="flex justify-between">
              <span>P</span>
              <span className="text-gray-400">暂停</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedGameArea;
