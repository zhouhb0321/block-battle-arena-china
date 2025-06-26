
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Keyboard, Volume2, Eye, Gamepad2 } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { GameSettings } from '@/utils/gameTypes';

interface GameSettingsDialogProps {
  trigger?: React.ReactNode;
}

const GameSettingsDialog: React.FC<GameSettingsDialogProps> = ({ trigger }) => {
  const { settings, saveSettings, loading } = useUserSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);

  const handleKeyRecord = (controlName: string) => {
    setRecordingKey(controlName);
    
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const newControls = {
        ...settings.controls,
        [controlName]: e.code
      };
      
      saveSettings({ controls: newControls });
      setRecordingKey(null);
      
      document.removeEventListener('keydown', handleKeyPress);
    };
    
    document.addEventListener('keydown', handleKeyPress, { once: true });
    
    // 5秒后超时
    setTimeout(() => {
      setRecordingKey(null);
      document.removeEventListener('keydown', handleKeyPress);
    }, 5000);
  };

  const getKeyDisplayName = (keyCode: string) => {
    const keyMap: { [key: string]: string } = {
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'Space': '空格',
      'KeyZ': 'Z',
      'KeyX': 'X',
      'KeyC': 'C',
      'KeyA': 'A',
      'Escape': 'Esc',
      'ShiftLeft': 'L-Shift',
      'ShiftRight': 'R-Shift',
      'ControlLeft': 'L-Ctrl',
      'ControlRight': 'R-Ctrl'
    };
    return keyMap[keyCode] || keyCode.replace('Key', '');
  };

  if (loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            游戏设置
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            游戏设置
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="controls" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="controls" className="flex items-center gap-1">
              <Keyboard className="w-4 h-4" />
              按键
            </TabsTrigger>
            <TabsTrigger value="timing" className="flex items-center gap-1">
              <Gamepad2 className="w-4 h-4" />
              操控
            </TabsTrigger>
            <TabsTrigger value="visual" className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              视觉
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-1">
              <Volume2 className="w-4 h-4" />
              音频
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="controls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">按键设置</CardTitle>
                <CardDescription>点击按钮自定义按键绑定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries({
                  moveLeft: '左移',
                  moveRight: '右移',
                  softDrop: '软降',
                  hardDrop: '硬降',
                  rotateClockwise: '顺时针旋转',
                  rotateCounterclockwise: '逆时针旋转',
                  rotate180: '180°旋转',
                  hold: '暂存',
                  pause: '暂停'
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="w-32">{label}</Label>
                    <Button
                      variant={recordingKey === key ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => handleKeyRecord(key)}
                      className="min-w-24"
                    >
                      {recordingKey === key 
                        ? '按下按键...' 
                        : getKeyDisplayName(settings.controls[key as keyof typeof settings.controls])
                      }
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">操控设置</CardTitle>
                <CardDescription>调整按键延迟和重复速率</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>DAS - 延迟自动移位 ({settings.das}ms)</Label>
                  <Slider
                    value={[settings.das]}
                    onValueChange={([value]) => saveSettings({ das: value })}
                    max={300}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    按住方向键后开始重复移动的延迟时间
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>ARR - 自动重复速率 ({settings.arr}ms)</Label>
                  <Slider
                    value={[settings.arr]}
                    onValueChange={([value]) => saveSettings({ arr: value })}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    重复移动的间隔时间，0表示瞬间移动
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>SDF - 软降速度 ({settings.sdf}倍)</Label>
                  <Slider
                    value={[settings.sdf]}
                    onValueChange={([value]) => saveSettings({ sdf: value })}
                    max={40}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    软降时方块下降速度的倍数
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="visual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">视觉设置</CardTitle>
                <CardDescription>调整游戏视觉效果</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>幽灵方块</Label>
                    <p className="text-xs text-muted-foreground">
                      显示方块落地位置的预览
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableGhost}
                    onCheckedChange={(checked) => saveSettings({ enableGhost: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="audio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">音频设置</CardTitle>
                <CardDescription>调整游戏音效</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>启用音效</Label>
                    <p className="text-xs text-muted-foreground">
                      开启或关闭游戏音效
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableSound}
                    onCheckedChange={(checked) => saveSettings({ enableSound: checked })}
                  />
                </div>
                
                {settings.enableSound && (
                  <div className="space-y-2">
                    <Label>主音量 ({settings.masterVolume}%)</Label>
                    <Slider
                      value={[settings.masterVolume]}
                      onValueChange={([value]) => saveSettings({ masterVolume: value })}
                      max={100}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end pt-4">
          <Button onClick={() => setIsOpen(false)}>
            完成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameSettingsDialog;
