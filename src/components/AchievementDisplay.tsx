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
      setCurrentAchievement(nextAchievement);
      setIsAnimating(true);

      // 缩短显示时间，快速消失
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setCurrentAchievement(null);
          onAchievementComplete(nextAchievement.id);
        }, 150);
      }, 1200); // 从1800ms减少到1200ms

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
          transform transition-all duration-500 ease-out
          ${isAnimating ? 'scale-110 opacity-100' : 'scale-50 opacity-0'}
        `}
      >
        <div
          className={`
            px-6 py-3 font-bold text-center
            ${getAchievementColor(currentAchievement.type)}
            transform transition-all duration-300
            ${isAnimating ? 'achievement-scale-up' : ''}
            backdrop-blur-sm bg-transparent
            border border-current/20 rounded-lg
            drop-shadow-lg
          `}
        >
          <div className="text-xl font-extrabold tracking-wide uppercase">
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
          animation: achievement-scale-up 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>
    </div>
  );
};

export default AchievementDisplay;