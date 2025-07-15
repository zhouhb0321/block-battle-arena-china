import React, { useState, useEffect } from 'react';

interface AchievementAnimationProps {
  achievement: string | null;
  onComplete: () => void;
}

const AchievementAnimation: React.FC<AchievementAnimationProps> = ({ 
  achievement, 
  onComplete 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'display' | 'exit'>('enter');

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      setAnimationPhase('enter');
      
      // 进入动画 -> 显示 -> 退出动画
      const enterTimer = setTimeout(() => {
        setAnimationPhase('display');
      }, 200);
      
      const displayTimer = setTimeout(() => {
        setAnimationPhase('exit');
      }, 1200);
      
      const exitTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 1600);
      
      return () => {
        clearTimeout(enterTimer);
        clearTimeout(displayTimer);
        clearTimeout(exitTimer);
      };
    }
  }, [achievement, onComplete]);

  if (!achievement || !isVisible) {
    return null;
  }

  const getAchievementStyle = () => {
    const baseStyle = "fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none";
    const textStyle = "font-bold text-center px-8 py-4 rounded-xl shadow-2xl border-2";
    
    switch (animationPhase) {
      case 'enter':
        return `${baseStyle} ${textStyle} scale-75 opacity-0 transition-all duration-300 ease-out`;
      case 'display':
        return `${baseStyle} ${textStyle} scale-125 opacity-100 transition-all duration-300 ease-out animate-bounce`;
      case 'exit':
        return `${baseStyle} ${textStyle} scale-150 opacity-0 transition-all duration-500 ease-in`;
      default:
        return `${baseStyle} ${textStyle}`;
    }
  };

  const getAchievementColor = () => {
    if (achievement.includes('Tetris')) {
      return 'text-yellow-100 bg-yellow-600 border-yellow-400 shadow-yellow-500/50';
    } else if (achievement.includes('T-Spin')) {
      return 'text-purple-100 bg-purple-600 border-purple-400 shadow-purple-500/50';
    } else if (achievement.includes('Combo')) {
      return 'text-orange-100 bg-orange-600 border-orange-400 shadow-orange-500/50';
    } else if (achievement.includes('B2B')) {
      return 'text-red-100 bg-red-600 border-red-400 shadow-red-500/50';
    } else {
      return 'text-blue-100 bg-blue-600 border-blue-400 shadow-blue-500/50';
    }
  };

  return (
    <div className={`${getAchievementStyle()} ${getAchievementColor()}`}>
      <div className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-wide">
        {achievement}
      </div>
    </div>
  );
};

export default AchievementAnimation;