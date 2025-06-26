
import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import type { GameSettings } from '@/utils/gameTypes';

interface MusicTabProps {
  settings: GameSettings;
  onSettingChange: (key: string, value: any) => void;
}

const MusicTab: React.FC<MusicTabProps> = ({ settings, onSettingChange }) => {
  const { musicTracks } = useBackgroundMusic();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">背景音乐</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>选择背景音乐</Label>
          <Select
            value={settings.backgroundMusic}
            onValueChange={(value) => onSettingChange('backgroundMusic', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择音乐" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">无音乐</SelectItem>
              {musicTracks.map(track => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {settings.backgroundMusic && (
          <div className="space-y-2">
            <Label>音乐音量 ({settings.musicVolume || 30}%)</Label>
            <Slider
              value={[settings.musicVolume || 30]}
              onValueChange={([value]) => onSettingChange('musicVolume', value)}
              max={100} min={0} step={1}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MusicTab;
