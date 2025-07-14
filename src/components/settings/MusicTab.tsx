
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import MusicPlayer from '@/components/MusicPlayer';
import type { GameSettings } from '@/utils/gameTypes';

interface MusicTabProps {
  settings: GameSettings;
  onSettingChange: (key: keyof GameSettings, value: any) => void;
}

const MusicTab: React.FC<MusicTabProps> = ({ settings, onSettingChange }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>音频设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 音效开关 */}
          <div className="flex items-center justify-between">
            <Label>启用音效</Label>
            <Switch
              checked={settings.enableSound}
              onCheckedChange={(checked) => onSettingChange('enableSound', checked)}
            />
          </div>

          {/* 主音量控制 */}
          {settings.enableSound && (
            <div className="space-y-2">
              <Label>主音量: {settings.masterVolume}%</Label>
              <Slider
                value={[settings.masterVolume]}
                onValueChange={(values) => onSettingChange('masterVolume', values[0])}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          )}

          {/* 音乐音量控制 */}
          <div className="space-y-2">
            <Label>音乐音量: {settings.musicVolume}%</Label>
            <Slider
              value={[settings.musicVolume]}
              onValueChange={(values) => onSettingChange('musicVolume', values[0])}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* 音乐播放器 */}
          <div className="space-y-2">
            <Label>背景音乐播放器</Label>
            <MusicPlayer
              volume={settings.musicVolume}
              onVolumeChange={(volume) => onSettingChange('musicVolume', volume)}
              selectedTrack={settings.backgroundMusic}
              onTrackChange={(trackId) => onSettingChange('backgroundMusic', trackId)}
              autoPlay={false}
              shuffle={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MusicTab;
