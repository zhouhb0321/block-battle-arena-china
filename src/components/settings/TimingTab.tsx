import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { GameSettings } from '@/utils/gameTypes';

interface TimingTabProps {
  settings: GameSettings;
  onSettingChange: (key: string, value: any) => void;
}

// ✅ 预设配置（包含TETR.IO等流行设置）
const TIMING_PRESETS = {
  beginner: { das: 150, arr: 50, sdf: 10, dcd: 0, name: '初学者' },
  standard: { das: 133, arr: 20, sdf: 20, dcd: 0, name: '标准' },
  advanced: { das: 100, arr: 10, sdf: 30, dcd: 0, name: '进阶' },
  pro: { das: 50, arr: 0, sdf: 40, dcd: 0, name: '专业' },
  tetrioDefault: { das: 133, arr: 1, sdf: 21, dcd: 0, name: 'TETR.IO' },
  jstrisFast: { das: 100, arr: 0, sdf: 40, dcd: 0, name: 'Jstris' },
  guideline: { das: 133, arr: 20, sdf: 20, dcd: 0, name: 'Guideline' },
  hyperTap: { das: 0, arr: 0, sdf: 1, dcd: 0, name: 'Hypertap' }
};

const TimingTab: React.FC<TimingTabProps> = ({ settings, onSettingChange }) => {
  const applyPreset = (preset: keyof typeof TIMING_PRESETS) => {
    const config = TIMING_PRESETS[preset];
    onSettingChange('das', config.das);
    onSettingChange('arr', config.arr);
    onSettingChange('sdf', config.sdf);
    onSettingChange('dcd', config.dcd);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">操控设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ✅ 预设选择 */}
        <div className="space-y-2">
          <Label>快速预设</Label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(TIMING_PRESETS) as Array<keyof typeof TIMING_PRESETS>).map(key => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(key)}
                className="justify-start text-xs"
              >
                {TIMING_PRESETS[key].name}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>DAS - 延迟自动移位 ({settings.das}ms)</Label>
          <Slider
            value={[settings.das]}
            onValueChange={([value]) => onSettingChange('das', value)}
            max={300} min={0} step={1}
          />
        </div>
        <div className="space-y-2">
          <Label>ARR - 自动重复速率 ({settings.arr}ms)</Label>
          <Slider
            value={[settings.arr]}
            onValueChange={([value]) => onSettingChange('arr', value)}
            max={100} min={0} step={1}
          />
        </div>
        <div className="space-y-2">
          <Label>SDF - 软降速度 ({settings.sdf}倍)</Label>
          <Slider
            value={[settings.sdf]}
            onValueChange={([value]) => onSettingChange('sdf', value)}
            max={40} min={1} step={1}
          />
        </div>
        
        {/* DCD Setting */}
        <div className="space-y-2">
          <Label>DCD - DAS Cut Delay ({settings.dcd}ms)</Label>
          <p className="text-xs text-muted-foreground">
            方向改变时消除DAS延迟 (0ms = 立即响应, 200ms = 最大延迟)
          </p>
          <Slider
            value={[settings.dcd]}
            onValueChange={([value]) => onSettingChange('dcd', value)}
            max={200}
            min={0}
            step={1}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default TimingTab;
