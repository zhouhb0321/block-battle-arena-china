
import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimeChallengeClockProps {
  timeLimit: number; // 时间限制（秒）
  gameStarted: boolean;
  gameOver: boolean;
  onTimeUp: () => void;
}

const TimeChallengeClock: React.FC<TimeChallengeClockProps> = ({
  timeLimit,
  gameStarted,
  gameOver,
  onTimeUp
}) => {
  const [remainingTime, setRemainingTime] = useState(timeLimit);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1;
        
        // 最后30秒警告
        if (newTime <= 30 && !isWarning) {
          setIsWarning(true);
        }
        
        // 时间到了
        if (newTime <= 0) {
          onTimeUp();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, onTimeUp, isWarning]);

  // 重置时间（当游戏重新开始时）
  useEffect(() => {
    if (!gameStarted) {
      setRemainingTime(timeLimit);
      setIsWarning(false);
    }
  }, [gameStarted, timeLimit]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getClockColor = () => {
    if (remainingTime <= 10) return 'text-red-500';
    if (remainingTime <= 30) return 'text-yellow-500';
    return 'text-white';
  };

  const shouldPulse = remainingTime <= 10;

  return (
    <div className={`bg-gray-900 p-3 rounded-lg border border-gray-700 ${shouldPulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-center gap-2">
        <Clock className={`w-4 h-4 ${getClockColor()}`} />
        <span className={`text-lg font-mono font-bold ${getClockColor()}`}>
          {formatTime(remainingTime)}
        </span>
        {isWarning && remainingTime > 10 && (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
      </div>
      
      {/* 进度条 */}
      <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${
            remainingTime <= 10 
              ? 'bg-red-500' 
              : remainingTime <= 30 
                ? 'bg-yellow-500' 
                : 'bg-blue-500'
          }`}
          style={{ width: `${(remainingTime / timeLimit) * 100}%` }}
        />
      </div>
      
      {remainingTime <= 10 && remainingTime > 0 && (
        <div className="text-center mt-1">
          <span className="text-red-400 text-xs font-bold animate-bounce">
            时间不多了！
          </span>
        </div>
      )}
    </div>
  );
};

export default TimeChallengeClock;
