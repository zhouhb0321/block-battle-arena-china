
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
      'KeyS': 'S', 'KeyD': 'D', 'KeyQ': 'Q', 'KeyW': 'W', 'KeyE': 'E',
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

  const handleKeyBinding = (controlName: string, newKey: string) => {
    console.log('更新键位绑定:', controlName, newKey);
    
    // 检查是否与其他键位冲突
    const conflictKey = Object.entries(settings.controls).find(
      ([key, value]) => key !== controlName && value === newKey
    );
    
    if (conflictKey) {
      // 交换键位
      const conflictKeyName = conflictKey[0] as keyof typeof settings.controls;
      const oldValue = settings.controls[controlName as keyof typeof settings.controls];
      
      const newControls = {
        ...settings.controls,
        [controlName]: newKey,
        [conflictKeyName]: oldValue
      };
      
      onSettingChange('controls', newControls);
      
      const conflictLabel = controlLabels[conflictKeyName as keyof typeof controlLabels];
      const currentLabel = controlLabels[controlName as keyof typeof controlLabels];
      console.log(`键位已交换: ${currentLabel} 和 ${conflictLabel}`);
    } else {
      // 直接更新
      const newControls = {
        ...settings.controls,
        [controlName]: newKey
      };
      onSettingChange('controls', newControls);
      console.log('键位已更新:', controlName, newKey);
    }
  };

  // 键盘事件处理
  React.useEffect(() => {
    if (!recordingKey) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('录制到按键:', event.code);
      handleKeyBinding(recordingKey, event.code);
      onKeyRecord(''); // 停止录制
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // 5秒后自动停止录制
    const timeout = setTimeout(() => {
      onKeyRecord('');
    }, 5000);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [recordingKey]);

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
          {Object.entries(controlLabels).map(([key, label]) => (
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
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-blue-600 text-white border-blue-400">
                正在录制
              </Badge>
              <span className="text-blue-200">
                正在为 <strong>{controlLabels[recordingKey as keyof typeof controlLabels]}</strong> 录制按键...
              </span>
            </div>
            <p className="text-blue-300 text-sm">
              请按下您想要设置的按键，或等待5秒自动取消。如与其他按键冲突将自动交换。
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
