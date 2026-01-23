import React, { useState, useEffect } from 'react';
import { BaseModal } from '@/components/ui/unified-modal';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Gamepad2, ArrowRight, ArrowLeft, RotateCw, ArrowDown, Space, 
  Users, Trophy, Zap, Target, ChevronRight, ChevronLeft, X, Check,
  Keyboard, Timer, Star, Swords
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  category: 'basics' | 'modes' | 'advanced';
}

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ isOpen, onClose, onComplete }) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const tutorialSteps: TutorialStep[] = [
    // Basic Controls
    {
      id: 'welcome',
      title: t('tutorial.welcome'),
      description: t('tutorial.welcomeDesc'),
      icon: <Gamepad2 className="w-8 h-8 text-primary" />,
      category: 'basics',
      content: (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Gamepad2 className="w-12 h-12 text-primary" />
          </div>
          <p className="text-muted-foreground">{t('tutorial.welcomeContent')}</p>
        </div>
      )
    },
    {
      id: 'movement',
      title: t('tutorial.movement'),
      description: t('tutorial.movementDesc'),
      icon: <ArrowRight className="w-8 h-8 text-blue-500" />,
      category: 'basics',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
            <div className="col-start-2 p-4 bg-muted rounded-lg text-center">
              <ArrowDown className="w-6 h-6 mx-auto mb-2" />
              <span className="text-xs">{t('settings.softDrop')}</span>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <ArrowLeft className="w-6 h-6 mx-auto mb-2" />
              <span className="text-xs">{t('settings.moveLeft')}</span>
            </div>
            <div className="p-4 bg-primary/20 rounded-lg text-center border-2 border-primary">
              <Space className="w-6 h-6 mx-auto mb-2" />
              <span className="text-xs font-medium">{t('settings.hardDrop')}</span>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <ArrowRight className="w-6 h-6 mx-auto mb-2" />
              <span className="text-xs">{t('settings.moveRight')}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">{t('tutorial.movementTip')}</p>
        </div>
      )
    },
    {
      id: 'rotation',
      title: t('tutorial.rotation'),
      description: t('tutorial.rotationDesc'),
      icon: <RotateCw className="w-8 h-8 text-green-500" />,
      category: 'basics',
      content: (
        <div className="space-y-4">
          <div className="flex justify-center gap-8">
            <div className="text-center p-4 bg-muted rounded-lg">
              <RotateCw className="w-10 h-10 mx-auto mb-2 text-green-500" />
              <kbd className="px-2 py-1 bg-background rounded text-sm">↑ / X</kbd>
              <p className="text-xs mt-2">{t('tutorial.clockwise')}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <RotateCw className="w-10 h-10 mx-auto mb-2 text-amber-500 scale-x-[-1]" />
              <kbd className="px-2 py-1 bg-background rounded text-sm">Z / Ctrl</kbd>
              <p className="text-xs mt-2">{t('tutorial.counterClockwise')}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">{t('tutorial.rotationTip')}</p>
        </div>
      )
    },
    {
      id: 'hold',
      title: t('tutorial.holdPiece'),
      description: t('tutorial.holdPieceDesc'),
      icon: <Keyboard className="w-8 h-8 text-purple-500" />,
      category: 'basics',
      content: (
        <div className="space-y-4 text-center">
          <div className="flex justify-center gap-4 items-center">
            <div className="w-16 h-16 bg-cyan-500/20 border-2 border-cyan-500 rounded flex items-center justify-center">
              <span className="text-2xl font-bold text-cyan-500">I</span>
            </div>
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
              <span className="text-sm text-muted-foreground">HOLD</span>
            </div>
          </div>
          <kbd className="px-3 py-1 bg-muted rounded text-sm">C / Shift</kbd>
          <p className="text-sm text-muted-foreground">{t('tutorial.holdTip')}</p>
        </div>
      )
    },
    // Game Modes
    {
      id: 'modes-sprint',
      title: t('tutorial.sprintMode'),
      description: t('tutorial.sprintModeDesc'),
      icon: <Timer className="w-8 h-8 text-orange-500" />,
      category: 'modes',
      content: (
        <div className="space-y-4 text-center">
          <div className="w-20 h-20 mx-auto bg-orange-500/10 rounded-full flex items-center justify-center">
            <Timer className="w-10 h-10 text-orange-500" />
          </div>
          <div className="flex justify-center gap-4">
            <div className="px-4 py-2 bg-muted rounded-lg">
              <span className="font-bold">40L</span>
              <p className="text-xs text-muted-foreground">{t('tutorial.lines40')}</p>
            </div>
            <div className="px-4 py-2 bg-muted rounded-lg">
              <span className="font-bold">100L</span>
              <p className="text-xs text-muted-foreground">{t('tutorial.lines100')}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('tutorial.sprintTip')}</p>
        </div>
      )
    },
    {
      id: 'modes-ultra',
      title: t('tutorial.ultraMode'),
      description: t('tutorial.ultraModeDesc'),
      icon: <Target className="w-8 h-8 text-blue-500" />,
      category: 'modes',
      content: (
        <div className="space-y-4 text-center">
          <div className="w-20 h-20 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
            <Target className="w-10 h-10 text-blue-500" />
          </div>
          <p className="text-lg font-semibold">2:00 / 5:00</p>
          <p className="text-sm text-muted-foreground">{t('tutorial.ultraTip')}</p>
        </div>
      )
    },
    {
      id: 'modes-multiplayer',
      title: t('tutorial.multiplayerMode'),
      description: t('tutorial.multiplayerModeDesc'),
      icon: <Users className="w-8 h-8 text-green-500" />,
      category: 'modes',
      content: (
        <div className="space-y-4 text-center">
          <div className="flex justify-center gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <Swords className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="text-sm font-medium">1v1</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">Team</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-sm font-medium">Ranked</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('tutorial.multiplayerTip')}</p>
        </div>
      )
    },
    // Advanced Techniques
    {
      id: 'advanced-tspin',
      title: t('tutorial.tSpin'),
      description: t('tutorial.tSpinDesc'),
      icon: <Zap className="w-8 h-8 text-purple-500" />,
      category: 'advanced',
      content: (
        <div className="space-y-4 text-center">
          <div className="w-20 h-20 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-purple-500">T</span>
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            <div className="p-2 bg-muted rounded text-center">
              <p className="font-bold text-primary">TSS</p>
              <p className="text-xs">+800</p>
            </div>
            <div className="p-2 bg-muted rounded text-center">
              <p className="font-bold text-primary">TSD</p>
              <p className="text-xs">+1200</p>
            </div>
            <div className="p-2 bg-muted rounded text-center">
              <p className="font-bold text-primary">TST</p>
              <p className="text-xs">+1600</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('tutorial.tSpinTip')}</p>
        </div>
      )
    },
    {
      id: 'advanced-combo',
      title: t('tutorial.combo'),
      description: t('tutorial.comboDesc'),
      icon: <Star className="w-8 h-8 text-amber-500" />,
      category: 'advanced',
      content: (
        <div className="space-y-4 text-center">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div 
                key={n} 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                  n <= 3 ? "bg-amber-500/20 text-amber-500" : "bg-primary/20 text-primary"
                )}
              >
                {n}x
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{t('tutorial.comboTip')}</p>
        </div>
      )
    },
    {
      id: 'advanced-b2b',
      title: t('tutorial.backToBack'),
      description: t('tutorial.backToBackDesc'),
      icon: <Zap className="w-8 h-8 text-cyan-500" />,
      category: 'advanced',
      content: (
        <div className="space-y-4 text-center">
          <div className="flex justify-center items-center gap-2">
            <div className="px-3 py-2 bg-cyan-500/20 rounded text-cyan-500 font-bold">Tetris</div>
            <ChevronRight className="w-4 h-4" />
            <div className="px-3 py-2 bg-purple-500/20 rounded text-purple-500 font-bold">T-Spin</div>
            <ChevronRight className="w-4 h-4" />
            <div className="px-3 py-2 bg-amber-500/20 rounded text-amber-500 font-bold">B2B x2</div>
          </div>
          <p className="text-sm text-muted-foreground">{t('tutorial.b2bTip')}</p>
        </div>
      )
    },
    // Complete
    {
      id: 'complete',
      title: t('tutorial.complete'),
      description: t('tutorial.completeDesc'),
      icon: <Check className="w-8 h-8 text-green-500" />,
      category: 'basics',
      content: (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
            <Check className="w-12 h-12 text-green-500" />
          </div>
          <p className="text-muted-foreground">{t('tutorial.completeContent')}</p>
          <Button onClick={onComplete} size="lg" className="mt-4">
            {t('tutorial.startPlaying')}
          </Button>
        </div>
      )
    }
  ];

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const currentStepData = tutorialSteps[currentStep];

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding-completed', 'true');
    onClose();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basics': return 'bg-blue-500/10 text-blue-500';
      case 'modes': return 'bg-green-500/10 text-green-500';
      case 'advanced': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'basics': return t('tutorial.categoryBasics');
      case 'modes': return t('tutorial.categoryModes');
      case 'advanced': return t('tutorial.categoryAdvanced');
      default: return category;
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      showCloseButton={false}
      closeOnEscape={false}
      closeOnOverlayClick={false}
    >
      <div className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className={cn("px-2 py-1 rounded text-xs font-medium", getCategoryColor(currentStepData.category))}>
              {getCategoryLabel(currentStepData.category)}
            </span>
            <span className="text-muted-foreground">{currentStep + 1} / {tutorialSteps.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] flex flex-col">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              {currentStepData.icon}
            </div>
            <h2 className="text-xl font-bold">{currentStepData.title}</h2>
            <p className="text-muted-foreground mt-1">{currentStepData.description}</p>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            {currentStepData.content}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
            <X className="w-4 h-4 mr-2" />
            {t('tutorial.skip')}
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('common.back')}
            </Button>
            
            {currentStep < tutorialSteps.length - 1 ? (
              <Button onClick={handleNext}>
                {t('tutorial.next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-1" />
                {t('tutorial.finish')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default OnboardingTutorial;
