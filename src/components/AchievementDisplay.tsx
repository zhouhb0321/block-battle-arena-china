import React, { useEffect, useState } from 'react';

interface Achievement {
  id: string;
  text: string;
  type: 'tetris' | 'tspin' | 'combo' | 'perfect' | 'level' | 'clear';
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
    case 'clear':
      return 'text-blue-300 border-blue-400/80 bg-blue-400/25 shadow-blue-400/40';
    default:
      return 'text-gray-300 border-gray-400/80 bg-gray-400/25 shadow-gray-400/40';
  }
};

interface AchievementItemProps {
  achievement: Achievement;
  onComplete: (id: string) => void;
}

const AchievementItem: React.FC<AchievementItemProps> = ({ achievement, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const showTimer = setTimeout(() => {
      setVisible(false);
      const hideTimer = setTimeout(() => onComplete(achievement.id), 250);
      return () => clearTimeout(hideTimer);
    }, 500);

    return () => clearTimeout(showTimer);
  }, [achievement.id, onComplete]);

  return (
    <div
      className={
        `pointer-events-auto mb-2 px-4 py-2 border rounded-lg backdrop-blur-md shadow-lg ` +
        `transition-all duration-300 transform ` +
        `${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} ` +
        getAchievementColor(achievement.type)
      }
      role="status"
      aria-live="polite"
    >
      {achievement.text}
    </div>
  );
};

const AchievementDisplay: React.FC<AchievementDisplayProps> = ({
  achievements,
  onAchievementComplete,
}) => {
  return (
    <div className="p-3 rounded-lg border bg-background/40 border-border/60 backdrop-blur-sm h-full flex flex-col justify-start items-center">
      <h3 className="text-sm font-bold mb-2 text-center text-white/80">ACHIEVEMENTS</h3>
      <div className="w-full flex-grow flex flex-col-reverse items-center gap-2 overflow-hidden">
        {achievements.map((achievement) => (
          <AchievementItem
            key={achievement.id}
            achievement={achievement}
            onComplete={onAchievementComplete}
          />
        ))}
        {achievements.length === 0 && (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-xs text-white/50 italic">No new achievements</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementDisplay;
