import React from 'react';
import { Pause } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import LineCleanAnimation from '@/components/LineCleanAnimation';
import AchievementAnimation from '@/components/AchievementAnimation';
import type { GamePiece } from '@/utils/gameTypes';
interface GameInfoPanelProps {
  holdPiece: GamePiece | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  pps: number;
  apm: number;
  elapsedTime: number;
  isManuallyPaused: boolean;
  showAnimation: boolean;
  animationText: string;
  achievementText: string | null;
  onAnimationComplete: () => void;
  onAchievementComplete: () => void;
}
const GameInfoPanel: React.FC<GameInfoPanelProps> = ({
  holdPiece,
  canHold,
  score,
  lines,
  level,
  pps,
  apm,
  elapsedTime,
  isManuallyPaused,
  showAnimation,
  animationText,
  achievementText,
  onAnimationComplete,
  onAchievementComplete
}) => {
  const {
    user
  } = useAuth();
  const {
    actualTheme
  } = useTheme();
  const getPanelThemeClasses = () => {
    return actualTheme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-700';
  };
  return <div className="flex flex-col gap-4 lg:w-60">
      <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
        <HoldPieceDisplay holdPiece={holdPiece} canHold={canHold} />
      </div>
      
      {/* 成就动画显示区域 - 在Hold区域下方 */}
      <div className="relative min-h-[100px] rounded-sm">
        {achievementText && <AchievementAnimation achievement={achievementText} onComplete={onAchievementComplete} />}
      </div>
      
      {/* 游戏信息面板 */}
      <div className="flex-1">
        <div className={`p-4 rounded-lg border ${getPanelThemeClasses()} relative`}>
          <div className="space-y-3">
            <div className="text-center border-b pb-2 mb-3">
              <div className="font-bold text-lg">
                {user?.username || user?.email?.split('@')[0] || 'Player'}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>得分:</div>
              <div className="font-mono text-right">{score.toLocaleString()}</div>
              
              <div>行数:</div>
              <div className="font-mono text-right">{lines}</div>
              
              <div>等级:</div>
              <div className="font-mono text-right">{level}</div>
              
              <div>PPS:</div>
              <div className="font-mono text-right">{pps.toFixed(2)}</div>
              
              <div>攻击:</div>
              <div className="font-mono text-right">{apm.toFixed(1)}</div>
              
              <div>时间:</div>
              <div className="font-mono text-right">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {isManuallyPaused && <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Pause className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm">游戏暂停</div>
                </div>
              </div>}
          </div>
          
          <LineCleanAnimation isVisible={showAnimation} text={animationText} onComplete={onAnimationComplete} />
        </div>
      </div>
    </div>;
};
export default GameInfoPanel;