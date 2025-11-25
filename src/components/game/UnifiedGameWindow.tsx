import React from 'react';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import GameCountdownInArea from '@/components/GameCountdownInArea';
import OutOfFocusOverlay from '@/components/OutOfFocusOverlay';
import type { GamePiece } from '@/utils/gameTypes';

interface UnifiedGameWindowProps {
  // 游戏板数据
  board: number[][];
  currentPiece: GamePiece | null;
  ghostPiece: GamePiece | null;
  nextPieces: GamePiece[];
  holdPiece: GamePiece | null;
  canHold: boolean;
  
  // 游戏统计
  score: number;
  lines: number;
  level: number;
  pps: number;
  apm: number;
  time: number;
  
  // 玩家信息
  username?: string;
  
  // 模式控制
  mode?: 'play' | 'replay' | 'spectate';
  cellSize?: number;
  enableGhost?: boolean;
  
  // 倒计时
  showCountdown?: boolean;
  onCountdownComplete?: () => void;
  
  // 暂停覆盖层
  showPauseOverlay?: boolean;
  onResume?: () => void;
  
  // 主题颜色 (用于多人对战时区分玩家)
  accentColor?: 'blue' | 'red' | 'green' | 'yellow' | 'default';
  
  // 额外统计 (对战模式)
  pieces?: number;
  attack?: number;
  
  // 时间格式
  isTimeAttack?: boolean;
  timeLimit?: number;
  remainingTimeMs?: number;
}

const UnifiedGameWindow: React.FC<UnifiedGameWindowProps> = ({
  board,
  currentPiece,
  ghostPiece,
  nextPieces,
  holdPiece,
  canHold,
  score,
  lines,
  level,
  pps,
  apm,
  time,
  username,
  mode = 'play',
  cellSize = 32,
  enableGhost = true,
  showCountdown = false,
  onCountdownComplete,
  showPauseOverlay = false,
  onResume,
  accentColor = 'default',
  pieces,
  attack,
  isTimeAttack = false,
  timeLimit,
  remainingTimeMs
}) => {
  const formatMs = (ms: number) => {
    const totalMs = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const getAccentColorClass = () => {
    switch (accentColor) {
      case 'blue': return 'text-blue-400 border-blue-400/60';
      case 'red': return 'text-red-400 border-red-400/60';
      case 'green': return 'text-green-400 border-green-400/60';
      case 'yellow': return 'text-yellow-400 border-yellow-400/60';
      default: return 'text-primary border-primary/60';
    }
  };

  const showTimeWarning = remainingTimeMs !== null && remainingTimeMs !== undefined && remainingTimeMs <= 10000 && remainingTimeMs > 0;

  return (
    <div className="flex gap-4 items-start">
      {/* Hold区域 */}
      <div className="w-32 flex flex-col gap-4">
        <div className="bg-background/40 border border-border/60 backdrop-blur-sm p-3 rounded-lg">
          <HoldPieceDisplay
            holdPiece={holdPiece}
            canHold={canHold}
          />
        </div>
      </div>

      {/* 游戏板区域 */}
      <div className="relative">
        <div className="bg-transparent p-4 rounded-lg">
          <EnhancedGameBoard
            board={board}
            currentPiece={currentPiece}
            ghostPiece={enableGhost ? ghostPiece : null}
            cellSize={cellSize}
          />
        </div>
        
        {showCountdown && (
          <GameCountdownInArea
            initialCount={3}
            onComplete={onCountdownComplete || (() => {})}
            isVisible={showCountdown}
          />
        )}
        
        {showPauseOverlay && (
          <OutOfFocusOverlay
            show={showPauseOverlay}
            onResume={onResume || (() => {})}
          />
        )}
      </div>

      {/* Next + 统计区域 */}
      <div className="w-48 flex flex-col gap-4">
        <div className="bg-background/40 border border-border/60 backdrop-blur-sm p-3 rounded-lg">
          <NextPiecePreview
            nextPieces={nextPieces}
            compact={false}
          />
        </div>

        <div className={`bg-background/40 border backdrop-blur-sm p-4 rounded-lg ${getAccentColorClass()}`}>
          <div className="space-y-3">
            {username && (
              <div className="text-center border-b border-border/40 pb-2 mb-3">
                <div className="font-bold text-lg">{username}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>得分:</div>
              <div className="font-mono text-right">{score.toLocaleString()}</div>
              
              <div>行数:</div>
              <div className="font-mono text-right">{lines}</div>
              
              <div>等级:</div>
              <div className="font-mono text-right">{level}</div>
              
              {pieces !== undefined && (
                <>
                  <div>方块:</div>
                  <div className="font-mono text-right">{pieces}</div>
                </>
              )}
              
              <div>PPS:</div>
              <div className="font-mono text-right">{pps.toFixed(2)}</div>
              
              {attack !== undefined ? (
                <>
                  <div>攻击:</div>
                  <div className="font-mono text-right">{attack}</div>
                </>
              ) : (
                <>
                  <div>APM:</div>
                  <div className="font-mono text-right">{apm.toFixed(1)}</div>
                </>
              )}
              
              <div>{isTimeAttack ? '剩余:' : '时间:'}</div>
              <div className="font-mono text-right flex items-center justify-end gap-2">
                {isTimeAttack && timeLimit && remainingTimeMs !== undefined && (
                  <svg className="w-5 h-5" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.2"
                      strokeWidth="4"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={`${((remainingTimeMs || 0) / (timeLimit * 1000)) * 100}, 100`}
                    />
                  </svg>
                )}
                <span className={showTimeWarning ? 'text-red-500 font-bold animate-pulse' : ''}>
                  {isTimeAttack && timeLimit && remainingTimeMs !== undefined
                    ? formatMs(remainingTimeMs)
                    : formatMs(time * 1000)}
                  {showTimeWarning && (
                    <span className="ml-1 text-xs">
                      ⚠️ {Math.ceil((remainingTimeMs || 0) / 1000)}秒!
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedGameWindow;
