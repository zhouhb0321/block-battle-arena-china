
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Save, Check } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from 'sonner';

const KeyboardSettings: React.FC = () => {
  const { settings, saveSettings, reloadSettings } = useUserSettings();
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [keyBindings, setKeyBindings] = useState(settings.controls);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setKeyBindings(settings.controls);
    setHasChanges(false);
  }, [settings.controls]);

  const keyLabels = {
    moveLeft: { label: '左移', icon: '←' },
    moveRight: { label: '右移', icon: '→' },
    softDrop: { label: '软降', icon: '↓' },
    hardDrop: { label: '硬降', icon: '⬇' },
    rotateClockwise: { label: '顺时针旋转', icon: '↻' },
    rotateCounterclockwise: { label: '逆时针旋转', icon: '↺' },
    rotate180: { label: '180°旋转', icon: '⟲' },
    hold: { label: '暂存', icon: 'H' },
    pause: { label: '暂停', icon: '⏸' },
    backToMenu: { label: '返回上一级菜单', icon: '←' }
  };

  const handleKeyRecord = (controlName: string) => {
    setRecordingKey(controlName);
    
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const conflictKey = Object.entries(keyBindings).find(
        ([key, value]) => key !== controlName && value === e.code
      );
      
      if (conflictKey) {
        const conflictKeyName = conflictKey[0] as keyof typeof keyBindings;
        const oldValue = keyBindings[controlName as keyof typeof keyBindings];
        
        const newBindings = {
          ...keyBindings,
          [controlName]: e.code,
          [conflictKeyName]: oldValue
        };
        
        setKeyBindings(newBindings);
        setHasChanges(true);
        
        const conflictLabel = keyLabels[conflictKeyName as keyof typeof keyLabels]?.label || conflictKeyName;
        const currentLabel = keyLabels[controlName as keyof typeof keyLabels]?.label || controlName;
        toast.success(`已交换按键设置：${currentLabel} 和 ${conflictLabel} 的按键已互换`);
      } else {
        const newBindings = {
          ...keyBindings,
          [controlName]: e.code
        };
        
        setKeyBindings(newBindings);
        setHasChanges(true);
      }
      
      setRecordingKey(null);
    };
    
    document.addEventListener('keydown', handleKeyPress, { once: true });
    
    setTimeout(() => {
      setRecordingKey(null);
    }, 5000);
  };

  const handleSaveSettings = async () => {
    await saveSettings({ controls: keyBindings });
    setHasChanges(false);
    toast.success('键位设置已保存并生效！');
  };

  const getKeyDisplayName = (keyCode: string) => {
    const keyMap: { [key: string]: string } = {
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'Space': '空格键',
      'KeyZ': 'Z',
      'KeyX': 'X',
      'KeyC': 'C',
      'KeyA': 'A',
      'KeyS': 'S',
      'KeyD': 'D',
      'KeyQ': 'Q',
      'KeyW': 'W',
      'KeyE': 'E',
      'KeyB': 'B',
      'Escape': 'Esc',
      'Enter': '回车',
      'ShiftLeft': '左Shift',
      'ShiftRight': '右Shift',
      'ControlLeft': '左Ctrl',
      'ControlRight': '右Ctrl',
      'AltLeft': '左Alt',
      'AltRight': '右Alt',
      'Tab': 'Tab',
      'Backspace': '退格',
      'Delete': '删除'
    };
    return keyMap[keyCode] || keyCode.replace('Key', '').replace('Digit', '');
  };

  const resetToDefault = () => {
    const defaultControls = {
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
    };
    
    setKeyBindings(defaultControls);
    setHasChanges(true);
  };

  const presetLayouts = {
    arrow: {
      name: '箭头键布局',
      controls: {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        softDrop: 'ArrowDown',
        hardDrop: 'ArrowUp',
        rotateClockwise: 'KeyZ',
        rotateCounterclockwise: 'KeyX',
        rotate180: 'KeyA',
        hold: 'KeyC',
        pause: 'Escape',
        backToMenu: 'KeyB'
      }
    },
    wasd: {
      name: 'WASD布局',
      controls: {
        moveLeft: 'KeyA',
        moveRight: 'KeyD',
        softDrop: 'KeyS',
        hardDrop: 'KeyW',
        rotateClockwise: 'KeyJ',
        rotateCounterclockwise: 'KeyK',
        rotate180: 'KeyL',
        hold: 'Space',
        pause: 'Escape',
        backToMenu: 'KeyB'
      }
    },
    guideline: {
      name: 'Guideline标准',
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
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = presetLayouts[presetKey as keyof typeof presetLayouts];
    if (preset) {
      setKeyBindings(preset.controls);
      setHasChanges(true);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            键盘设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 预设布局 */}
          <div>
            <Label className="text-base font-semibold mb-3 block">预设布局</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(presetLayouts).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(key)}
                >
                  {preset.name}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                重置默认
              </Button>
            </div>
          </div>

          {/* 键位设置 */}
          <div>
            <Label className="text-base font-semibold mb-3 block">自定义键位</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(keyLabels).map(([key, config]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{config.icon}</span>
                    <Label className="font-medium">{config.label}</Label>
                  </div>
                  <Button
                    variant={recordingKey === key ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => handleKeyRecord(key)}
                    className="min-w-24"
                  >
                    {recordingKey === key 
                      ? '按下按键...' 
                      : getKeyDisplayName(keyBindings[key as keyof typeof keyBindings])
                    }
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 保存按钮 */}
          {hasChanges && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button onClick={handleSaveSettings} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                保存设置
              </Button>
            </div>
          )}

          {/* 按键提示 */}
          <div className="bg-muted/50 p-4 rounded-lg border">
            <h4 className="font-semibold mb-2">按键说明</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>• <strong>左移/右移</strong>：控制方块左右移动</div>
              <div>• <strong>软降</strong>：加速方块下降</div>
              <div>• <strong>硬降</strong>：瞬间降落到底部</div>
              <div>• <strong>顺时针旋转</strong>：方块顺时针旋转90°</div>
              <div>• <strong>逆时针旋转</strong>：方块逆时针旋转90°</div>
              <div>• <strong>180°旋转</strong>：方块旋转180°</div>
              <div>• <strong>暂存</strong>：保存当前方块供以后使用</div>
              <div>• <strong>暂停</strong>：暂停/继续游戏</div>
              <div>• <strong>返回上一级菜单</strong>：返回到上一个界面</div>
            </div>
          </div>

          {/* 当前录制状态 */}
          {recordingKey && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                  录制中
                </Badge>
                <span>正在为 <strong>{keyLabels[recordingKey as keyof typeof keyLabels].label}</strong> 录制按键...</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                请按下您想要设置的按键，或等待5秒自动取消。如与其他按键冲突将自动交换。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyboardSettings;
