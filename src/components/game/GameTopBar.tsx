
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pause, Play, Undo2, Redo2 } from 'lucide-react';
import type { GameMode } from '@/utils/gameTypes';

interface GameTopBarProps {
  gameMode: GameMode;
  gameReallyStarted: boolean;
  isPaused: boolean;
  gameOver: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onBackToMenu?: () => void;
  onPauseResume: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const GameTopBar: React.FC<GameTopBarProps> = ({
  gameMode,
  gameReallyStarted,
  isPaused,
  gameOver,
  canUndo,
  canRedo,
  onBackToMenu,
  onPauseResume,
  onUndo,
  onRedo
}) => {
  return (
    <div className="mb-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        {onBackToMenu && (
          <Button
            onClick={onBackToMenu}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回菜单
          </Button>
        )}
        
        {gameReallyStarted && (
          <>
            <Button
              onClick={onPauseResume}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={gameOver}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? '继续' : '暂停'}
            </Button>
            
            <Button
              onClick={onUndo}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={!canUndo || gameOver}
              title="撤销 (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
              撤销
            </Button>
            
            <Button
              onClick={onRedo}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={!canRedo || gameOver}
              title="重做 (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
              重做
            </Button>
          </>
        )}
      </div>
      
      <div className="text-lg font-semibold">
        {gameMode.displayName}
      </div>
    </div>
  );
};

export default GameTopBar;
