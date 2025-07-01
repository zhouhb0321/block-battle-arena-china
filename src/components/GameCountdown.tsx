
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
            }, 800);
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
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="relative">
        <div 
          className={`text-white font-bold transition-all duration-300 ${
            count > 0 ? 'text-6xl animate-bounce' : 'text-7xl animate-pulse'
          }`}
          style={{
            textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.6), 0 4px 8px rgba(0,0,0,0.8)',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))',
            transform: count > 0 ? 'scale(1.1)' : 'scale(1.2)',
          }}
        >
          {count > 0 ? count : 'GO!'}
        </div>
        
        {/* 添加脉冲效果 */}
        <div 
          className={`absolute inset-0 text-white font-bold opacity-30 ${
            count > 0 ? 'text-6xl animate-ping' : 'text-7xl animate-ping'
          }`}
          style={{
            textShadow: '0 0 20px rgba(255,255,255,0.8)',
            transform: count > 0 ? 'scale(1.1)' : 'scale(1.2)',
          }}
        >
          {count > 0 ? count : 'GO!'}
        </div>
      </div>
    </div>
  );
};

export default GameCountdown;
