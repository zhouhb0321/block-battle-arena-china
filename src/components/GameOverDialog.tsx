import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RotateCcw, Home, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBadgeUnlocker } from '@/hooks/useBadgeUnlocker';

interface GameOverDialogProps {
  isOpen: boolean;
  onRestart: () => void;
  onContinue?: () => void;
  onBackToMenu: () => void;
  score: number;
  lines: number;
  level: number;
  time: number;
  gameMode: string;
  isEndlessMode?: boolean;
  isNewRecord?: boolean;
  stats?: {
    score: number;
    lines: number;
    level: number;
    time: number;
    pps: number;
    apm: number;
    gameMode: string;
  };
}

const GameOverDialog: React.FC<GameOverDialogProps> = ({
  isOpen,
  onRestart,
  onContinue,
  onBackToMenu,
  score,
  lines,
  level,
  time,
  gameMode,
  isEndlessMode = false,
  isNewRecord = false,
}) => {
  const { t } = useLanguage();
  const { checkUnlocks } = useBadgeUnlocker();

  // 游戏结束时检查徽章解锁
  useEffect(() => {
    if (isOpen) {
      checkUnlocks();
    }
  }, [isOpen, checkUnlocks]);

  const formatTime = (seconds: number): string => {
    // For 2-minute challenge modes, show milliseconds precision and clamp to 120 seconds
    const isTimeAttack = gameMode === 'timeAttack2' || gameMode === 'ultra2min';
    
    if (isTimeAttack) {
      const clampedSeconds = Math.min(seconds, 120);
      const mins = Math.floor(clampedSeconds / 60);
      const secs = Math.floor(clampedSeconds % 60);
      const ms = Math.floor((clampedSeconds % 1) * 1000);
      return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    
    // For other modes, use standard mm:ss format
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {isEndlessMode ? t('game.levelComplete') : t('game.gameOver')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isEndlessMode 
              ? t('game.endlessComplete')
              : t('game.gameOverDescription')
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {isNewRecord && (
            <div className="mb-4 text-center text-lg font-semibold text-yellow-400 animate-pulse">
              🎉 New Record! 🎉
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-primary">{score.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">{t('game.score')}</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-primary">{lines}</div>
              <div className="text-sm text-muted-foreground">{t('game.lines')}</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-primary">{level}</div>
              <div className="text-sm text-muted-foreground">{t('game.level')}</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-primary">{formatTime(time)}</div>
              <div className="text-sm text-muted-foreground">{t('game.time')}</div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          {isEndlessMode && onContinue && (
            <Button onClick={onContinue} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              {t('game.continue')}
            </Button>
          )}
          
          <Button onClick={onRestart} variant="outline" className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            {t('game.restart')}
          </Button>
          
          <Button onClick={onBackToMenu} variant="secondary" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            {t('nav.backToMenu')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GameOverDialog;