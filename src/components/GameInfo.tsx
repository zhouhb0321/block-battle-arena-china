
import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Pause, Play, Settings } from 'lucide-react';
import { getB2BDisplayText } from '@/utils/b2bSystem';
import { getGravityInfo } from '@/utils/gravitySystem';

interface GameInfoProps {
  username: string;
  score: number;
  lines: number;
  level: number;
  pieces?: number;
  pps?: number;
  attack?: number;
  paused: boolean;
  onPause: () => void;
  onShare: () => void;
  onSettings?: () => void;
  mode?: 'single' | 'multi';
  combo?: number;
  rank?: string;
  b2b?: number;
  gameStarted?: boolean; // 新增：游戏是否开始
}

const GameInfo: React.FC<GameInfoProps> = ({
  username,
  score,
  lines,
  level,
  pieces,
  pps,
  attack,
  paused,
  onPause,
  onShare,
  onSettings,
  mode = 'single',
  combo,
  rank,
  b2b = 0,
  gameStarted = false
}) => {
  // 获取重力信息
  const gravityInfo = getGravityInfo(lines);
  
  // 生成显示名 - 优先显示用户名而不是邮箱
  const getDisplayName = (name: string): string => {
    // 如果是邮箱格式，提取@前的部分作为用户名
    if (name.includes('@')) {
      return name.split('@')[0];
    }
    return name;
  };

  const displayName = getDisplayName(username);

  return (
    <div className="mb-4 text-white text-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="space-y-1">
          <div className="font-bold text-lg flex items-center gap-2">
            {displayName}
            {rank && (
              <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                {rank}
              </span>
            )}
          </div>
          <div>得分: {score.toLocaleString()}</div>
          <div>行数: {lines}</div>
          <div className="flex items-center gap-2">
            <span>等级: {gravityInfo.level}</span>
            <span className="text-xs opacity-70">
              (G: {gravityInfo.gravity.toFixed(3)})
            </span>
          </div>
          {combo !== undefined && combo >= 0 && (
            <div className="text-yellow-400 font-bold">
              连击: {combo + 1}x
            </div>
          )}
          {b2b > 1 && (
            <div className="text-orange-400 font-bold">
              {getB2BDisplayText(b2b)}
            </div>
          )}
          {mode === 'multi' && (
            <>
              <div className="text-xs opacity-80">
                方块: {pieces || 0}
              </div>
              <div className="text-xs opacity-80">
                PPS: {pps?.toFixed(2) || '0.00'}/s
              </div>
              <div className="text-xs opacity-80">
                APM: {attack?.toFixed(1) || '0.0'}/m
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {/* 只在游戏未开始或暂停时显示设置按钮 */}
          {onSettings && (!gameStarted || paused) && (
            <Button size="sm" variant="outline" onClick={onSettings}>
              <Settings className="w-4 h-4" />
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onPause}>
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={onShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameInfo;
