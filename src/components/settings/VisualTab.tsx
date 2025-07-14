
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Image, Eye, EyeOff } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useWallpaperManager } from '@/hooks/useWallpaperManager';

interface VisualTabProps {
  settings?: any;
  onSettingChange?: (key: string, value: any) => void;
}

const VisualTab: React.FC<VisualTabProps> = ({ settings: propSettings, onSettingChange }) => {
  const { settings, updateSettings } = useUserSettings();
  const { availableWallpapers, currentWallpaperIndex, isLoading } = useWallpaperManager();

  // Use prop settings if provided, otherwise use hook settings
  const currentSettings = propSettings || settings;

  const handleGhostOpacityChange = (value: number[]) => {
    if (onSettingChange) {
      onSettingChange('ghostOpacity', value[0]);
    } else {
      updateSettings({ ghostOpacity: value[0] });
    }
  };

  const handleWallpaperToggle = (checked: boolean) => {
    if (onSettingChange) {
      onSettingChange('enableWallpaper', checked);
    } else {
      updateSettings({ enableWallpaper: checked });
    }
  };

  const handleWallpaperOpacityChange = (value: number[]) => {
    if (onSettingChange) {
      onSettingChange('wallpaperOpacity', value[0]);
    } else {
      updateSettings({ wallpaperOpacity: value[0] });
    }
  };

  const handleLineAnimationToggle = (checked: boolean) => {
    if (onSettingChange) {
      onSettingChange('enableLineAnimation', checked);
    } else {
      updateSettings({ enableLineAnimation: checked });
    }
  };

  const handleAchievementAnimationToggle = (checked: boolean) => {
    if (onSettingChange) {
      onSettingChange('enableAchievementAnimation', checked);
    } else {
      updateSettings({ enableAchievementAnimation: checked });
    }
  };

  const handleLandingEffectToggle = (checked: boolean) => {
    if (onSettingChange) {
      onSettingChange('enableLandingEffect', checked);
    } else {
      updateSettings({ enableLandingEffect: checked });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            视觉设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 幽灵方块透明度 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>幽灵方块透明度</Label>
              <span className="text-sm text-muted-foreground">{currentSettings.ghostOpacity}%</span>
            </div>
            <Slider
              value={[currentSettings.ghostOpacity]}
              onValueChange={handleGhostOpacityChange}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* 启用壁纸 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-wallpaper">启用背景壁纸</Label>
            <Switch
              id="enable-wallpaper"
              checked={currentSettings.enableWallpaper}
              onCheckedChange={handleWallpaperToggle}
            />
          </div>

          {/* 壁纸透明度 */}
          {currentSettings.enableWallpaper && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>壁纸透明度</Label>
                <span className="text-sm text-muted-foreground">{currentSettings.wallpaperOpacity}%</span>
              </div>
              <Slider
                value={[currentSettings.wallpaperOpacity]}
                onValueChange={handleWallpaperOpacityChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          )}

          {/* 动画效果 */}
          <div className="space-y-4">
            <h4 className="font-medium">动画效果</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="line-animation">消行动画</Label>
              <Switch
                id="line-animation"
                checked={currentSettings.enableLineAnimation}
                onCheckedChange={handleLineAnimationToggle}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="achievement-animation">成就动画</Label>
              <Switch
                id="achievement-animation"
                checked={currentSettings.enableAchievementAnimation}
                onCheckedChange={handleAchievementAnimationToggle}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="landing-effect">落地特效</Label>
              <Switch
                id="landing-effect"
                checked={currentSettings.enableLandingEffect}
                onCheckedChange={handleLandingEffectToggle}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 壁纸预览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            背景壁纸
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableWallpapers.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableWallpapers.slice(0, 6).map((wallpaper, index) => (
                  <div
                    key={wallpaper.name}
                    className={`relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      index === currentWallpaperIndex
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={wallpaper.url}
                      alt={wallpaper.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {index === currentWallpaperIndex && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Eye className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                * 壁纸已自动加载，当前显示: {availableWallpapers[currentWallpaperIndex]?.name || '默认'}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">未发现壁纸文件</p>
              <p className="text-xs text-muted-foreground mt-2">
                请联系管理员添加壁纸文件
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VisualTab;
