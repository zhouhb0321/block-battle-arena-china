
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

const AchievementDisplay: React.FC<AchievementDisplayProps> = ({
  achievements,
  onAchievementComplete
}) => {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievements.length > 0 && !currentAchievement) {
      const nextAchievement = achievements[0];
      setCurrentAchievement(nextAchievement);
      setIsVisible(true);

      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setCurrentAchievement(null);
          onAchievementComplete(nextAchievement.id);
        }, 100); // 100ms fade-out
      }, 500); // 500ms hold time

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

  return (
    <div className="h-16 w-full flex items-center justify-center relative overflow-hidden">
      {currentAchievement && (
        <div
          className={`
            transform transition-all duration-100 ease-out
            ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          `}
        >
          <div
            className={`
              px-4 py-2 font-bold text-center text-md
              ${getAchievementColor(currentAchievement.type)}
              border rounded-lg whitespace-nowrap shadow-lg
            `}
          >
            {currentAchievement.text}
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementDisplay;
