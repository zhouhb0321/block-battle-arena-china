
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Sparkles } from 'lucide-react';
import type { GameSettings } from '@/utils/gameTypes';

interface VisualTabProps {
  settings: GameSettings;
  onSettingChange: (key: string, value: any) => void;
}

const VisualTab: React.FC<VisualTabProps> = ({ settings, onSettingChange }) => {
  // 添加幽灵方块透明度设置（如果不存在则默认为50%）
  const ghostOpacity = (settings as any).ghostOpacity || 50;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="w-5 h-5" />
          视觉设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">幽灵方块显示</Label>
            <p className="text-sm text-muted-foreground">
              显示方块的预落位置轮廓
            </p>
          </div>
          <Switch
            checked={settings.enableGhost}
            onCheckedChange={(checked) => onSettingChange('enableGhost', checked)}
          />
        </div>

        {settings.enableGhost && (
          <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <Label className="text-base font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              幽灵方块透明度: {ghostOpacity}%
            </Label>
            <Slider
              value={[ghostOpacity]}
              onValueChange={(value) => onSettingChange('ghostOpacity', value[0])}
              max={100}
              min={10}
              step={5}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground">
              调整幽灵方块的透明度，数值越高越不透明
            </p>
            
            {/* 预览效果 */}
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">预览效果:</div>
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                <div 
                  className="w-4 h-4 bg-blue-500 rounded-sm" 
                  style={{ opacity: ghostOpacity / 100 }}
                ></div>
                <div className="text-xs text-gray-500 ml-2 self-center">
                  实体方块 vs 幽灵方块
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">视觉提示</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• 幽灵方块可以帮助您快速判断方块的最终位置</li>
            <li>• 适当的透明度设置可以避免遮挡游戏区域</li>
            <li>• 在高速游戏时，幽灵方块尤其有用</li>
            <li>• 您可以根据个人喜好调整透明度</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default VisualTab;
