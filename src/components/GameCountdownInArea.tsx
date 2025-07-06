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
      {/* 只覆盖游戏板区域的半透明背景 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg" />
      
      <div className="relative z-50">
        <div 
          className={`text-white font-bold transition-all duration-300 ${
            count > 0 ? 'text-5xl animate-bounce' : 'text-6xl animate-pulse'
          }`}
          style={{
            opacity: 0.7,
            textShadow: '0 0 20px hsl(var(--game-purple)), 0 0 40px hsl(var(--game-purple) / 0.6), 0 4px 8px rgba(0,0,0,0.8)',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))',
            transform: count > 0 ? 'scale(1.1)' : 'scale(1.2)',
          }}
        >
          {count > 0 ? count : 'GO!'}
        </div>
        
        {/* Pulse effect with game theme colors */}
        <div 
          className={`absolute inset-0 text-white font-bold opacity-30 ${
            count > 0 ? 'text-5xl animate-ping' : 'text-6xl animate-ping'
          }`}
          style={{
            textShadow: '0 0 20px hsl(var(--game-cyan))',
            transform: count > 0 ? 'scale(1.1)' : 'scale(1.2)',
          }}
        >
          {count > 0 ? count : 'GO!'}
        </div>
      </div>
    </div>
  );
};

export default GameCountdownInArea;
