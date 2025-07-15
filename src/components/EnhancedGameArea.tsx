
import React from 'react';
import GameBoard from './GameBoard';
import NextPiecePreview from './NextPiecePreview';
import HoldPieceDisplay from './HoldPieceDisplay';
import TimeChallengeClock from './TimeChallengeClock';
import AchievementAnimation from './AchievementAnimation';
import { useResponsiveCellSize } from '@/hooks/useResponsiveCellSize';
import type { GameState, GameSettings, GameMode } from '@/utils/gameTypes';

interface EnhancedGameAreaProps {
  gameState: GameState;
  gameSettings: GameSettings;
  gameMode: GameMode;
  onTimeUp?: () => void;
  gameStarted: boolean;
  achievementText?: string | null;
  onAchievementComplete?: () => void;
}

const EnhancedGameArea: React.FC<EnhancedGameAreaProps> = ({
  gameState,
  gameSettings,
  gameMode,
  onTimeUp,
  gameStarted,
  achievementText,
  onAchievementComplete
}) => {
  const cellSize = useResponsiveCellSize({ minSize: 26, maxSize: 30 });

  return (
    <div className="flex gap-8 justify-center items-start max-w-7xl mx-auto px-4">
      {/* 左侧面板 - Next区域（4个方块预览）*/}
      <div className="flex flex-col gap-6 w-56">
        <NextPiecePreview nextPieces={gameState.nextPieces} />
        
        {/* 游戏统计信息 */}
        <div className="game-panel-light p-4 rounded-lg">
          <h3 className="text-foreground text-lg font-bold mb-3 text-center">游戏统计</h3>
          <div className="text-foreground text-base space-y-2">
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
          <div className="game-panel-light p-3 rounded-lg">
            <h3 className="text-foreground text-sm font-bold mb-2 text-center">目标进度</h3>
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

      {/* 中央游戏区域 - 响应式游戏板 */}
      <div className="flex-shrink-0 relative">
        <GameBoard
          board={gameState.board as number[][]}
          currentPiece={gameState.currentPiece}
          ghostPiece={gameSettings.enableGhost ? gameState.ghostPiece : null}
          cellSize={cellSize}
        />
        
        {/* 成就动画覆盖层 */}
        {achievementText && onAchievementComplete && (
          <AchievementAnimation
            achievement={achievementText}
            onComplete={onAchievementComplete}
          />
        )}
      </div>

      {/* 右侧面板 - Hold区域和详细统计 */}
      <div className="flex flex-col gap-6 w-56">
        <HoldPieceDisplay 
          holdPiece={gameState.holdPiece}
          canHold={gameState.canHold}
        />
        
        {/* 详细统计信息 */}
        <div className="game-panel-light p-4 rounded-lg">
          <h3 className="text-foreground text-lg font-bold mb-3 text-center">详细统计</h3>
          <div className="text-foreground text-base space-y-2">
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
      </div>
    </div>
  );
};

export default EnhancedGameArea;
