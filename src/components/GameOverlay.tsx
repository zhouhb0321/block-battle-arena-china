
import React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface GameOverlayProps {
  paused: boolean;
  gameOver: boolean;
  score: number;
  lines: number;
  totalAttack: number;
  pps: number;
  apm: number;
  onReset: () => void;
  onBackToMenu?: () => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({
  paused,
  gameOver,
  score,
  lines,
  totalAttack,
  pps,
  apm,
  onReset,
  onBackToMenu
}) => {
  const { t } = useLanguage();
  if (paused) {
    return (
      <div className="absolute inset-0 bg-black/75 flex items-center justify-center rounded-lg">
        <div className="text-white text-center">
          <div className="text-2xl font-bold mb-4">{t('game.game_paused')}</div>
          {onBackToMenu && (
            <Button onClick={onBackToMenu} variant="outline" className="mb-2">
              {t('game.back_to_menu')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="absolute inset-0 bg-black/90 flex items-center justify-center rounded-lg">
        <div className="text-white text-center p-6 bg-card rounded-lg border border-border">
          <div className="text-3xl mb-4 font-bold text-game-red">{t('game.game_over')}</div>
          <div className="space-y-2 mb-6">
            <div>{t('game.final_score')}: <span className="font-bold text-game-yellow">{score.toLocaleString()}</span></div>
            <div>{t('game.lines_cleared')}: <span className="font-bold">{lines}</span></div>
            <div>{t('game.attack_sent')}: <span className="font-bold text-game-red">{totalAttack}</span></div>
            <div>{t('game.pps')}: <span className="font-bold">{pps.toFixed(2)}</span></div>
            <div>{t('game.apm')}: <span className="font-bold">{apm.toFixed(1)}</span></div>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={onReset} className="bg-game-blue hover:bg-game-blue/80">
              {t('game.restart')}
            </Button>
            {onBackToMenu && (
              <Button onClick={onBackToMenu} variant="outline">
                {t('game.back_to_menu')}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GameOverlay;
