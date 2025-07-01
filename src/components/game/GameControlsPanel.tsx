
import React from 'react';
import { Button } from '@/components/ui/button';

interface GameControlsPanelProps {
  onBackToMenu: () => void;
}

const GameControlsPanel: React.FC<GameControlsPanelProps> = ({
  onBackToMenu
}) => {
  return (
    <div className="absolute top-4 right-4 flex gap-2">
      <Button onClick={onBackToMenu} variant="outline" size="sm">
        返回菜单
      </Button>
    </div>
  );
};

export default GameControlsPanel;
