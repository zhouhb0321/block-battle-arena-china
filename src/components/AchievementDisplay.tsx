
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

      // 实现快速闪现：100ms显示 + 100ms消失
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        
        // 100ms消失动画后完全移除
        setTimeout(() => {
          setCurrentAchievement(null);
          onAchievementComplete(nextAchievement.id);
        }, 100);
      }, 100);

      return () => clearTimeout(hideTimer);
    }
  }, [achievements, currentAchievement, onAchievementComplete]);

  const getAchievementColor = (type: Achievement['type']) => {
    switch (type) {
      case 'tetris':
        return 'text-yellow-300 border-yellow-400/60 bg-yellow-400/15 shadow-yellow-400/20';
      case 'tspin':
        return 'text-purple-300 border-purple-400/60 bg-purple-400/15 shadow-purple-400/20';
      case 'combo':
        return 'text-green-300 border-green-400/60 bg-green-400/15 shadow-green-400/20';
      case 'perfect':
        return 'text-white border-white/60 bg-white/15 shadow-white/20';
      case 'level':
        return 'text-cyan-300 border-cyan-400/60 bg-cyan-400/15 shadow-cyan-400/20';
      default:
        return 'text-gray-300 border-gray-400/60 bg-gray-400/15 shadow-gray-400/20';
    }
  };

  if (!currentAchievement) {
    return <div className="h-12 w-full" />; // 占位符保持布局稳定
  }

  return (
    <div className="h-12 w-full flex items-center justify-center relative overflow-hidden">
      <div
        className={`
          absolute inset-0 flex items-center justify-center
          transform transition-all duration-100 ease-out
          ${isVisible ? 'scale-110 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-1'}
        `}
      >
        <div
          className={`
            px-6 py-2 font-bold text-center text-lg
            ${getAchievementColor(currentAchievement.type)}
            border-2 rounded-lg backdrop-blur-sm
            drop-shadow-2xl whitespace-nowrap
            transform transition-all duration-100
            shadow-lg
          `}
        >
          {currentAchievement.text}
        </div>
      </div>
    </div>
  );
};

export default AchievementDisplay;
