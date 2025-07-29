
import React, { useState, useEffect } from 'react';

interface Achievement {
  id: string;
  text: string;
  type: 'tetris' | 'tspin' | 'combo' | 'perfect' | 'level';
  timestamp: number;
}

interface AchievementDisplayProps {
  achievements: Achievement[];
  onAchievementComplete: (id: string) => void;
}

const AchievementDisplay: React.FC<AchievementDisplayProps> = ({ 
  achievements, 
  onAchievementComplete 
}) => {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievements.length > 0 && !currentAchievement) {
      const nextAchievement = achievements[0];
      console.log('显示新成就:', nextAchievement.text, nextAchievement.type);
      
      setCurrentAchievement(nextAchievement);
      setIsVisible(true);

      // 更短的显示时间，快速闪现
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        // 100ms消失动画后立即移除
        setTimeout(() => {
          setCurrentAchievement(null);
          onAchievementComplete(nextAchievement.id);
        }, 100);
      }, 800);

      return () => clearTimeout(hideTimer);
    }
  }, [achievements, currentAchievement, onAchievementComplete]);

  const getAchievementColor = (type: Achievement['type']) => {
    switch (type) {
      case 'tetris':
        return 'text-yellow-300 border-yellow-400/80 bg-yellow-400/25 shadow-yellow-400/40';
      case 'tspin':
        return 'text-purple-300 border-purple-400/80 bg-purple-400/25 shadow-purple-400/40';
      case 'combo':
        return 'text-green-300 border-green-400/80 bg-green-400/25 shadow-green-400/40';
      case 'perfect':
        return 'text-white border-white/80 bg-white/25 shadow-white/40';
      case 'level':
        return 'text-cyan-300 border-cyan-400/80 bg-cyan-400/25 shadow-cyan-400/40';
      default:
        return 'text-gray-300 border-gray-400/80 bg-gray-400/25 shadow-gray-400/40';
    }
  };

  if (!currentAchievement) {
    return <div className="h-16 w-full" />; // 增加占位符高度
  }

  return (
    <div className="h-16 w-full flex items-center justify-center relative overflow-hidden">
      <div
        className={`
          absolute inset-0 flex items-center justify-center
          transform transition-all duration-200 ease-out
          ${isVisible 
            ? 'scale-125 opacity-100 translate-y-0 animate-bounce' 
            : 'scale-90 opacity-0 translate-y-2'
          }
        `}
      >
        <div
          className={`
            px-8 py-3 font-bold text-center text-xl
            ${getAchievementColor(currentAchievement.type)}
            border-2 rounded-xl backdrop-blur-md
            drop-shadow-2xl whitespace-nowrap
            transform transition-all duration-200
            shadow-2xl
            ${isVisible ? 'animate-pulse' : ''}
          `}
          style={{
            animation: isVisible ? 'bounce 0.6s ease-in-out, pulse 1s ease-in-out infinite' : undefined
          }}
        >
          {currentAchievement.text}
        </div>
      </div>
    </div>
  );
};

export default AchievementDisplay;
