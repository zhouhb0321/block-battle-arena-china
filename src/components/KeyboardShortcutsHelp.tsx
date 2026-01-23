import React from 'react';
import { BaseModal } from '@/components/ui/unified-modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { Keyboard, ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Space, RotateCw, RotateCcw, Pause, Gamepad2 } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { key: string | React.ReactNode; description: string }[];
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: t('shortcuts.gameControls'),
      shortcuts: [
        { key: <><ArrowLeft className="w-4 h-4" /> / A</>, description: t('settings.moveLeft') },
        { key: <><ArrowRight className="w-4 h-4" /> / D</>, description: t('settings.moveRight') },
        { key: <><ArrowDown className="w-4 h-4" /> / S</>, description: t('settings.softDrop') },
        { key: <><Space className="w-4 h-4" /> / W</>, description: t('settings.hardDrop') },
        { key: <><ArrowUp className="w-4 h-4" /> / X</>, description: t('settings.rotateClockwise') },
        { key: 'Z / Ctrl', description: t('settings.rotateCounterclockwise') },
        { key: 'A (Hold)', description: t('settings.rotate180') },
        { key: 'C / Shift', description: t('settings.hold') },
        { key: 'Escape / P', description: t('settings.pause') },
      ]
    },
    {
      title: t('shortcuts.navigation'),
      shortcuts: [
        { key: 'P', description: t('shortcuts.practice') },
        { key: 'S', description: t('nav.settings') },
        { key: 'R', description: t('replay.title') },
        { key: 'H', description: t('shortcuts.history') },
        { key: 'L', description: t('nav.leaderboard') },
        { key: 'F1 / ?', description: t('shortcuts.openHelp') },
      ]
    },
    {
      title: t('shortcuts.replayControls'),
      shortcuts: [
        { key: 'Space', description: t('shortcuts.playPause') },
        { key: <><ArrowLeft className="w-4 h-4" /></>, description: t('shortcuts.rewind5s') },
        { key: <><ArrowRight className="w-4 h-4" /></>, description: t('shortcuts.forward5s') },
        { key: '1-4', description: t('shortcuts.changeSpeed') },
        { key: 'R', description: t('shortcuts.restart') },
      ]
    }
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5" />
          <span>{t('shortcuts.title')}</span>
        </div>
      }
      size="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shortcutGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            <h3 className="font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-primary" />
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                  <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-muted rounded border border-border min-w-fit">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>{t('shortcuts.tip')}:</strong> {t('shortcuts.tipContent')}
        </p>
      </div>
    </BaseModal>
  );
};

export default KeyboardShortcutsHelp;
