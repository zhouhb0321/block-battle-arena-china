
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

  // 预设配置
  const controlPresets = {
    GUIDELINE: {
      moveLeft: 'ArrowLeft',
      moveRight: 'ArrowRight',
      softDrop: 'ArrowDown',
      hardDrop: 'Space',
      rotateClockwise: 'ArrowUp',
      rotateCounterclockwise: 'KeyZ',
      rotate180: 'KeyA',
      hold: 'KeyC',
      pause: 'Escape',
      backToMenu: 'KeyB',
    },
    WASD: {
      moveLeft: 'KeyA',
      moveRight: 'KeyD',
      softDrop: 'KeyS',
      hardDrop: 'KeyW',
      rotateClockwise: 'KeyE',
      rotateCounterclockwise: 'KeyQ',
      rotate180: 'KeyX',
      hold: 'KeyC',
      pause: 'Escape',
      backToMenu: 'KeyB',
    }
  };

  const applyPreset = async (presetName: keyof typeof controlPresets) => {
    console.log('应用预设配置:', presetName);
    await onSettingChange('controls', controlPresets[presetName]);
  };

  const handleKeyBinding = async (controlName: string, newKey: string) => {
    console.log('更新键位绑定:', controlName, newKey);
    
    const conflictKey = Object.entries(settings.controls).find(
      ([key, value]) => key !== controlName && value === newKey
    );
    
    if (conflictKey) {
      const conflictKeyName = conflictKey[0] as keyof typeof settings.controls;
      const oldValue = settings.controls[controlName as keyof typeof settings.controls];
      
      const newControls = {
        ...settings.controls,
        [controlName]: newKey,
        [conflictKeyName]: oldValue
      };
      
      // 立即应用设置更改
      await onSettingChange('controls', newControls);
      
      const conflictLabel = controlLabels[conflictKeyName as keyof typeof controlLabels];
      const currentLabel = controlLabels[controlName as keyof typeof controlLabels];
      console.log(`键位已交换: ${currentLabel} 和 ${conflictLabel}`);
    } else {
      const newControls = {
        ...settings.controls,
        [controlName]: newKey
      };
      
      // 立即应用设置更改
      await onSettingChange('controls', newControls);
      console.log('键位已更新:', controlName, newKey);
    }
  };

  React.useEffect(() => {
    if (!recordingKey) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('录制到按键:', event.code);
      handleKeyBinding(recordingKey, event.code);
      onKeyRecord('');
    };

    document.addEventListener('keydown', handleKeyDown);
    
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
          点击按钮自定义按键绑定。设置会立即保存并生效。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 预设配置选择器 */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 text-white">键位预设</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('GUIDELINE')}
              className="bg-gray-600 hover:bg-gray-500 text-white border-gray-500 hover:border-gray-400"
            >
              GUIDELINE (方向键)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('WASD')}
              className="bg-gray-600 hover:bg-gray-500 text-white border-gray-500 hover:border-gray-400"
            >
              WASD 配置
            </Button>
            <Badge variant="outline" className="bg-blue-600 text-white border-blue-400 px-3 py-1">
              当前：自定义
            </Badge>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            选择预设配置可快速设置常用键位组合
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(controlLabels).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{controlIcons[key as keyof typeof controlIcons]}</span>
                <Label className="text-white font-medium">{label}</Label>
              </div>
              <Button
                variant={recordingKey === key ? "destructive" : "outline"}
                size="sm"
                onClick={() => onKeyRecord(key)}
                className={`min-w-20 font-mono ${
                  recordingKey === key 
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                    : 'bg-gray-600 hover:bg-gray-500 text-white border-gray-500 hover:border-gray-400'
                }`}
              >
                {recordingKey === key ? '按下按键...' : 
                  getKeyDisplayName(settings.controls[key as keyof typeof settings.controls])}
              </Button>
            </div>
          ))}
        </div>

        {recordingKey && (
          <div className="bg-blue-900/50 border border-blue-500/50 p-4 rounded-lg animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-blue-600 text-white border-blue-400 animate-bounce">
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
