
import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Pause, Play } from 'lucide-react';

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
  mode?: 'single' | 'multi';
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
  mode = 'single'
}) => {
  return (
    <div className="mb-4 text-white text-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="space-y-1">
          <div className="font-bold text-lg">{username}</div>
          <div>得分: {score.toLocaleString()}</div>
          <div>行数: {lines}</div>
          <div>等级: {level}</div>
          {mode === 'multi' && (
            <>
              <div className="text-xs opacity-80">
                方块: {pieces || 0}
              </div>
              <div className="text-xs opacity-80">
                PPS: {pps?.toFixed(2) || '0.00'}/s
              </div>
              <div className="text-xs opacity-80">
                攻击: {attack?.toFixed(2) || '0.00'}/m
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2">
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
