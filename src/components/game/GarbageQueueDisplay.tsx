import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface GarbageQueueDisplayProps {
  incomingGarbage: number;
  outgoingGarbage?: number;
  maxDisplay?: number;
  orientation?: 'vertical' | 'horizontal';
  showWarning?: boolean;
  className?: string;
}

const GarbageQueueDisplay: React.FC<GarbageQueueDisplayProps> = ({
  incomingGarbage,
  outgoingGarbage = 0,
  maxDisplay = 20,
  orientation = 'vertical',
  showWarning = true,
  className
}) => {
  const displayIncoming = Math.min(incomingGarbage, maxDisplay);
  const displayOutgoing = Math.min(outgoingGarbage, maxDisplay);
  
  const dangerLevel = incomingGarbage >= 12 ? 'critical' : 
                      incomingGarbage >= 8 ? 'danger' : 
                      incomingGarbage >= 4 ? 'warning' : 'safe';

  const renderVerticalQueue = () => (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {/* Outgoing attack indicator */}
      {outgoingGarbage > 0 && (
        <div className="relative mb-2">
          <div className="flex flex-col-reverse gap-px">
            {Array.from({ length: displayOutgoing }).map((_, i) => (
              <div
                key={`out-${i}`}
                className={cn(
                  "w-3 h-2 rounded-sm transition-all animate-pulse",
                  "bg-green-500"
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
          {outgoingGarbage > 0 && (
            <div className="text-[10px] text-green-500 font-bold text-center mt-0.5">
              +{outgoingGarbage}
            </div>
          )}
        </div>
      )}

      {/* Incoming garbage indicator */}
      <div className="relative">
        {showWarning && dangerLevel !== 'safe' && (
          <AlertTriangle 
            className={cn(
              "w-4 h-4 mb-1 mx-auto",
              dangerLevel === 'critical' && "text-red-500 animate-bounce",
              dangerLevel === 'danger' && "text-orange-500 animate-pulse",
              dangerLevel === 'warning' && "text-yellow-500"
            )}
          />
        )}
        
        <div className="flex flex-col-reverse gap-px">
          {Array.from({ length: displayIncoming }).map((_, i) => (
            <div
              key={`in-${i}`}
              className={cn(
                "w-3 h-2 rounded-sm transition-all",
                dangerLevel === 'critical' && "bg-red-600 animate-pulse",
                dangerLevel === 'danger' && "bg-red-500",
                dangerLevel === 'warning' && "bg-orange-500",
                dangerLevel === 'safe' && "bg-yellow-500"
              )}
              style={{ 
                animationDelay: `${i * 50}ms`,
                opacity: 1 - (i / maxDisplay) * 0.3
              }}
            />
          ))}
        </div>
        
        {incomingGarbage > 0 && (
          <div className={cn(
            "text-[10px] font-bold text-center mt-0.5",
            dangerLevel === 'critical' && "text-red-500",
            dangerLevel === 'danger' && "text-orange-500",
            dangerLevel === 'warning' && "text-yellow-500",
            dangerLevel === 'safe' && "text-muted-foreground"
          )}>
            {incomingGarbage}
          </div>
        )}
      </div>
    </div>
  );

  const renderHorizontalQueue = () => (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Incoming */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">IN:</span>
        <div className="flex gap-px">
          {Array.from({ length: Math.min(displayIncoming, 10) }).map((_, i) => (
            <div
              key={`in-${i}`}
              className={cn(
                "w-2 h-4 rounded-sm",
                dangerLevel === 'critical' && "bg-red-600",
                dangerLevel === 'danger' && "bg-red-500",
                dangerLevel === 'warning' && "bg-orange-500",
                dangerLevel === 'safe' && "bg-yellow-500"
              )}
            />
          ))}
        </div>
        {incomingGarbage > 0 && (
          <span className={cn(
            "text-xs font-bold",
            dangerLevel === 'critical' && "text-red-500",
            dangerLevel !== 'critical' && "text-muted-foreground"
          )}>
            {incomingGarbage}
          </span>
        )}
      </div>

      {/* Outgoing */}
      {outgoingGarbage > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">OUT:</span>
          <div className="flex gap-px">
            {Array.from({ length: Math.min(displayOutgoing, 10) }).map((_, i) => (
              <div
                key={`out-${i}`}
                className="w-2 h-4 rounded-sm bg-green-500"
              />
            ))}
          </div>
          <span className="text-xs font-bold text-green-500">+{outgoingGarbage}</span>
        </div>
      )}
    </div>
  );

  return orientation === 'vertical' ? renderVerticalQueue() : renderHorizontalQueue();
};

export default GarbageQueueDisplay;
