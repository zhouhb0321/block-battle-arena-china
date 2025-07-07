
import React, { useState, useEffect } from 'react';

interface GameCountdownInAreaProps {
  onCountdownEnd: () => void;
  show: boolean;
}

const GameCountdownInArea: React.FC<GameCountdownInAreaProps> = ({ 
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
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
      {/* 半透明背景只覆盖游戏板区域 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      <div className="relative z-50">
        <div 
          className={`text-white font-bold transition-all duration-300 ${
            count > 0 ? 'text-6xl animate-bounce' : 'text-7xl animate-pulse'
          }`}
          style={{
            opacity: 0.95,
            textShadow: '0 0 30px hsl(var(--game-purple)), 0 0 60px hsl(var(--game-purple) / 0.8), 0 6px 12px rgba(0,0,0,0.9)',
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.9))',
            transform: count > 0 ? 'scale(1.2)' : 'scale(1.4)',
          }}
        >
          {count > 0 ? count : 'READY'}
        </div>
        
        {/* 光晕效果 */}
        <div 
          className={`absolute inset-0 text-white font-bold opacity-20 ${
            count > 0 ? 'text-6xl animate-ping' : 'text-7xl animate-ping'
          }`}
          style={{
            textShadow: '0 0 40px hsl(var(--game-cyan))',
            transform: count > 0 ? 'scale(1.2)' : 'scale(1.4)',
          }}
        >
          {count > 0 ? count : 'READY'}
        </div>
      </div>
    </div>
  );
};

export default GameCountdownInArea;
