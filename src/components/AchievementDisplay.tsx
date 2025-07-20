
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

      // 300ms后开始消失动画
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        
        // 200ms消失动画后完全移除
        setTimeout(() => {
          setCurrentAchievement(null);
          onAchievementComplete(nextAchievement.id);
        }, 200);
      }, 300);

      return () => clearTimeout(hideTimer);
    }
  }, [achievements, currentAchievement, onAchievementComplete]);

  const getAchievementColor = (type: Achievement['type']) => {
    switch (type) {
      case 'tetris':
        return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10';
      case 'tspin':
        return 'text-purple-400 border-purple-400/50 bg-purple-400/10';
      case 'combo':
        return 'text-green-400 border-green-400/50 bg-green-400/10';
      case 'perfect':
        return 'text-white border-white/50 bg-white/10';
      case 'level':
        return 'text-cyan-400 border-cyan-400/50 bg-cyan-400/10';
      default:
        return 'text-gray-400 border-gray-400/50 bg-gray-400/10';
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
          transform transition-all duration-200 ease-out
          ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-2'}
        `}
      >
        <div
          className={`
            px-4 py-2 font-bold text-center text-sm
            ${getAchievementColor(currentAchievement.type)}
            border rounded-lg backdrop-blur-sm
            drop-shadow-lg whitespace-nowrap
            transform transition-all duration-200
          `}
        >
          {currentAchievement.text}
        </div>
      </div>
    </div>
  );
};

export default AchievementDisplay;
