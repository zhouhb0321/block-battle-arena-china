import React, { useEffect, useState } from 'react';

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
<<<<<<< HEAD
    <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center z-40 pointer-events-none" style={{ pointerEvents: 'none' }}>
      {/* 只覆盖游戏板区域的半透明背景 */}
      <div className="absolute left-0 top-0 w-full h-full bg-black/30 backdrop-blur-sm rounded-lg" style={{ pointerEvents: 'none' }} />
=======
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
      {/* 背景仅覆盖游戏板区域，不覆盖整个容器 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg" />
      
>>>>>>> ceb8172f63ecf8b5f52ce9a5e3009ba390c124b8
      <div className="relative z-50">
        <div 
          className={`text-white font-bold transition-all duration-300 ${
            count > 0 ? 'text-5xl animate-bounce' : 'text-6xl animate-pulse'
          }`}
          style={{
<<<<<<< HEAD
            opacity: 0.7,
            textShadow: '0 0 20px hsl(var(--game-purple)), 0 0 40px hsl(var(--game-purple) / 0.6), 0 4px 8px rgba(0,0,0,0.8)',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))',
            transform: count > 0 ? 'scale(1.1)' : 'scale(1.2)',
            pointerEvents: 'none'
=======
            opacity: 0.95,
            textShadow: '0 0 25px hsl(var(--game-purple)), 0 0 50px hsl(var(--game-purple) / 0.7), 0 4px 8px rgba(0,0,0,0.8)',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))',
            transform: count > 0 ? 'scale(1.1)' : 'scale(1.3)',
>>>>>>> ceb8172f63ecf8b5f52ce9a5e3009ba390c124b8
          }}
        >
          {count > 0 ? count : 'READY'}
        </div>
<<<<<<< HEAD
        {/* Pulse effect with game theme colors */}
=======
        
        {/* 光晕效果 */}
>>>>>>> ceb8172f63ecf8b5f52ce9a5e3009ba390c124b8
        <div 
          className={`absolute inset-0 text-white font-bold opacity-15 ${
            count > 0 ? 'text-5xl animate-ping' : 'text-6xl animate-ping'
          }`}
          style={{
<<<<<<< HEAD
            textShadow: '0 0 20px hsl(var(--game-cyan))',
            transform: count > 0 ? 'scale(1.1)' : 'scale(1.2)',
            pointerEvents: 'none'
=======
            textShadow: '0 0 35px hsl(var(--game-cyan))',
            transform: count > 0 ? 'scale(1.1)' : 'scale(1.3)',
>>>>>>> ceb8172f63ecf8b5f52ce9a5e3009ba390c124b8
          }}
        >
          {count > 0 ? count : 'READY'}
        </div>
      </div>
    </div>
  );
};

export default GameCountdownInArea;
