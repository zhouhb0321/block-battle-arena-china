
import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameSettings } from '@/utils/gameTypes';

interface TimingTabProps {
  settings: GameSettings;
  onSettingChange: (key: string, value: any) => void;
}

const TimingTab: React.FC<TimingTabProps> = ({ settings, onSettingChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">操控设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
      </CardContent>
    </Card>
  );
};

export default TimingTab;
