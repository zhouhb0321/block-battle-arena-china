
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Music, Play, Pause } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useMusicManager } from '@/hooks/useMusicManager';

interface MusicTabProps {
  settings?: any;
  onSettingChange?: (key: string, value: any) => void;
}

const MusicTab: React.FC<MusicTabProps> = ({ settings: propSettings, onSettingChange }) => {
  const { settings, updateSettings } = useUserSettings();
  const { availableMusic, currentTrack, setCurrentTrack, isLoading } = useMusicManager();

  // Use prop settings if provided, otherwise use hook settings
  const currentSettings = propSettings || settings;

  const handleVolumeChange = (value: number[]) => {
    if (onSettingChange) {
      onSettingChange('musicVolume', value[0]);
    } else {
      updateSettings({ musicVolume: value[0] });
    }
  };

  const handleAutoPlayToggle = (checked: boolean) => {
    if (onSettingChange) {
      onSettingChange('autoPlayMusic', checked);
    } else {
      updateSettings({ autoPlayMusic: checked });
    }
  };

  const handleLoopToggle = (checked: boolean) => {
    if (onSettingChange) {
      onSettingChange('loopMusic', checked);
    } else {
      updateSettings({ loopMusic: checked });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            音乐设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 音乐音量 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                {currentSettings.musicVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                音乐音量
              </Label>
              <span className="text-sm text-muted-foreground">{currentSettings.musicVolume}%</span>
            </div>
            <Slider
              value={[currentSettings.musicVolume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* 自动播放 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-play">自动播放背景音乐</Label>
            <Switch
              id="auto-play"
              checked={currentSettings.autoPlayMusic}
              onCheckedChange={handleAutoPlayToggle}
            />
          </div>

          {/* 循环播放 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="loop">循环播放</Label>
            <Switch
              id="loop"
              checked={currentSettings.loopMusic}
              onCheckedChange={handleLoopToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* 可用音乐列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            可用音乐
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableMusic.length > 0 ? (
            <div className="space-y-2">
              {availableMusic.map((track, index) => (
                <div
                  key={track.name}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    currentTrack?.name === track.name
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setCurrentTrack(track)}
                >
                  <div>
                    <div className="font-medium">{track.name}</div>
                    <div className="text-sm text-muted-foreground">音乐文件</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentTrack?.name === track.name && <Play className="w-4 h-4 text-primary" />}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-4">
                * 音乐文件已自动加载
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">未发现音乐文件</p>
              <p className="text-xs text-muted-foreground mt-2">
                请联系管理员添加音乐文件
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MusicTab;
