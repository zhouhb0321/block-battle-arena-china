
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Music, Play, Pause } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useMusicManager } from '@/hooks/useMusicManager';

const MusicTab: React.FC = () => {
  const { settings, updateSettings } = useUserSettings();
  const { availableMusic, currentTrack, setCurrentTrack, isLoading } = useMusicManager();

  const handleVolumeChange = (value: number[]) => {
    updateSettings({ music_volume: value[0] });
  };

  const handleAutoPlayToggle = (checked: boolean) => {
    updateSettings({ auto_play_music: checked });
  };

  const handleLoopToggle = (checked: boolean) => {
    updateSettings({ loop_music: checked });
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
                {settings.music_volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                音乐音量
              </Label>
              <span className="text-sm text-muted-foreground">{settings.music_volume}%</span>
            </div>
            <Slider
              value={[settings.music_volume]}
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
              checked={settings.auto_play_music}
              onCheckedChange={handleAutoPlayToggle}
            />
          </div>

          {/* 循环播放 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="loop">循环播放</Label>
            <Switch
              id="loop"
              checked={settings.loop_music}
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
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">自动检测音乐文件中...</p>
            </div>
          ) : availableMusic.length > 0 ? (
            <div className="space-y-2">
              {availableMusic.map((track) => (
                <div
                  key={track.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    currentTrack?.id === track.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setCurrentTrack(track)}
                >
                  <div>
                    <div className="font-medium">{track.title}</div>
                    <div className="text-sm text-muted-foreground">{track.filename}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentTrack?.id === track.id && <Play className="w-4 h-4 text-primary" />}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-4">
                * 音乐文件已自动检测并加载
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
