import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2, Grip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import EnhancedGameBoard from './EnhancedGameBoard';
import type { GamePiece } from '@/utils/gameTypes';

interface PictureInPictureReplayProps {
  board: number[][];
  currentPiece: GamePiece | null;
  ghostPiece: GamePiece | null;
  score: number;
  lines: number;
  level: number;
  isPlaying: boolean;
  playbackSpeed: number;
  currentTime: number;
  onClose: () => void;
  onMaximize: () => void;
}

export const PictureInPictureReplay: React.FC<PictureInPictureReplayProps> = ({
  board,
  currentPiece,
  ghostPiece,
  score,
  lines,
  level,
  isPlaying,
  playbackSpeed,
  currentTime,
  onClose,
  onMaximize
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 20 });
  const [size, setSize] = useState({ width: 400, height: 520 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 拖动逻辑
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - (isMinimized ? 60 : size.height), e.clientY - dragOffset.current.y));
        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        const newWidth = Math.max(280, Math.min(800, resizeStart.current.width + deltaX));
        const newHeight = Math.max(340, Math.min(900, resizeStart.current.height + deltaY));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, size.width, size.height, isMinimized]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      ref={containerRef}
      className="fixed z-[200] shadow-2xl border-2 border-primary/50 bg-card/95 backdrop-blur-md"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '300px' : `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none'
      }}
    >
      {/* 头部 - 可拖动区域 */}
      <div
        className="flex items-center justify-between p-2 bg-primary/10 border-b border-border cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Grip className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">回放播放器</span>
          {isPlaying && (
            <span className="text-xs text-primary animate-pulse">● 播放中</span>
          )}
        </div>
        <div className="flex items-center gap-1 no-drag">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMaximize}
            title="还原全屏"
          >
            <Maximize2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      {!isMinimized && (
        <div className="p-3 space-y-3 overflow-auto" style={{ maxHeight: `${size.height - 100}px` }}>
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-2 bg-muted/50 text-center">
              <div className="text-xs text-muted-foreground">得分</div>
              <div className="text-lg font-bold">{score.toLocaleString()}</div>
            </Card>
            <Card className="p-2 bg-muted/50 text-center">
              <div className="text-xs text-muted-foreground">行数</div>
              <div className="text-lg font-bold">{lines}</div>
            </Card>
            <Card className="p-2 bg-muted/50 text-center">
              <div className="text-xs text-muted-foreground">等级</div>
              <div className="text-lg font-bold">{level}</div>
            </Card>
          </div>

          {/* 游戏板 - 缩放以适应窗口 */}
          <div className="flex justify-center">
            <div style={{ transform: `scale(${Math.min(1, (size.width - 60) / 240)})`, transformOrigin: 'top center' }}>
              <EnhancedGameBoard
                board={board}
                currentPiece={currentPiece}
                ghostPiece={ghostPiece}
                cellSize={20}
                showGrid={true}
                clearingLines={[]}
              />
            </div>
          </div>

          {/* 底部信息 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span className="flex items-center gap-2">
              <span className={isPlaying ? 'text-primary' : ''}>{isPlaying ? '▶' : '⏸'}</span>
              <span>{playbackSpeed}x</span>
            </span>
          </div>
        </div>
      )}

      {/* 调整大小手柄 */}
      {!isMinimized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize no-drag"
          onMouseDown={handleResizeMouseDown}
          style={{
            background: 'linear-gradient(135deg, transparent 50%, hsl(var(--primary)) 50%)'
          }}
        />
      )}
    </Card>
  );
};
