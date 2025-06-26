
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameSettings } from '@/utils/gameTypes';

interface ControlsTabProps {
  settings: GameSettings;
  recordingKey: string | null;
  onKeyRecord: (controlName: string) => void;
  onSettingChange: (key: string, value: any) => void;
}

const ControlsTab: React.FC<ControlsTabProps> = ({
  settings,
  recordingKey,
  onKeyRecord,
  onSettingChange
}) => {
  const getKeyDisplayName = (keyCode: string) => {
    const keyMap: { [key: string]: string } = {
      'ArrowLeft': '←', 'ArrowRight': '→', 'ArrowUp': '↑', 'ArrowDown': '↓',
      'Space': '空格', 'KeyZ': 'Z', 'KeyX': 'X', 'KeyC': 'C', 'KeyA': 'A',
      'KeyB': 'B', 'Escape': 'Esc'
    };
    return keyMap[keyCode] || keyCode.replace('Key', '');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">按键设置</CardTitle>
        <CardDescription>点击按钮自定义按键绑定</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries({
          moveLeft: '左移', moveRight: '右移', softDrop: '软降', hardDrop: '硬降',
          rotateClockwise: '顺时针旋转', rotateCounterclockwise: '逆时针旋转',
          rotate180: '180°旋转', hold: '暂存', pause: '暂停', backToMenu: '返回菜单'
        }).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <Label className="w-32">{label}</Label>
            <Button
              variant={recordingKey === key ? "destructive" : "outline"}
              size="sm"
              onClick={() => onKeyRecord(key)}
              className="min-w-24"
            >
              {recordingKey === key ? '按下按键...' : 
                getKeyDisplayName(settings.controls[key as keyof typeof settings.controls])}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ControlsTab;
