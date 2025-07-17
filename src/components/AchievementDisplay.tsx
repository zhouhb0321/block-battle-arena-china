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

      // 动画完成后清除成就
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setCurrentAchievement(null);
          onAchievementComplete(nextAchievement.id);
        }, 200);
      }, 1800);

      return () => clearTimeout(timer);
    }
  }, [achievements, currentAchievement, onAchievementComplete]);

  const getAchievementColor = (type: Achievement['type']) => {
    switch (type) {
      case 'tetris':
        return 'from-yellow-400 via-orange-500 to-red-500';
      case 'tspin':
        return 'from-purple-400 via-pink-500 to-purple-600';
      case 'combo':
        return 'from-green-400 via-blue-500 to-green-600';
      case 'perfect':
        return 'from-white via-yellow-300 to-white';
      case 'level':
        return 'from-cyan-400 via-blue-500 to-cyan-600';
      default:
        return 'from-gray-400 via-gray-500 to-gray-600';
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
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
        `}
      >
        <div
          className={`
            px-4 py-2 rounded-lg font-bold text-center
            bg-gradient-to-r ${getAchievementColor(currentAchievement.type)}
            text-white shadow-lg
            transform transition-all duration-200
            ${isAnimating ? 'animate-bounce' : ''}
          `}
        >
          <div className="text-lg font-extrabold tracking-wide">
            {currentAchievement.text}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes achievement-glow {
          0%, 100% { 
            filter: brightness(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
          }
          50% { 
            filter: brightness(1.2) drop-shadow(0 0 16px rgba(255, 255, 255, 0.6));
          }
        }
        
        .animate-bounce {
          animation: achievement-glow 0.6s ease-in-out, bounce 0.8s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default AchievementDisplay;