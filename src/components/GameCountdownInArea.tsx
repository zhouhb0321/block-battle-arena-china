
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
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-black bg-opacity-70 rounded-lg px-4 py-2 border-2 border-white">
        <div className="text-white text-2xl font-bold text-center animate-pulse">
          {count}
        </div>
      </div>
    </div>
  );
};

export default GameCountdownInArea;
