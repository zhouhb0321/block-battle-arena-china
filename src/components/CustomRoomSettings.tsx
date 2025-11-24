import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Lock, Unlock, Settings2, Zap, Target } from 'lucide-react';

export interface CustomRoomConfig {
  gravity_level: number;
  garbage_multiplier: number;
  time_limit: number | null;
  allow_hold: boolean;
  starting_level: number;
  preset: 'classic' | 'modern' | 'ultra_fast' | 'custom';
  room_password?: string;
  allow_spectators: boolean;
}

interface CustomRoomSettingsProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: CustomRoomConfig) => void;
  mode: 'versus' | 'battle_royale' | 'league';
}

const PRESETS: Record<string, Partial<CustomRoomConfig>> = {
  classic: {
    preset: 'classic',
    gravity_level: 1,
    garbage_multiplier: 1.0,
    time_limit: null,
    allow_hold: true,
    starting_level: 1,
  },
  modern: {
    preset: 'modern',
    gravity_level: 3,
    garbage_multiplier: 1.2,
    time_limit: 180,
    allow_hold: true,
    starting_level: 5,
  },
  ultra_fast: {
    preset: 'ultra_fast',
    gravity_level: 10,
    garbage_multiplier: 2.0,
    time_limit: 120,
    allow_hold: false,
    starting_level: 15,
  },
};

export const CustomRoomSettings: React.FC<CustomRoomSettingsProps> = ({
  open,
  onClose,
  onConfirm,
  mode
}) => {
  const [config, setConfig] = useState<CustomRoomConfig>({
    gravity_level: 1,
    garbage_multiplier: 1.0,
    time_limit: null,
    allow_hold: true,
    starting_level: 1,
    preset: 'classic',
    room_password: '',
    allow_spectators: true,
  });
  
  const [usePassword, setUsePassword] = useState(false);

  const handlePresetChange = (preset: string) => {
    const presetConfig = PRESETS[preset];
    if (presetConfig) {
      setConfig(prev => ({
        ...prev,
        ...presetConfig,
        preset: preset as CustomRoomConfig['preset']
      }));
    }
  };

  const handleConfirm = () => {
    const finalConfig = {
      ...config,
      room_password: usePassword ? config.room_password : undefined
    };
    onConfirm(finalConfig);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            自定义房间设置
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="presets">预设规则</TabsTrigger>
            <TabsTrigger value="custom">自定义</TabsTrigger>
            <TabsTrigger value="advanced">高级设置</TabsTrigger>
          </TabsList>

          {/* 预设规则 */}
          <TabsContent value="presets" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className={`cursor-pointer transition-all ${
                  config.preset === 'classic' 
                    ? 'border-primary border-2' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handlePresetChange('classic')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold">经典模式</h3>
                  </div>
                  <CardDescription className="text-xs">
                    标准重力，标准垃圾行，无时间限制
                  </CardDescription>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>重力: 等级 1</div>
                    <div>垃圾行: 1.0x</div>
                    <div>允许 Hold</div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${
                  config.preset === 'modern' 
                    ? 'border-primary border-2' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handlePresetChange('modern')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold">现代模式</h3>
                  </div>
                  <CardDescription className="text-xs">
                    快速重力，增强垃圾行，3分钟限时
                  </CardDescription>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>重力: 等级 3</div>
                    <div>垃圾行: 1.2x</div>
                    <div>时限: 180秒</div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${
                  config.preset === 'ultra_fast' 
                    ? 'border-primary border-2' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handlePresetChange('ultra_fast')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold">极速模式</h3>
                  </div>
                  <CardDescription className="text-xs">
                    超高重力，双倍垃圾行，禁用Hold
                  </CardDescription>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>重力: 等级 10</div>
                    <div>垃圾行: 2.0x</div>
                    <div>禁用 Hold</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 自定义设置 */}
          <TabsContent value="custom" className="space-y-6">
            {/* 重力等级 */}
            <div className="space-y-2">
              <Label>重力等级: {config.gravity_level}</Label>
              <Slider
                value={[config.gravity_level]}
                onValueChange={([value]) => setConfig(prev => ({ 
                  ...prev, 
                  gravity_level: value,
                  preset: 'custom'
                }))}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                控制方块下落速度（1=慢速，20=极速）
              </p>
            </div>

            {/* 垃圾行倍率 */}
            <div className="space-y-2">
              <Label>垃圾行倍率: {config.garbage_multiplier.toFixed(1)}x</Label>
              <Slider
                value={[config.garbage_multiplier * 10]}
                onValueChange={([value]) => setConfig(prev => ({ 
                  ...prev, 
                  garbage_multiplier: value / 10,
                  preset: 'custom'
                }))}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                控制对手发送的垃圾行数量（0.5x-3.0x）
              </p>
            </div>

            {/* 起始等级 */}
            <div className="space-y-2">
              <Label>起始等级</Label>
              <Select
                value={config.starting_level.toString()}
                onValueChange={(value) => setConfig(prev => ({ 
                  ...prev, 
                  starting_level: parseInt(value),
                  preset: 'custom'
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 5, 10, 15, 20].map(level => (
                    <SelectItem key={level} value={level.toString()}>
                      等级 {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 时间限制 */}
            <div className="space-y-2">
              <Label>时间限制（秒）</Label>
              <Input
                type="number"
                value={config.time_limit || ''}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  time_limit: e.target.value ? parseInt(e.target.value) : null,
                  preset: 'custom'
                }))}
                placeholder="无限制"
                min={30}
                max={600}
              />
              <p className="text-xs text-muted-foreground">
                设置游戏时长限制（留空=无限制）
              </p>
            </div>

            {/* 允许 Hold */}
            <div className="flex items-center justify-between">
              <div>
                <Label>允许 Hold 功能</Label>
                <p className="text-xs text-muted-foreground">
                  玩家可以暂存当前方块
                </p>
              </div>
              <Switch
                checked={config.allow_hold}
                onCheckedChange={(checked) => setConfig(prev => ({ 
                  ...prev, 
                  allow_hold: checked,
                  preset: 'custom'
                }))}
              />
            </div>
          </TabsContent>

          {/* 高级设置 */}
          <TabsContent value="advanced" className="space-y-6">
            {/* 房间密码 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>房间密码保护</Label>
                <Switch
                  checked={usePassword}
                  onCheckedChange={setUsePassword}
                />
              </div>
              {usePassword && (
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={config.room_password}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      room_password: e.target.value 
                    }))}
                    placeholder="输入房间密码"
                    maxLength={20}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {usePassword ? '只有知道密码的玩家才能加入' : '任何人都可以加入房间'}
              </p>
            </div>

            {/* 允许观战 */}
            <div className="flex items-center justify-between">
              <div>
                <Label>允许观战</Label>
                <p className="text-xs text-muted-foreground">
                  允许其他玩家以观众身份观看比赛
                </p>
              </div>
              <Switch
                checked={config.allow_spectators}
                onCheckedChange={(checked) => setConfig(prev => ({ 
                  ...prev, 
                  allow_spectators: checked 
                }))}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            创建房间
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomRoomSettings;
