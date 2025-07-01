
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
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="text-white text-8xl font-bold drop-shadow-2xl animate-bounce">
        <div 
          className={`transition-all duration-300 ${count > 0 ? 'scale-110' : 'scale-125'}`}
          style={{
            textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.6)',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))'
          }}
        >
          {count > 0 ? count : 'GO!'}
        </div>
      </div>
    </div>
  );
};

export default GameCountdown;
