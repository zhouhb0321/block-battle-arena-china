
import React, { useEffect, useState } from 'react';

interface GameCountdownInAreaProps {
  initialCount: number;
  onComplete: () => void;
  isVisible: boolean;
}

const GameCountdownInArea: React.FC<GameCountdownInAreaProps> = ({
  initialCount,
  onComplete,
  isVisible
}) => {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (!isVisible) return;

    setCount(initialCount);
    
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [initialCount, onComplete, isVisible]);

  if (!isVisible || count <= 0) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      <div className="h-20 w-full flex items-center justify-center">
        <div className="bg-black bg-opacity-70 rounded-lg px-8 py-4 border-2 border-white">
          <div className="text-white text-6xl font-bold text-center animate-pulse">
            {count}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCountdownInArea;
