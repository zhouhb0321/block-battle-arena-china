
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Music, Volume2 } from 'lucide-react';
import { useMusicManager } from '@/hooks/useMusicManager';
import type { GameSettings } from '@/utils/gameTypes';

interface MusicTabProps {
  settings: GameSettings;
  onSettingChange: (key: keyof GameSettings, value: any) => void;
}

const MusicTab: React.FC<MusicTabProps> = ({ settings, onSettingChange }) => {
  const { availableMusic, currentTrack, setCurrentTrack, isLoading, detectMusicFiles } = useMusicManager();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            音频设置
          </CardTitle>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            背景音乐设置
          </CardTitle>
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

          {/* 音乐文件检测和选择 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>音乐文件检测</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={detectMusicFiles}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? '检测中...' : '重新检测'}
              </Button>
            </div>

            {availableMusic.length > 0 ? (
              <div className="space-y-3">
                <Label>选择背景音乐</Label>
                <Select
                  value={currentTrack?.name || ''}
                  onValueChange={(value) => {
                    const track = availableMusic.find(t => t.name === value);
                    if (track) {
                      setCurrentTrack(track);
                      onSettingChange('backgroundMusic', track.name);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择音乐文件" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMusic.map((track) => (
                      <SelectItem key={track.name} value={track.name}>
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div className="font-medium">
                      检测到 {availableMusic.length} 个音乐文件
                    </div>
                    <div className="text-xs text-muted-foreground">
                      当前选择: {currentTrack?.name || '无'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      支持格式: MP3, WAV, OGG, M4A
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium mb-2">未检测到音乐文件</div>
                  <div className="text-xs space-y-1">
                    <div>• 将音乐文件放入 public/music/ 目录中</div>
                    <div>• 支持格式: MP3, WAV, OGG, M4A</div>
                    <div>• 点击"重新检测"按钮刷新文件列表</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 自动播放设置 */}
          <div className="flex items-center justify-between">
            <Label>游戏开始时自动播放音乐</Label>
            <Switch
              checked={settings.autoPlayMusic || false}
              onCheckedChange={(checked) => onSettingChange('autoPlayMusic', checked)}
            />
          </div>

          {/* 循环播放设置 */}
          <div className="flex items-center justify-between">
            <Label>循环播放</Label>
            <Switch
              checked={settings.loopMusic || false}
              onCheckedChange={(checked) => onSettingChange('loopMusic', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MusicTab;
