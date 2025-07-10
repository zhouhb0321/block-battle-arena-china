
import React, { useState, useEffect } from 'react';
import { debugLog } from '@/utils/debugLogger';

interface GameAreaCountdownProps {
  show: boolean;
  onCountdownStart?: () => void;
  onCountdownEnd: () => void;
  initialCount?: number;
}

const GameAreaCountdown: React.FC<GameAreaCountdownProps> = ({
  show,
  onCountdownStart,
  onCountdownEnd,
  initialCount = 3
}) => {
  const [count, setCount] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show && count === null) {
      debugLog.game('开始倒计时');
      setIsVisible(true);
      setCount(initialCount);
      
      // 立即调用开始回调
      if (onCountdownStart) {
        onCountdownStart();
      }
    }
  }, [show, count, initialCount, onCountdownStart]);

  useEffect(() => {
    if (count === null || count <= 0) return;

    const timer = setTimeout(() => {
      if (count === 1) {
        debugLog.game('倒计时结束');
        setCount(0);
        setTimeout(() => {
          setIsVisible(false);
          onCountdownEnd();
        }, 500);
      } else {
        setCount(count - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onCountdownEnd]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="text-center">
        {count && count > 0 ? (
          <div className="text-8xl font-bold text-white animate-pulse">
            {count}
          </div>
        ) : (
          <div className="text-6xl font-bold text-green-400 animate-bounce">
            开始！
          </div>
        )}
      </div>
    </div>
  );
};

export default GameAreaCountdown;
