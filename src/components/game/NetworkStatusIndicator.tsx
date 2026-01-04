/**
 * 网络状态指示器组件
 * 显示 ping 值和连接状态
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NetworkStatusIndicatorProps {
  isConnected: boolean;
  ping: number | null;
  reconnecting?: boolean;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  className?: string;
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  isConnected,
  ping,
  reconnecting = false,
  reconnectAttempt = 0,
  maxReconnectAttempts = 5,
  className
}) => {
  // 根据 ping 值确定连接质量
  const getConnectionQuality = () => {
    if (!isConnected || ping === null) return 'disconnected';
    if (ping <= 50) return 'excellent';
    if (ping <= 100) return 'good';
    if (ping <= 200) return 'fair';
    return 'poor';
  };

  const quality = getConnectionQuality();

  const getQualityColor = () => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-green-400';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      default: return 'text-destructive';
    }
  };

  const getQualityBars = () => {
    switch (quality) {
      case 'excellent': return 4;
      case 'good': return 3;
      case 'fair': return 2;
      case 'poor': return 1;
      default: return 0;
    }
  };

  const getQualityLabel = () => {
    switch (quality) {
      case 'excellent': return '极佳';
      case 'good': return '良好';
      case 'fair': return '一般';
      case 'poor': return '较差';
      default: return '断开';
    }
  };

  const bars = getQualityBars();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md",
            "bg-background/60 backdrop-blur-sm border border-border/50",
            reconnecting && "animate-pulse",
            className
          )}>
            {/* 连接图标 */}
            {isConnected ? (
              <Wifi className={cn("w-4 h-4", getQualityColor())} />
            ) : reconnecting ? (
              <AlertTriangle className="w-4 h-4 text-yellow-500 animate-bounce" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}

            {/* Ping 值显示 */}
            {isConnected && ping !== null && (
              <span className={cn(
                "text-xs font-mono font-medium",
                getQualityColor()
              )}>
                {ping}ms
              </span>
            )}

            {/* 重连状态 */}
            {reconnecting && (
              <span className="text-xs text-yellow-500">
                重连中 ({reconnectAttempt}/{maxReconnectAttempts})
              </span>
            )}

            {/* 信号强度条 */}
            <div className="flex items-end gap-0.5 h-3">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "w-1 rounded-sm transition-all",
                    level <= bars ? getQualityColor().replace('text-', 'bg-') : "bg-muted-foreground/30"
                  )}
                  style={{ height: `${level * 3}px` }}
                />
              ))}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <div className="font-medium">网络状态: {getQualityLabel()}</div>
            {ping !== null && <div>延迟: {ping}ms</div>}
            {reconnecting && (
              <div className="text-yellow-500">
                正在尝试重新连接...
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default NetworkStatusIndicator;
