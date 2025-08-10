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
  placement?: 'overlay' | 'sidebar';
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
    // Mount animation
    setIsVisible(true);

    // After a delay, start fade out animation
    const showTimer = setTimeout(() => {
      setIsVisible(false);
      // After fade out, notify parent to remove from list
      const hideTimer = setTimeout(() => onComplete(achievement.id), 300); // Corresponds to animation duration
      return () => clearTimeout(hideTimer);
    }, 2000); // Show for 2 seconds

    return () => clearTimeout(showTimer);
  }, [achievement.id, onComplete]);

  return (
    <div
      className={`my-2 px-6 py-3 rounded-lg border-2 shadow-lg transition-all duration-300 ${getAchievementColor(achievement.type)} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
    >
      <span className="font-bold text-lg">{achievement.text}</span>
    </div>
  );
};

const AchievementDisplay: React.FC<AchievementDisplayProps> = ({
  achievements,
  onAchievementComplete,
  placement = 'overlay'
}) => {
  if (placement === 'sidebar') {
    return (
      <div className="relative h-48 w-full flex flex-col items-center justify-end">
        {achievements.length > 0 && (
          <AchievementItem
            key={achievements[0].id}
            achievement={achievements[0]}
            onComplete={onAchievementComplete}
          />
        )}
      </div>
    );
  }
  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-48 w-full flex flex-col items-center justify-end z-30 pointer-events-none">
      {achievements.length > 0 && (
        <AchievementItem
          key={achievements[0].id}
          achievement={achievements[0]}
          onComplete={onAchievementComplete}
        />
      )}
    </div>
  );
};

export default AchievementDisplay;
