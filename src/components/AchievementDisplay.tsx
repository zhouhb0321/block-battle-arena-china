
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

const AchievementItem: React.FC<{ achievement: Achievement; onComplete: (id: string) => void }> = ({ achievement, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete(achievement.id), 200); // 动画结束后移除
    }, 500); // 总显示时间约600-700ms

    return () => clearTimeout(timer);
  }, [achievement.id, onComplete]);

  return (
    <div
      className={`
        transform transition-all duration-200 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <div
        className={`
          px-3 py-1 mb-2 font-semibold text-center text-sm
          ${getAchievementColor(achievement.type)}
          border rounded-md whitespace-nowrap shadow-md
        `}
      >
        {achievement.text}
      </div>
    </div>
  );
};

const AchievementDisplay: React.FC<AchievementDisplayProps> = ({
  achievements,
  onAchievementComplete
}) => {
  return (
    <div className="h-24 w-full flex flex-col-reverse items-center overflow-hidden">
      {achievements.map(achievement => (
        <AchievementItem
          key={achievement.id}
          achievement={achievement}
          onComplete={onAchievementComplete}
        />
      ))}
    </div>
  );
};

export default AchievementDisplay;
