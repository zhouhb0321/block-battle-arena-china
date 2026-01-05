/**
 * 观战/参战模式切换按钮
 * 显著的切换按钮，用于在观战和参战之间切换
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Gamepad2, 
  Users, 
  Loader2,
  Coffee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SpectatorModeToggleProps {
  isSpectating: boolean;
  spectatorCount: number;
  onToggle: () => void;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  className?: string;
}

const SpectatorModeToggle: React.FC<SpectatorModeToggleProps> = ({
  isSpectating,
  spectatorCount,
  onToggle,
  disabled = false,
  loading = false,
  compact = false,
  className
}) => {
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isSpectating ? "outline" : "default"}
              size="icon"
              onClick={onToggle}
              disabled={disabled || loading}
              className={cn(
                "relative transition-all",
                isSpectating 
                  ? "border-amber-500/50 text-amber-500 hover:bg-amber-500/10" 
                  : "bg-primary hover:bg-primary/90",
                className
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSpectating ? (
                <Eye className="h-4 w-4" />
              ) : (
                <Gamepad2 className="h-4 w-4" />
              )}
              
              {spectatorCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {spectatorCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isSpectating ? '点击参战' : '点击观战'}</p>
            {spectatorCount > 0 && <p className="text-xs text-muted-foreground">{spectatorCount} 人观战中</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant={isSpectating ? "outline" : "default"}
      size="lg"
      onClick={onToggle}
      disabled={disabled || loading}
      className={cn(
        "relative min-w-[160px] h-12 gap-3 transition-all font-semibold",
        isSpectating 
          ? "border-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500" 
          : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg",
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>切换中...</span>
        </>
      ) : isSpectating ? (
        <>
          <Coffee className="h-5 w-5" />
          <span>观战中</span>
          <Gamepad2 className="h-4 w-4 ml-1 opacity-60" />
        </>
      ) : (
        <>
          <Gamepad2 className="h-5 w-5" />
          <span>参战中</span>
          <Eye className="h-4 w-4 ml-1 opacity-60" />
        </>
      )}
      
      {spectatorCount > 0 && (
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 gap-1 px-2"
        >
          <Users className="h-3 w-3" />
          {spectatorCount}
        </Badge>
      )}
    </Button>
  );
};

export default SpectatorModeToggle;
