
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';
import type { GameSettings } from '@/utils/gameTypes';

interface MusicTabProps {
  settings: GameSettings;
  onSettingChange: (key: string, value: any) => void;
}

const MusicTab: React.FC<MusicTabProps> = ({ settings, onSettingChange }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentPreview, setCurrentPreview] = React.useState<string>('');
  
  // 吃鸡对战音乐库
  const musicOptions = [
    { value: '', label: '无背景音乐' },
    { value: 'battle_royale_1', label: '战斗皇家 - 激战时刻' },
    { value: 'battle_royale_2', label: '战斗皇家 - 最后决战' },
    { value: 'electronic_combat_1', label: '电子战斗 - 血战到底' },
    { value: 'electronic_combat_2', label: '电子战斗 - 胜者为王' },
    { value: 'intense_action_1', label: '紧张行动 - 危机四伏' },
    { value: 'intense_action_2', label: '紧张行动 - 生死时速' },
    { value: 'epic_battle_1', label: '史诗战斗 - 荣耀之战' },
    { value: 'epic_battle_2', label: '史诗战斗 - 终极对决' },
    { value: 'cyberpunk_fight_1', label: '赛博朋克 - 未来战士' },
    { value: 'cyberpunk_fight_2', label: '赛博朋克 - 数字战场' },
    { value: 'adrenaline_rush_1', label: '肾上腺素 - 疯狂冲刺' },
    { value: 'adrenaline_rush_2', label: '肾上腺素 - 极速狂飙' },
    { value: 'survival_mode_1', label: '生存模式 - 绝地求生' },
    { value: 'survival_mode_2', label: '生存模式 - 末日逃亡' },
    { value: 'competitive_edge_1', label: '竞技边缘 - 巅峰对决' },
    { value: 'competitive_edge_2', label: '竞技边缘 - 王者归来' },
    { value: 'victory_anthem_1', label: '胜利赞歌 - 冠军时刻' },
    { value: 'victory_anthem_2', label: '胜利赞歌 - 荣耀加冕' },
    { value: 'final_showdown_1', label: '最终对决 - 决战紫禁之巅' },
    { value: 'final_showdown_2', label: '最终对决 - 王者之争' }
  ];

  const handlePreviewMusic = (musicValue: string) => {
    if (currentPreview === musicValue && isPlaying) {
      // 停止当前播放
      setIsPlaying(false);
      setCurrentPreview('');
    } else {
      // 开始播放新音乐
      setIsPlaying(true);
      setCurrentPreview(musicValue);
      // 这里应该实际播放音乐文件，但现在只是模拟
      setTimeout(() => {
        setIsPlaying(false);
        setCurrentPreview('');
      }, 3000); // 3秒预览
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          音乐设置
        </CardTitle>
        <CardDescription>配置背景音乐和音量，精选吃鸡对战音乐库</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base font-medium">音乐音量: {settings.musicVolume}%</Label>
          <Slider
            value={[settings.musicVolume]}
            onValueChange={(value) => onSettingChange('musicVolume', value[0])}
            max={100}
            min={0}
            step={5}
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-1">
            调整背景音乐的音量大小
          </p>
        </div>

        <div>
          <Label className="text-base font-medium">背景音乐选择</Label>
          <Select 
            value={settings.backgroundMusic} 
            onValueChange={(value) => onSettingChange('backgroundMusic', value)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="选择背景音乐" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {musicOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {option.value && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewMusic(option.value);
                        }}
                      >
                        {currentPreview === option.value && isPlaying ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            选择游戏时播放的背景音乐，点击播放按钮可预览音乐
          </p>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
          <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2 flex items-center gap-2">
            🎵 音乐库说明
          </h4>
          <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
            <li>• 精选20首高质量吃鸡对战音乐</li>
            <li>• 涵盖激战、决战、生存等多种战斗场景</li>
            <li>• 音乐会根据游戏节奏自动调节</li>
            <li>• 时间限制模式中，音乐会在最后30秒加快节拍</li>
            <li>• 您可以随时通过主音量控制整体音量</li>
          </ul>
        </div>

        {currentPreview && isPlaying && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-2">
              <div className="animate-pulse">
                <Volume2 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm text-blue-800 dark:text-blue-200">
                正在预览: {musicOptions.find(m => m.value === currentPreview)?.label}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MusicTab;
