
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GameSettings } from '@/utils/gameTypes';

interface MusicTabProps {
  settings: GameSettings;
  onSettingChange: (key: string, value: any) => void;
}

const MusicTab: React.FC<MusicTabProps> = ({ settings, onSettingChange }) => {
  const musicOptions = [
    { value: '', label: '无背景音乐' },
    { value: 'classic', label: '经典俄罗斯方块' },
    { value: 'modern', label: '现代电子音乐' },
    { value: 'ambient', label: '环境音乐' },
    { value: 'upbeat', label: '节奏音乐' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">音乐设置</CardTitle>
        <CardDescription>配置背景音乐和音量</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base font-medium">音乐音量: {settings.musicVolume}%</Label>
          <Slider
            value={[settings.musicVolume]}
            onValueChange={(value) => onSettingChange('musicVolume', value[0])}
            max={100}
            min={0}
            step={5}
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-1">
            调整背景音乐的音量大小
          </p>
        </div>

        <div>
          <Label className="text-base font-medium">背景音乐</Label>
          <Select 
            value={settings.backgroundMusic} 
            onValueChange={(value) => onSettingChange('backgroundMusic', value)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="选择背景音乐" />
            </SelectTrigger>
            <SelectContent>
              {musicOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            选择游戏时播放的背景音乐
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">音乐提示</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• 背景音乐可以帮助您保持节奏</li>
            <li>• 在时间限制模式中，音乐会在最后30秒加快节拍</li>
            <li>• 您可以随时通过主音量控制整体音量</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default MusicTab;
