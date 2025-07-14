
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gamepad, Keyboard, Settings, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
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
  // 控制预设
  const controlPresets = {
    directional: {
      name: '指导配置',
      description: '使用方向键控制，适合新手玩家',
      icon: <ArrowUp className="w-4 h-4" />,
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
      }
    },
    wasd: {
      name: 'WASD配置',
      description: '使用WASD键位，适合游戏玩家',
      icon: <Keyboard className="w-4 h-4" />,
      controls: {
        moveLeft: 'KeyA',
        moveRight: 'KeyD',
        softDrop: 'KeyS',
        hardDrop: 'Space',
        rotateClockwise: 'KeyW',
        rotateCounterclockwise: 'KeyQ',
        rotate180: 'KeyE',
        hold: 'KeyC',
        pause: 'Escape',
        backToMenu: 'KeyB'
      }
    },
    custom: {
      name: '自定义配置',
      description: '完全自定义所有按键',
      icon: <Settings className="w-4 h-4" />,
      controls: settings.controls
    }
  };

  const applyPreset = (presetKey: keyof typeof controlPresets) => {
    const preset = controlPresets[presetKey];
    onSettingChange('controls', preset.controls);
  };

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
      
      await onSettingChange('controls', newControls);
      
      const conflictLabel = controlLabels[conflictKeyName as keyof typeof controlLabels];
      const currentLabel = controlLabels[controlName as keyof typeof controlLabels];
      console.log(`键位已交换: ${currentLabel} 和 ${conflictLabel}`);
    } else {
      const newControls = {
        ...settings.controls,
        [controlName]: newKey
      };
      
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
    <div className="space-y-6">
      {/* 预设配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad className="w-5 h-5" />
            控制预设
          </CardTitle>
          <CardDescription>
            选择一个预设配置快速开始。第一次使用建议选择"指导配置"。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(controlPresets).map(([key, preset]) => (
              <Card 
                key={key} 
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer border-2 hover:border-primary/50" 
                onClick={() => key !== 'custom' && applyPreset(key as keyof typeof controlPresets)}
              >
                <div className="flex items-center gap-3 mb-2">
                  {preset.icon}
                  <h3 className="font-semibold">{preset.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{preset.description}</p>
                {key === 'directional' && (
                  <div className="flex gap-1 mb-3">
                    <Badge variant="outline" className="text-xs">
                      <ArrowLeft className="w-3 h-3 mr-1" />←
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <ArrowDown className="w-3 h-3 mr-1" />↓
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <ArrowUp className="w-3 h-3 mr-1" />↑
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <ArrowRight className="w-3 h-3 mr-1" />→
                    </Badge>
                  </div>
                )}
                {key === 'wasd' && (
                  <div className="flex gap-1 mb-3">
                    <Badge variant="outline" className="text-xs">A</Badge>
                    <Badge variant="outline" className="text-xs">S</Badge>
                    <Badge variant="outline" className="text-xs">W</Badge>
                    <Badge variant="outline" className="text-xs">D</Badge>
                  </div>
                )}
                {key !== 'custom' && (
                  <Button variant="outline" size="sm" className="w-full">
                    应用此配置
                  </Button>
                )}
                {key === 'custom' && (
                  <Badge variant="secondary" className="w-full justify-center">
                    当前配置
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 自定义按键设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            自定义按键设置
          </CardTitle>
          <CardDescription>
            点击按钮自定义按键绑定。设置会立即保存并生效。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(controlLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{controlIcons[key as keyof typeof controlIcons]}</span>
                  <Label className="font-medium">{label}</Label>
                </div>
                <Button
                  variant={recordingKey === key ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => onKeyRecord(key)}
                  className={`min-w-20 font-mono ${
                    recordingKey === key ? 'animate-pulse' : ''
                  }`}
                >
                  {recordingKey === key ? '按下按键...' : 
                    getKeyDisplayName(settings.controls[key as keyof typeof settings.controls])}
                </Button>
              </div>
            ))}
          </div>

          {recordingKey && (
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="animate-bounce">
                  正在录制
                </Badge>
                <span>
                  正在为 <strong>{controlLabels[recordingKey as keyof typeof controlLabels]}</strong> 录制按键...
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                请按下您想要设置的按键，或等待5秒自动取消。如与其他按键冲突将自动交换。
              </p>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Gamepad className="w-4 h-4" />
              新手指导
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>• <strong>左移/右移</strong>：控制方块左右移动</div>
              <div>• <strong>软降</strong>：加速方块下降</div>
              <div>• <strong>硬降</strong>：瞬间降落到底部</div>
              <div>• <strong>顺时针旋转</strong>：方块顺时针旋转90°</div>
              <div>• <strong>逆时针旋转</strong>：方块逆时针旋转90°</div>
              <div>• <strong>180°旋转</strong>：方块旋转180°</div>
              <div>• <strong>暂存</strong>：保存当前方块供以后使用</div>
              <div>• <strong>暂停</strong>：暂停/继续游戏</div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-700">
                💡 <strong>小贴士</strong>：如果不熟悉操作，建议先选择"指导配置"使用方向键练习，熟悉后可以切换到"WASD配置"获得更好的游戏体验。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ControlsTab;
