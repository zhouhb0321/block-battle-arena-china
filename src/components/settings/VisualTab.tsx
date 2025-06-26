
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameSettings } from '@/utils/gameTypes';

interface VisualTabProps {
  settings: GameSettings;
  onSettingChange: (key: string, value: any) => void;
}

const VisualTab: React.FC<VisualTabProps> = ({ settings, onSettingChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">视觉设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>幽灵方块</Label>
          <Switch
            checked={settings.enableGhost}
            onCheckedChange={(checked) => onSettingChange('enableGhost', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default VisualTab;
