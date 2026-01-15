import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Target, Infinity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GAME_MODES, type GameMode } from '@/utils/gameTypes';

interface GameModeSelectorProps {
  onModeSelect: (mode: GameMode) => void;
  onBack: () => void;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onModeSelect, onBack }) => {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  const handleModeClick = (mode: GameMode) => {
    setSelectedMode(mode);
  };

  const handleStartGame = () => {
    if (selectedMode) {
      onModeSelect(selectedMode);
    }
  };

  const formatTimeLimit = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getModeIcon = (mode: GameMode) => {
    if (mode.isTimeAttack) return <Clock className="w-5 h-5" />;
    if (mode.targetLines) return <Target className="w-5 h-5" />;
    return <Infinity className="w-5 h-5" />;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={onBack} className="mb-4">
          {t('nav.backToMenu')}
        </Button>
        <h2 className="text-2xl font-bold text-foreground">{t('mode.select')}</h2>
        <div className="w-20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {GAME_MODES.map((mode) => (
          <Card
            key={mode.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedMode?.id === mode.id
                ? 'ring-2 ring-primary bg-primary/10'
                : 'hover:bg-accent'
            }`}
            onClick={() => handleModeClick(mode)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getModeIcon(mode)}
                  {mode.displayName}
                </CardTitle>
                {mode.isTimeAttack && (
                  <Badge variant="secondary">{t('mode.timed')}</Badge>
                )}
                {mode.targetLines && (
                  <Badge variant="outline">{t('mode.sprint')}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">
                {mode.description}
              </CardDescription>
              
              <div className="space-y-1 text-sm">
                {mode.targetLines && (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-500" />
                    <span>{t('mode.target')}: {mode.targetLines} {t('game.lines')}</span>
                  </div>
                )}
                {mode.timeLimit && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>{t('mode.timeLimit')}: {formatTimeLimit(mode.timeLimit)}</span>
                  </div>
                )}
                {!mode.targetLines && !mode.timeLimit && (
                  <div className="flex items-center gap-2">
                    <Infinity className="w-4 h-4 text-purple-500" />
                    <span>{t('mode.unlimited')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedMode && (
        <div className="text-center">
          <Card className="max-w-md mx-auto mb-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                {getModeIcon(selectedMode)}
                {selectedMode.displayName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {selectedMode.description}
              </p>
              {selectedMode.targetLines && (
                <p className="text-sm">{t('mode.target')}: {selectedMode.targetLines} {t('game.lines')}</p>
              )}
              {selectedMode.timeLimit && (
                <p className="text-sm">{t('mode.timeLimit')}: {formatTimeLimit(selectedMode.timeLimit)}</p>
              )}
            </CardContent>
          </Card>
          
          <Button onClick={handleStartGame} size="lg" className="px-8">
            {t('mode.startGame')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default GameModeSelector;
