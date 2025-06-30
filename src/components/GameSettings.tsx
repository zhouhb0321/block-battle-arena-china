
import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameSettings } from '@/utils/gameTypes';

interface GameSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const GameSettings: React.FC<GameSettingsProps> = ({ isOpen, onClose }) => {
  const { gameSettings, updateGameSettings } = useGame();
  const { t } = useLanguage();
  const [tempSettings, setTempSettings] = useState<GameSettings>(gameSettings);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);

  const handleKeyRecord = (controlKey: string) => {
    setRecordingKey(controlKey);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (recordingKey) {
      event.preventDefault();
      setTempSettings(prev => ({
        ...prev,
        controls: {
          ...prev.controls,
          [recordingKey]: event.code
        }
      }));
      setRecordingKey(null);
    }
  };

  React.useEffect(() => {
    if (recordingKey) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [recordingKey]);

  const handleSave = () => {
    updateGameSettings(tempSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: GameSettings = {
      das: 167,
      arr: 33,
      sdf: 20,
      controls: {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        softDrop: 'ArrowDown',
        hardDrop: 'Space',
        rotateClockwise: 'ArrowUp',
        rotateCounterclockwise: 'KeyZ',
        rotate180: 'KeyA',
        hold: 'KeyC',
        pause: 'Escape',
        backToMenu: 'KeyB'
      },
      enableGhost: true,
      enableSound: true,
      masterVolume: 50,
      backgroundMusic: '',
      musicVolume: 30
    };
    setTempSettings(defaultSettings);
  };

  const controlLabels = {
    moveLeft: '左移',
    moveRight: '右移',
    softDrop: '软降',
    hardDrop: '硬降',
    rotateClockwise: '顺时针旋转',
    rotateCounterclockwise: '逆时针旋转',
    rotate180: '180°旋转',
    hold: '暂存',
    pause: '暂停',
    backToMenu: '返回菜单'
  };

  const formatKeyName = (keyCode: string): string => {
    const keyMap: { [key: string]: string } = {
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'Space': '空格',
      'Escape': 'Esc',
      'KeyZ': 'Z',
      'KeyA': 'A',
      'KeyC': 'C',
      'KeyB': 'B'
    };
    return keyMap[keyCode] || keyCode.replace('Key', '');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>游戏设置</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="controls" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="controls">控制设置</TabsTrigger>
            <TabsTrigger value="timing">时间设置</TabsTrigger>
          </TabsList>
          
          <TabsContent value="controls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>键盘控制</CardTitle>
                <CardDescription>点击按钮来重新设置键位</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(tempSettings.controls).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 border rounded">
                      <Label className="font-medium">{controlLabels[key as keyof typeof controlLabels]}</Label>
                      <Button
                        variant={recordingKey === key ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleKeyRecord(key)}
                        className="min-w-20"
                      >
                        {recordingKey === key ? '按键...' : formatKeyName(value)}
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleReset} variant="outline">
                    恢复默认
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>时间控制设置</CardTitle>
                <CardDescription>调整游戏响应速度和手感</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>DAS (Delayed Auto Shift) - 键盘重复延迟: {tempSettings.das}ms</Label>
                  <Slider
                    value={[tempSettings.das]}
                    onValueChange={(value) => setTempSettings(prev => ({ ...prev, das: value[0] }))}
                    max={200}
                    min={0}
                    step={10}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    按住方向键后，开始重复移动前的延迟时间
                  </p>
                </div>
                
                <div>
                  <Label>ARR (Auto Repeat Rate) - 键盘重复速率: {tempSettings.arr}ms</Label>
                  <Slider
                    value={[tempSettings.arr]}
                    onValueChange={(value) => setTempSettings(prev => ({ ...prev, arr: value[0] }))}
                    max={50}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    重复移动时每次移动的间隔时间（0为无限快）
                  </p>
                </div>
                
                <div>
                  <Label>SDF (Soft Drop Factor) - 软降速度: {tempSettings.sdf}x</Label>
                  <Slider
                    value={[tempSettings.sdf]}
                    onValueChange={(value) => setTempSettings(prev => ({ ...prev, sdf: value[0] }))}
                    max={50}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    软降时的下落速度倍数
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>保存设置</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameSettings;
