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
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (achievements.length > 0 && !currentAchievement) {
      const nextAchievement = achievements[0];
      console.log('显示新成就:', nextAchievement.text, nextAchievement.type);
      setCurrentAchievement(nextAchievement);
      setIsAnimating(true);

      // 优化显示时长：300ms显示 + 100ms退出动画 = 总共400ms
      const timer = setTimeout(() => {
        setIsAnimating(false);
        // 立即开始退出动画
        setTimeout(() => {
          setCurrentAchievement(null);
          onAchievementComplete(nextAchievement.id);
        }, 50); // 快速退出
      }, 300); // 显示300ms

      return () => clearTimeout(timer);
    }
  }, [achievements, currentAchievement, onAchievementComplete]);

  const getAchievementColor = (type: Achievement['type']) => {
    switch (type) {
      case 'tetris':
        return 'text-yellow-400';
      case 'tspin':
        return 'text-purple-400';
      case 'combo':
        return 'text-green-400';
      case 'perfect':
        return 'text-white';
      case 'level':
        return 'text-cyan-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!currentAchievement) {
    return <div className="h-16 w-full" />; // 占位符保持布局稳定
  }

  return (
    <div className="h-16 w-full flex items-center justify-center relative overflow-hidden">
      <div
        className={`
          absolute inset-0 flex items-center justify-center
          transform transition-all duration-300 ease-out
          ${isAnimating ? 'scale-110 opacity-100' : 'scale-50 opacity-0'}
        `}
      >
        <div
          className={`
            px-3 py-2 font-bold text-center
            ${getAchievementColor(currentAchievement.type)}
            transform transition-all duration-150
            ${isAnimating ? 'achievement-scale-up' : ''}
            backdrop-blur-sm bg-black/10 dark:bg-white/10
            border border-current/30 rounded-lg
            drop-shadow-lg
            whitespace-nowrap max-w-fit
          `}
        >
          <div className="text-base font-extrabold tracking-wider uppercase leading-none">
            {currentAchievement.text}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes achievement-scale-up {
          0% { 
            transform: scale(0.5);
            opacity: 0;
          }
          50% { 
            transform: scale(1.2);
            opacity: 1;
          }
          100% { 
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .achievement-scale-up {
          animation: achievement-scale-up 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>
    </div>
  );
};

export default AchievementDisplay;