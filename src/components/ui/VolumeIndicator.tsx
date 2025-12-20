import React from 'react';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VolumeIndicatorProps {
  volume: number; // 0-100
  isMuted: boolean;
  isVisible: boolean;
  className?: string;
}

const VolumeIndicator: React.FC<VolumeIndicatorProps> = ({
  volume,
  isMuted,
  isVisible,
  className
}) => {
  // 计算弧形进度条的参数
  const radius = 36;
  const strokeWidth = 4;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // 弧形从底部开始，顺时针绘制 270 度
  const arcLength = circumference * 0.75; // 270度
  const progress = isMuted ? 0 : (volume / 100);
  const strokeDashoffset = arcLength - (progress * arcLength);

  // 根据音量选择图标
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX className="w-6 h-6 text-muted-foreground" />;
    } else if (volume < 33) {
      return <Volume className="w-6 h-6 text-primary" />;
    } else if (volume < 66) {
      return <Volume1 className="w-6 h-6 text-primary" />;
    } else {
      return <Volume2 className="w-6 h-6 text-primary" />;
    }
  };

  // 根据音量获取颜色
  const getVolumeColor = () => {
    if (isMuted || volume === 0) return 'hsl(var(--muted-foreground))';
    if (volume > 80) return 'hsl(var(--destructive))';
    if (volume > 60) return 'hsl(var(--chart-4))'; // 橙色警告
    return 'hsl(var(--primary))';
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]",
        "pointer-events-none",
        isVisible ? "animate-volume-pop" : "animate-volume-fade",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* 背景圆形 */}
        <div className="absolute inset-0 rounded-full bg-background/90 backdrop-blur-md shadow-2xl border border-border/50" 
          style={{ width: radius * 2 + 16, height: radius * 2 + 16 }} 
        />
        
        {/* SVG 弧形进度条 */}
        <svg
          width={radius * 2 + 16}
          height={radius * 2 + 16}
          className="relative z-10 -rotate-[135deg]"
        >
          {/* 背景弧 */}
          <circle
            stroke="hsl(var(--muted) / 0.5)"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            r={normalizedRadius}
            cx={radius + 8}
            cy={radius + 8}
            strokeLinecap="round"
          />
          {/* 进度弧 */}
          <circle
            stroke={getVolumeColor()}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            r={normalizedRadius}
            cx={radius + 8}
            cy={radius + 8}
            strokeLinecap="round"
            className="transition-all duration-150 ease-out"
            style={{
              filter: volume > 60 ? `drop-shadow(0 0 6px ${getVolumeColor()})` : 'none'
            }}
          />
        </svg>

        {/* 中央内容 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          {getVolumeIcon()}
          <span className={cn(
            "text-sm font-bold mt-1 tabular-nums transition-colors duration-150",
            isMuted ? "text-muted-foreground" : "text-foreground"
          )}>
            {isMuted ? 'MUTE' : `${Math.round(volume)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VolumeIndicator;
