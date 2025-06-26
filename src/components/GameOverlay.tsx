
import React from 'react';
import { Button } from '@/components/ui/button';

interface GameOverlayProps {
  paused: boolean;
  gameOver: boolean;
  score: number;
  lines: number;
  totalAttack: number;
  pps: number;
  apm: number;
  onReset: () => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({
  paused,
  gameOver,
  score,
  lines,
  totalAttack,
  pps,
  apm,
  onReset
}) => {
  if (paused) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
        <div className="text-white text-2xl font-bold">游戏暂停</div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center rounded-lg">
        <div className="text-white text-center p-6 bg-gray-800 rounded-lg">
          <div className="text-3xl mb-4 font-bold text-red-400">游戏结束</div>
          <div className="space-y-2 mb-6">
            <div>最终得分: <span className="font-bold text-yellow-400">{score.toLocaleString()}</span></div>
            <div>消除行数: <span className="font-bold">{lines}</span></div>
            <div>攻击力: <span className="font-bold text-red-400">{totalAttack}</span></div>
            <div>PPS: <span className="font-bold">{pps.toFixed(2)}</span></div>
            <div>APM: <span className="font-bold">{apm.toFixed(1)}</span></div>
          </div>
          <Button onClick={onReset} className="bg-blue-600 hover:bg-blue-700">
            重新开始
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default GameOverlay;
