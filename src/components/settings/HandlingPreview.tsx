import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameSettings } from '@/utils/gameTypes';

interface HandlingPreviewProps {
  settings: GameSettings;
}

const HandlingPreview: React.FC<HandlingPreviewProps> = ({ settings }) => {
  const [position, setPosition] = useState(3);
  const [dasProgress, setDasProgress] = useState(0);
  const [arrActive, setArrActive] = useState(false);
  const keyPressTime = useRef<number>(0);
  const animationFrame = useRef<number>();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (keyPressTime.current === 0) {
          keyPressTime.current = performance.now();
          // Initial move
          setPosition(prev => {
            const newPos = e.code === 'ArrowLeft' ? Math.max(0, prev - 1) : Math.min(5, prev + 1);
            return newPos;
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        keyPressTime.current = 0;
        setDasProgress(0);
        setArrActive(false);
        if (animationFrame.current) {
          cancelAnimationFrame(animationFrame.current);
        }
      }
    };

    const processHeldKey = (timestamp: number) => {
      if (keyPressTime.current > 0) {
        const heldTime = timestamp - keyPressTime.current;
        
        if (heldTime < settings.das) {
          // DAS charging
          setDasProgress((heldTime / settings.das) * 100);
          setArrActive(false);
        } else {
          // ARR active
          setDasProgress(100);
          setArrActive(true);
        }
        
        animationFrame.current = requestAnimationFrame(processHeldKey);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    animationFrame.current = requestAnimationFrame(processHeldKey);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [settings.das, settings.arr]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">实时预览</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground text-center">
          使用 ← → 键测试手感
        </div>
        
        {/* Mini game board */}
        <div className="flex justify-center gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 border-2 transition-all ${
                i === position
                  ? 'bg-primary border-primary scale-110'
                  : 'bg-muted border-border'
              }`}
            />
          ))}
        </div>

        {/* DAS Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>DAS</span>
            <span>{dasProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-75"
              style={{ width: `${dasProgress}%` }}
            />
          </div>
        </div>

        {/* ARR Indicator */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">ARR 激活</span>
          <div className={`w-3 h-3 rounded-full ${arrActive ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-muted-foreground">DAS</div>
            <div className="font-bold">{settings.das}ms</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-muted-foreground">ARR</div>
            <div className="font-bold">{settings.arr}ms</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-muted-foreground">SDF</div>
            <div className="font-bold">{settings.sdf}x</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HandlingPreview;
