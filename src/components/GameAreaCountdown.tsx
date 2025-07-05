
import React, { useState, useEffect } from 'react';

interface GameAreaCountdownProps {
  onCountdownEnd: () => void;
  show: boolean;
}

const GameAreaCountdown: React.FC<GameAreaCountdownProps> = ({ 
  onCountdownEnd, 
  show
}) => {
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
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [show, onCountdownEnd]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div 
        className={`text-white font-bold transition-all duration-300 ${
          count > 0 ? 'text-4xl' : 'text-5xl'
        }`}
        style={{
          textShadow: '0 0 10px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.8)',
          transform: count > 0 ? 'scale(1)' : 'scale(1.2)',
        }}
      >
        {count > 0 ? count : 'GO!'}
      </div>
    </div>
  );
};

export default GameAreaCountdown;
