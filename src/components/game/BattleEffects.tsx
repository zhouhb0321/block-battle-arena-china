/**
 * 对战专属视觉效果组件
 * 包含：KO 提示、Combo 动画、B2B 动画、攻击预览条
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Zap, Skull, Star, Target, Shield } from 'lucide-react';

// ============= KO 提示组件 =============
interface KOEffectProps {
  show: boolean;
  targetName?: string;
  onComplete?: () => void;
}

export const KOEffect: React.FC<KOEffectProps> = ({ show, targetName, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="animate-bounce-in">
        <div className="relative">
          {/* 背景光晕 */}
          <div className="absolute inset-0 bg-red-500/30 blur-3xl animate-pulse" />
          
          {/* 主文字 */}
          <div className="relative flex flex-col items-center">
            <div className="flex items-center gap-2">
              <Skull className="w-16 h-16 text-red-500 animate-pulse" />
              <span className="text-7xl font-black text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
                K.O.
              </span>
              <Skull className="w-16 h-16 text-red-500 animate-pulse" />
            </div>
            {targetName && (
              <div className="text-2xl font-bold text-foreground/80 mt-2 animate-fade-in">
                击败了 {targetName}!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============= Combo 动画组件 =============
interface ComboEffectProps {
  combo: number;
  show: boolean;
  className?: string;
}

export const ComboEffect: React.FC<ComboEffectProps> = ({ combo, show, className }) => {
  const [displayCombo, setDisplayCombo] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (show && combo > 0) {
      setDisplayCombo(combo);
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [combo, show]);

  if (!show || displayCombo === 0) return null;

  const getComboColor = () => {
    if (displayCombo >= 10) return 'text-red-500';
    if (displayCombo >= 7) return 'text-orange-500';
    if (displayCombo >= 4) return 'text-yellow-500';
    return 'text-blue-400';
  };

  const getComboSize = () => {
    if (displayCombo >= 10) return 'text-4xl';
    if (displayCombo >= 7) return 'text-3xl';
    if (displayCombo >= 4) return 'text-2xl';
    return 'text-xl';
  };

  return (
    <div className={cn(
      "transform transition-all duration-200",
      animating && "scale-125",
      className
    )}>
      <div className={cn(
        "flex flex-col items-center gap-0.5",
        getComboColor(),
        getComboSize()
      )}>
        <Zap className={cn(
          "w-6 h-6",
          animating && "animate-bounce"
        )} />
        <span className="font-black tracking-wider">
          {displayCombo}
        </span>
        <span className="text-xs font-bold tracking-widest">COMBO</span>
      </div>
    </div>
  );
};

// ============= B2B 动画组件 =============
interface B2BEffectProps {
  b2b: number;
  show: boolean;
  className?: string;
}

export const B2BEffect: React.FC<B2BEffectProps> = ({ b2b, show, className }) => {
  const [displayB2B, setDisplayB2B] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (show && b2b > 0 && b2b !== displayB2B) {
      setDisplayB2B(b2b);
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [b2b, show, displayB2B]);

  if (!show || displayB2B === 0) return null;

  return (
    <div className={cn(
      "transform transition-all duration-200",
      animating && "scale-110",
      className
    )}>
      <div className="flex flex-col items-center gap-0.5">
        <div className={cn(
          "bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text",
          "text-2xl font-black tracking-wider",
          animating && "animate-pulse"
        )}>
          B2B
        </div>
        <span className="text-yellow-400 text-3xl font-black">
          ×{displayB2B}
        </span>
      </div>
    </div>
  );
};

// ============= 攻击预览条 =============
interface AttackPreviewBarProps {
  incomingGarbage: number;
  maxDisplay?: number;
  position?: 'left' | 'right';
}

export const AttackPreviewBar: React.FC<AttackPreviewBarProps> = ({
  incomingGarbage,
  maxDisplay = 20,
  position = 'left'
}) => {
  const displayCount = Math.min(incomingGarbage, maxDisplay);
  
  const dangerLevel = useMemo(() => {
    if (incomingGarbage >= 12) return 'critical';
    if (incomingGarbage >= 8) return 'danger';
    if (incomingGarbage >= 4) return 'warning';
    return 'safe';
  }, [incomingGarbage]);

  const getBarColor = () => {
    switch (dangerLevel) {
      case 'critical': return 'bg-red-600';
      case 'danger': return 'bg-red-500';
      case 'warning': return 'bg-orange-500';
      default: return 'bg-yellow-500';
    }
  };

  if (incomingGarbage === 0) return null;

  return (
    <div className={cn(
      "absolute top-0 bottom-0 w-3 flex flex-col-reverse gap-px p-0.5",
      position === 'left' ? '-left-4' : '-right-4'
    )}>
      {Array.from({ length: displayCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 min-h-[6px] rounded-sm transition-all",
            getBarColor(),
            dangerLevel === 'critical' && "animate-pulse"
          )}
          style={{ 
            opacity: 1 - (i / maxDisplay) * 0.4,
            animationDelay: `${i * 30}ms`
          }}
        />
      ))}
      
      {/* 数字显示 */}
      <div className={cn(
        "absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm font-bold",
        dangerLevel === 'critical' && "text-red-500 animate-bounce",
        dangerLevel === 'danger' && "text-orange-500",
        dangerLevel === 'warning' && "text-yellow-500",
        dangerLevel === 'safe' && "text-muted-foreground"
      )}>
        {incomingGarbage}
      </div>
    </div>
  );
};

// ============= 攻击发送动画 =============
interface AttackSentEffectProps {
  lines: number;
  show: boolean;
  onComplete?: () => void;
}

export const AttackSentEffect: React.FC<AttackSentEffectProps> = ({
  lines,
  show,
  onComplete
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && lines > 0) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [show, lines, onComplete]);

  if (!visible) return null;

  return (
    <div className="absolute top-1/2 right-0 transform translate-x-full -translate-y-1/2 animate-slide-right">
      <div className="flex items-center gap-1 bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-1">
        <Target className="w-4 h-4 text-green-500" />
        <span className="text-green-500 font-bold">+{lines}</span>
      </div>
    </div>
  );
};

// ============= 即将受到攻击警告 =============
interface IncomingAttackWarningProps {
  lines: number;
  show: boolean;
}

export const IncomingAttackWarning: React.FC<IncomingAttackWarningProps> = ({
  lines,
  show
}) => {
  if (!show || lines === 0) return null;

  return (
    <div className="absolute top-1/2 left-0 transform -translate-x-full -translate-y-1/2">
      <div className={cn(
        "flex items-center gap-1 rounded-lg px-3 py-1",
        lines >= 8 ? "bg-red-500/30 border-red-500/70 animate-pulse" : "bg-orange-500/20 border-orange-500/50",
        "border"
      )}>
        <Shield className={cn(
          "w-4 h-4",
          lines >= 8 ? "text-red-500" : "text-orange-500"
        )} />
        <span className={cn(
          "font-bold",
          lines >= 8 ? "text-red-500" : "text-orange-500"
        )}>
          {lines}
        </span>
      </div>
    </div>
  );
};

// 导出 CSS 动画 keyframes (需要添加到 index.css)
export const battleEffectsStyles = `
@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes slide-right {
  0% { transform: translateX(0) translateY(-50%); opacity: 1; }
  100% { transform: translateX(100px) translateY(-50%); opacity: 0; }
}

.animate-bounce-in {
  animation: bounce-in 0.5s ease-out;
}

.animate-slide-right {
  animation: slide-right 0.8s ease-out forwards;
}
`;
