
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
      'KeyB': 'B', 'Escape': 'Esc', 'Enter': '回车', 'Tab': 'Tab',
      'ShiftLeft': '左Shift', 'ShiftRight': '右Shift',
      'ControlLeft': '左Ctrl', 'ControlRight': '右Ctrl'
    };
    return keyMap[keyCode] || keyCode.replace('Key', '').replace('Digit', '');
  };

  const controlIcons = {
    moveLeft: '←',
    moveRight: '→', 
    softDrop: '↓',
    hardDrop: '⬇',
    rotateClockwise: '↻',
    rotateCounterclockwise: '↺',
    rotate180: '⟲',
    hold: 'H',
    pause: '⏸',
    backToMenu: '⬅'
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg text-white">按键设置</CardTitle>
        <CardDescription className="text-gray-400">
          点击按钮自定义按键绑定。如果按键冲突，将自动交换位置。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries({
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
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">{controlIcons[key as keyof typeof controlIcons]}</span>
                <Label className="text-white font-medium">{label}</Label>
              </div>
              <Button
                variant={recordingKey === key ? "destructive" : "outline"}
                size="sm"
                onClick={() => onKeyRecord(key)}
                className={`min-w-20 ${
                  recordingKey === key 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-500 text-white border-gray-500'
                }`}
              >
                {recordingKey === key ? '按下按键...' : 
                  getKeyDisplayName(settings.controls[key as keyof typeof settings.controls])}
              </Button>
            </div>
          ))}
        </div>

        {recordingKey && (
          <div className="bg-blue-900/50 border border-blue-500/50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-200">
                正在为 <strong>{Object.entries({
                  moveLeft: '左移', moveRight: '右移', softDrop: '软降', hardDrop: '硬降',
                  rotateClockwise: '顺时针旋转', rotateCounterclockwise: '逆时针旋转',
                  rotate180: '180°旋转', hold: '暂存', pause: '暂停', backToMenu: '返回菜单'
                }).find(([k]) => k === recordingKey)?.[1]}</strong> 录制按键...
              </span>
            </div>
            <p className="text-blue-300 text-sm mt-2">
              请按下您想要设置的按键，或等待5秒自动取消。
            </p>
          </div>
        )}

        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-white">按键说明</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
            <div>• <strong>左移/右移</strong>：控制方块左右移动</div>
            <div>• <strong>软降</strong>：加速方块下降</div>
            <div>• <strong>硬降</strong>：瞬间降落到底部</div>
            <div>• <strong>顺时针旋转</strong>：方块顺时针旋转90°</div>
            <div>• <strong>逆时针旋转</strong>：方块逆时针旋转90°</div>
            <div>• <strong>180°旋转</strong>：方块旋转180°</div>
            <div>• <strong>暂存</strong>：保存当前方块供以后使用</div>
            <div>• <strong>暂停</strong>：暂停/继续游戏</div>
            <div>• <strong>返回菜单</strong>：返回到上一个界面</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlsTab;
