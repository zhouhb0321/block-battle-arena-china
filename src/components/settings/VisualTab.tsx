
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw, Image, Monitor } from 'lucide-react';
import { useWallpaperManager } from '@/hooks/useWallpaperManager';
import type { GameSettings } from '@/utils/gameTypes';

interface VisualTabProps {
  settings: GameSettings;
  onSettingChange: (key: keyof GameSettings, value: any) => void;
}

const VisualTab: React.FC<VisualTabProps> = ({ settings, onSettingChange }) => {
  const { availableWallpapers, currentWallpaperIndex, isLoading, detectWallpapers } = useWallpaperManager();

  return (
    <div className="space-y-6">
      {/* 幽灵方块设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            幽灵方块设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>启用幽灵方块</Label>
            <Switch
              checked={settings.enableGhost}
              onCheckedChange={(checked) => onSettingChange('enableGhost', checked)}
            />
          </div>

          {settings.enableGhost && (
            <div className="space-y-2">
              <Label>幽灵方块透明度: {settings.ghostOpacity}%</Label>
              <Slider
                value={[settings.ghostOpacity]}
                onValueChange={(values) => onSettingChange('ghostOpacity', values[0])}
                max={100}
                min={10}
                step={5}
                className="w-full"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 背景壁纸设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            背景壁纸设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>启用背景壁纸</Label>
            <Switch
              checked={settings.enableWallpaper}
              onCheckedChange={(checked) => onSettingChange('enableWallpaper', checked)}
            />
          </div>

          {settings.enableWallpaper && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>壁纸文件检测</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={detectWallpapers}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? '检测中...' : '重新检测'}
                  </Button>
                </div>
                
                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-sm space-y-2">
                    <div className="font-medium">
                      检测到 {availableWallpapers.length} 个壁纸文件
                    </div>
                    {availableWallpapers.length > 0 ? (
                      <>
                        <div className="text-xs text-muted-foreground">
                          当前显示: {availableWallpapers[currentWallpaperIndex]?.name || '无'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          • 壁纸每 2-3 分钟自动随机切换
                        </div>
                        <div className="text-xs text-muted-foreground">
                          • 支持格式: JPG, PNG, WebP
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        将壁纸文件放入 public/wallpapers/ 目录中即可自动检测
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>壁纸透明度: {settings.wallpaperOpacity || 100}%</Label>
                <Slider
                  value={[settings.wallpaperOpacity || 100]}
                  onValueChange={(values) => onSettingChange('wallpaperOpacity', values[0])}
                  max={100}
                  min={10}
                  step={5}
                  className="w-full"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 视觉效果设置 */}
      <Card>
        <CardHeader>
          <CardTitle>视觉效果设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>启用行消除动画</Label>
            <Switch
              checked={settings.enableLineAnimation || false}
              onCheckedChange={(checked) => onSettingChange('enableLineAnimation', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>启用成就动画</Label>
            <Switch
              checked={settings.enableAchievementAnimation || false}
              onCheckedChange={(checked) => onSettingChange('enableAchievementAnimation', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>启用方块着陆效果</Label>
            <Switch
              checked={settings.enableLandingEffect || false}
              onCheckedChange={(checked) => onSettingChange('enableLandingEffect', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VisualTab;
