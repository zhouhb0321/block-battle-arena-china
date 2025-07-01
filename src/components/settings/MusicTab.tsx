
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
          <CardTitle>音乐设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* 音乐文件说明 */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h4 className="font-semibold text-blue-800 mb-2">音乐文件说明</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• 将音乐文件放置在 <code>public/music/</code> 目录下</p>
                <p>• 支持格式：MP3, WAV, OGG</p>
                <p>• 推荐文件大小：&lt; 5MB</p>
                <p>• 系统会自动随机播放可用的音乐文件</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default MusicTab;
