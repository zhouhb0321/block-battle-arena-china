
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, Music, Zap } from 'lucide-react';
import { soundEffects } from '@/utils/soundEffects';
import type { GameSettings } from '@/utils/gameTypes';

interface AudioTabProps {
  settings: GameSettings;
  onSettingChange: (key: string, value: any) => void;
}

const AudioTab: React.FC<AudioTabProps> = ({ settings, onSettingChange }) => {
  // 测试音效
  const testLineClearSound = () => {
    soundEffects.setEnabled(true);
    soundEffects.setVolume((settings.masterVolume || 50) / 100);
    soundEffects.playLineClear(4); // 播放 Tetris 音效
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            音频设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label>启用音效</Label>
            <Switch
              checked={settings.enableSound}
              onCheckedChange={(checked) => {
                onSettingChange('enableSound', checked);
                soundEffects.setEnabled(checked);
              }}
            />
          </div>
          
          {settings.enableSound && (
            <>
              <div className="space-y-2">
                <Label>主音量 ({settings.masterVolume}%)</Label>
                <Slider
                  value={[settings.masterVolume]}
                  onValueChange={([value]) => {
                    onSettingChange('masterVolume', value);
                    soundEffects.setVolume(value / 100);
                  }}
                  max={100} min={0} step={1}
                />
              </div>
              
              {/* 音效测试 */}
              <div className="pt-2 border-t">
                <Label className="text-muted-foreground text-sm mb-2 block">消行音效测试</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { soundEffects.setVolume((settings.masterVolume || 50) / 100); soundEffects.playLineClear(1); }}>
                    单消
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { soundEffects.setVolume((settings.masterVolume || 50) / 100); soundEffects.playLineClear(2); }}>
                    双消
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { soundEffects.setVolume((settings.masterVolume || 50) / 100); soundEffects.playLineClear(3); }}>
                    三消
                  </Button>
                  <Button size="sm" variant="outline" onClick={testLineClearSound} className="bg-yellow-500/20">
                    <Zap className="h-3 w-3 mr-1" />
                    Tetris
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AudioTab;
