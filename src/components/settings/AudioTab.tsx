
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameSettings } from '@/utils/gameTypes';

interface AudioTabProps {
  settings: GameSettings;
  onSettingChange: (key: string, value: any) => void;
}

const AudioTab: React.FC<AudioTabProps> = ({ settings, onSettingChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">音频设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label>启用音效</Label>
          <Switch
            checked={settings.enableSound}
            onCheckedChange={(checked) => onSettingChange('enableSound', checked)}
          />
        </div>
        {settings.enableSound && (
          <div className="space-y-2">
            <Label>主音量 ({settings.masterVolume}%)</Label>
            <Slider
              value={[settings.masterVolume]}
              onValueChange={([value]) => onSettingChange('masterVolume', value)}
              max={100} min={0} step={1}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioTab;
