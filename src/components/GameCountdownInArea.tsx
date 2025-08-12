
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
          // Use setTimeout to defer onComplete call to avoid setState during render
          setTimeout(() => onComplete(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [initialCount, onComplete, isVisible]);

  if (!isVisible || count <= 0) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="text-white text-8xl font-bold text-center animate-ping drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
        {count}
      </div>
    </div>
  );
};

export default GameCountdownInArea;
