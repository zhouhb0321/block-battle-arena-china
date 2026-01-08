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
import { Lock, Unlock, Settings2, Zap, Target, Users } from 'lucide-react';

export interface CustomRoomConfig {
  gravity_level: number;
  garbage_multiplier: number;
  time_limit: number | null;
  allow_hold: boolean;
  starting_level: number;
  preset: 'classic' | 'modern' | 'ultra_fast' | '4wide' | 'tall' | 'custom';
  room_password?: string;
  allow_spectators: boolean;
  // 对战设置
  garbage_strategy: 'instant' | 'delayed' | 'cancellable';
  attack_multiplier: number;
  lock_delay_mode: 'classic' | 'modern' | 'extended';
  seed?: string;
  // 棋盘尺寸设置 (4W 模式支持)
  board_width: number;   // 4-10 列
  board_height: number;  // 10-40 行（可见行数）
  // 团队对战设置
  team_mode: boolean;
  team_size: number;     // 2=2v2, 3=3v3, 4=4v4
  team_scoring: 'individual' | 'combined';
  attack_strategy: 'focus' | 'random' | 'even';
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
    garbage_strategy: 'instant',
    attack_multiplier: 1.0,
    lock_delay_mode: 'modern',
    board_width: 10,
    board_height: 20,
  },
  modern: {
    preset: 'modern',
    gravity_level: 3,
    garbage_multiplier: 1.2,
    time_limit: 180,
    allow_hold: true,
    starting_level: 5,
    garbage_strategy: 'cancellable',
    attack_multiplier: 1.2,
    lock_delay_mode: 'modern',
    board_width: 10,
    board_height: 20,
  },
  ultra_fast: {
    preset: 'ultra_fast',
    gravity_level: 10,
    garbage_multiplier: 2.0,
    time_limit: 120,
    allow_hold: false,
    starting_level: 15,
    garbage_strategy: 'instant',
    attack_multiplier: 1.5,
    lock_delay_mode: 'classic',
    board_width: 10,
    board_height: 20,
  },
  '4wide': {
    preset: '4wide',
    gravity_level: 1,
    garbage_multiplier: 1.0,
    time_limit: null,
    allow_hold: true,
    starting_level: 1,
    garbage_strategy: 'instant',
    attack_multiplier: 1.0,
    lock_delay_mode: 'modern',
    board_width: 4,
    board_height: 20,
  },
  tall: {
    preset: 'tall',
    gravity_level: 1,
    garbage_multiplier: 1.0,
    time_limit: null,
    allow_hold: true,
    starting_level: 1,
    garbage_strategy: 'instant',
    attack_multiplier: 1.0,
    lock_delay_mode: 'modern',
    board_width: 10,
    board_height: 40,
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
    garbage_strategy: 'instant',
    attack_multiplier: 1.0,
    lock_delay_mode: 'modern',
    seed: '',
    board_width: 10,
    board_height: 20,
    team_mode: mode === 'league',
    team_size: 2,
    team_scoring: 'combined',
    attack_strategy: 'random',
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
                    <div>棋盘: 10×20</div>
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
                    <div>棋盘: 10×20</div>
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
                    <div>棋盘: 10×20</div>
                    <div>垃圾行: 2.0x</div>
                    <div>禁用 Hold</div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${
                  config.preset === '4wide' 
                    ? 'border-primary border-2' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handlePresetChange('4wide')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold">4W 模式</h3>
                  </div>
                  <CardDescription className="text-xs">
                    窄棋盘挑战，只有4列宽度
                  </CardDescription>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>棋盘: 4×20</div>
                    <div>垃圾行: 1.0x</div>
                    <div>允许 Hold</div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${
                  config.preset === 'tall' 
                    ? 'border-primary border-2' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handlePresetChange('tall')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold">高塔模式</h3>
                  </div>
                  <CardDescription className="text-xs">
                    超高棋盘，40行堆叠空间
                  </CardDescription>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>棋盘: 10×40</div>
                    <div>垃圾行: 1.0x</div>
                    <div>允许 Hold</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 自定义设置 */}
          <TabsContent value="custom" className="space-y-6">
            {/* 棋盘尺寸设置 */}
            <div className="p-4 rounded-lg bg-muted/30 space-y-4">
              <h4 className="font-medium text-sm">棋盘尺寸</h4>
              
              {/* 棋盘宽度 */}
              <div className="space-y-2">
                <Label>棋盘宽度: {config.board_width} 列</Label>
                <Slider
                  value={[config.board_width]}
                  onValueChange={([value]) => setConfig(prev => ({ 
                    ...prev, 
                    board_width: value,
                    preset: 'custom'
                  }))}
                  min={4}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  4 列 = 4W 模式，10 列 = 标准模式
                </p>
              </div>

              {/* 棋盘高度 */}
              <div className="space-y-2">
                <Label>棋盘高度: {config.board_height} 行</Label>
                <Slider
                  value={[config.board_height]}
                  onValueChange={([value]) => setConfig(prev => ({ 
                    ...prev, 
                    board_height: value,
                    preset: 'custom'
                  }))}
                  min={10}
                  max={40}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  10-40 行可见区域（默认 20 行）
                </p>
              </div>
            </div>

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

            {/* 垃圾行策略 */}
            <div className="space-y-2">
              <Label>垃圾行策略</Label>
              <Select
                value={config.garbage_strategy}
                onValueChange={(value: 'instant' | 'delayed' | 'cancellable') => setConfig(prev => ({ 
                  ...prev, 
                  garbage_strategy: value,
                  preset: 'custom'
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">立即添加 - 垃圾行立刻出现</SelectItem>
                  <SelectItem value="delayed">延迟添加 - 下一个方块落地后出现</SelectItem>
                  <SelectItem value="cancellable">可抵消 - 消行可以抵消即将到来的垃圾行</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 攻击倍率 */}
            <div className="space-y-2">
              <Label>攻击倍率: {config.attack_multiplier.toFixed(1)}x</Label>
              <Slider
                value={[config.attack_multiplier * 10]}
                onValueChange={([value]) => setConfig(prev => ({ 
                  ...prev, 
                  attack_multiplier: value / 10,
                  preset: 'custom'
                }))}
                min={5}
                max={20}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                控制攻击发送的倍率（0.5x-2.0x）
              </p>
            </div>

            {/* 锁定延迟模式 */}
            <div className="space-y-2">
              <Label>锁定延迟模式</Label>
              <Select
                value={config.lock_delay_mode}
                onValueChange={(value: 'classic' | 'modern' | 'extended') => setConfig(prev => ({ 
                  ...prev, 
                  lock_delay_mode: value,
                  preset: 'custom'
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">经典 - 500ms 锁定，15次重置</SelectItem>
                  <SelectItem value="modern">现代 - 500ms 锁定，无限重置</SelectItem>
                  <SelectItem value="extended">扩展 - 1000ms 锁定，无限重置</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 随机种子 */}
            <div className="space-y-2">
              <Label>随机种子（可选）</Label>
              <Input
                value={config.seed || ''}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  seed: e.target.value || undefined 
                }))}
                placeholder="留空使用随机种子"
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground">
                固定种子可用于比赛复现，相同种子会生成相同的方块序列
              </p>
            </div>

            {/* 团队模式设置 */}
            <div className="p-4 rounded-lg bg-muted/30 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                团队对战设置
              </h4>

              {/* 开启团队模式 */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>团队对战模式</Label>
                  <p className="text-xs text-muted-foreground">
                    开启后玩家将分为两队进行对战
                  </p>
                </div>
                <Switch
                  checked={config.team_mode}
                  onCheckedChange={(checked) => setConfig(prev => ({ 
                    ...prev, 
                    team_mode: checked 
                  }))}
                />
              </div>

              {config.team_mode && (
                <>
                  {/* 队伍大小 */}
                  <div className="space-y-2">
                    <Label>队伍规模</Label>
                    <Select
                      value={config.team_size.toString()}
                      onValueChange={(value) => setConfig(prev => ({ 
                        ...prev, 
                        team_size: parseInt(value)
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2v2 (每队2人)</SelectItem>
                        <SelectItem value="3">3v3 (每队3人)</SelectItem>
                        <SelectItem value="4">4v4 (每队4人)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 积分模式 */}
                  <div className="space-y-2">
                    <Label>积分模式</Label>
                    <Select
                      value={config.team_scoring}
                      onValueChange={(value: 'individual' | 'combined') => setConfig(prev => ({ 
                        ...prev, 
                        team_scoring: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="combined">团队积分 - 全队攻击力相加</SelectItem>
                        <SelectItem value="individual">个人积分 - 取最高攻击力</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      团队积分模式下，所有队员的攻击力会合并计算
                    </p>
                  </div>

                  {/* 攻击分配策略 */}
                  <div className="space-y-2">
                    <Label>攻击分配策略</Label>
                    <Select
                      value={config.attack_strategy}
                      onValueChange={(value: 'focus' | 'random' | 'even') => setConfig(prev => ({ 
                        ...prev, 
                        attack_strategy: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="focus">集中攻击 - 攻击对方最强玩家</SelectItem>
                        <SelectItem value="random">随机攻击 - 随机选择目标</SelectItem>
                        <SelectItem value="even">平均分配 - 攻击所有对手</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
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
