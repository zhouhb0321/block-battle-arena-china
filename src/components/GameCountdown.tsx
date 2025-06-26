
import React, { useState, useEffect } from 'react';

interface GameCountdownProps {
  onCountdownEnd: () => void;
  show: boolean;
}

const GameCountdown: React.FC<GameCountdownProps> = ({ onCountdownEnd, show }) => {
  const [count, setCount] = useState(3);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setCount(3);
      
      const timer = setInterval(() => {
        setCount(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimeout(() => {
              setIsVisible(false);
              onCountdownEnd();
            }, 500);
            return 0;
          }
          return prev - 1;
        });
      }, 800);

      return () => clearInterval(timer);
    }
  }, [show, onCountdownEnd]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="text-white text-9xl font-bold animate-pulse">
        {count > 0 ? count : 'GO!'}
      </div>
    </div>
  );
};

export default GameCountdown;
