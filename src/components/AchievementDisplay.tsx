import React, { useState, useEffect } from 'react';

interface Achievement {
  id: string;
  text: string;
  timestamp: number;
}

interface AchievementDisplayProps {
  className?: string;
}

const AchievementDisplay: React.FC<AchievementDisplayProps> = ({ className = '' }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Listen for achievement events
  useEffect(() => {
    const handleAchievement = (event: CustomEvent<{ text: string }>) => {
      const newAchievement: Achievement = {
        id: Math.random().toString(36).substr(2, 9),
        text: event.detail.text,
        timestamp: Date.now()
      };
      
      setAchievements(prev => [...prev, newAchievement]);
      
      // Remove achievement after 3 seconds
      setTimeout(() => {
        setAchievements(prev => prev.filter(a => a.id !== newAchievement.id));
      }, 3000);
    };

    window.addEventListener('tetris-achievement' as any, handleAchievement);
    
    return () => {
      window.removeEventListener('tetris-achievement' as any, handleAchievement);
    };
  }, []);

  // Trigger achievement for demo purposes (remove in production)
  const triggerTestAchievement = () => {
    const achievements = ['T-SPIN!', 'TETRIS!', 'PERFECT CLEAR!', 'COMBO x4', 'ALL CLEAR!'];
    const randomText = achievements[Math.floor(Math.random() * achievements.length)];
    
    const event = new CustomEvent('tetris-achievement', {
      detail: { text: randomText }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className={`achievement-display ${className}`}>
      <div className="achievement-container">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className="achievement-text animate-bounce"
            style={{
              animationDelay: `${(Date.now() - achievement.timestamp) / 1000}s`,
            }}
          >
            {achievement.text}
          </div>
        ))}
      </div>
      
      {/* Demo button - remove in production */}
      <button
        onClick={triggerTestAchievement}
        className="hidden demo-button opacity-0 hover:opacity-50 text-xs text-white/50 mt-2"
      >
        Test Achievement
      </button>
      
      <style>{`
        .achievement-display {
          position: relative;
          min-height: 60px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .achievement-container {
          position: relative;
          width: 100%;
          height: 60px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .achievement-text {
          position: absolute;
          font-size: 14px;
          font-weight: bold;
          color: #ffd700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
          text-align: center;
          animation: achievement-pop 3s ease-out forwards;
          pointer-events: none;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        @keyframes achievement-pop {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          15% {
            opacity: 1;
            transform: translateY(0px) scale(1.2);
          }
          30% {
            transform: translateY(-5px) scale(1);
          }
          45% {
            transform: translateY(0px) scale(1);
          }
          85% {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px) scale(0.8);
          }
        }
        
        .demo-button {
          transition: opacity 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default AchievementDisplay;