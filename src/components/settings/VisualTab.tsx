
import React, { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Sparkles, RefreshCw, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { GameSettings } from '@/utils/gameTypes';

interface VisualTabProps {
  settings: GameSettings;
  onSettingChange: (key: string, value: any) => void;
}

const VisualTab: React.FC<VisualTabProps> = ({ settings, onSettingChange }) => {
  // 添加幽灵方块透明度设置（如果不存在则默认为50%）
  const ghostOpacity = (settings as any).ghostOpacity || 50;
  
  // 背景图片相关状态
  const [backgroundImages, setBackgroundImages] = useState<string[]>([]);
  const [currentPreviewImage, setCurrentPreviewImage] = useState<string>('');
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // 获取背景图片列表
  const fetchBackgroundImages = useCallback(async () => {
    setIsLoadingImages(true);
    try {
      const { data, error } = await supabase.storage
        .from('wallpapers')
        .list('', {
          limit: 50,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) {
        console.error('获取背景图片失败:', error);
        return;
      }
      
      const imageUrls: string[] = [];
      for (const file of data || []) {
        if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const { data: { publicUrl } } = supabase.storage
            .from('wallpapers')
            .getPublicUrl(file.name);
          imageUrls.push(publicUrl);
        }
      }
      
      setBackgroundImages(imageUrls);
      if (imageUrls.length > 0 && !currentPreviewImage) {
        setCurrentPreviewImage(imageUrls[0]);
      }
    } catch (error) {
      console.error('获取背景图片异常:', error);
    } finally {
      setIsLoadingImages(false);
    }
  }, [currentPreviewImage]);

  // 初始化时获取背景图片
  useEffect(() => {
    fetchBackgroundImages();
  }, [fetchBackgroundImages]);

  // 随机预览图片
  const previewRandomImage = () => {
    if (backgroundImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * backgroundImages.length);
      setCurrentPreviewImage(backgroundImages[randomIndex]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="w-5 h-5" />
          视觉设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">幽灵方块显示</Label>
            <p className="text-sm text-muted-foreground">
              显示方块的预落位置轮廓
            </p>
          </div>
          <Switch
            checked={settings.enableGhost}
            onCheckedChange={(checked) => onSettingChange('enableGhost', checked)}
          />
        </div>

        {settings.enableGhost && (
          <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <Label className="text-base font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              幽灵方块透明度: {ghostOpacity}%
            </Label>
            <Slider
              value={[ghostOpacity]}
              onValueChange={(value) => onSettingChange('ghostOpacity', value[0])}
              max={100}
              min={10}
              step={5}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground">
              调整幽灵方块的透明度，数值越高越不透明
            </p>
            
            {/* 预览效果 */}
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">预览效果:</div>
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                <div 
                  className="w-4 h-4 bg-blue-500 rounded-sm" 
                  style={{ opacity: ghostOpacity / 100 }}
                ></div>
                <div className="text-xs text-gray-500 ml-2 self-center">
                  实体方块 vs 幽灵方块
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 背景图片设置 */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">背景图片自动切换</Label>
              <p className="text-sm text-muted-foreground">
                定期更换背景图片以减少视觉疲劳
              </p>
            </div>
            <Switch
              checked={settings.enableWallpaper}
              onCheckedChange={(checked) => onSettingChange('enableWallpaper', checked)}
            />
          </div>

          {settings.enableWallpaper && (
            <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
              <Label className="text-base font-medium">
                切换间隔: {settings.wallpaperChangeInterval || 120}秒
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[120, 180, 300].map((interval) => (
                  <button
                    key={interval}
                    onClick={() => onSettingChange('wallpaperChangeInterval', interval)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      (settings.wallpaperChangeInterval || 120) === interval
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-accent'
                    }`}
                  >
                    {interval}秒
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                建议使用较长间隔避免分心，图片将从上传的背景图片中随机选择
              </p>
              
              {/* 背景图片预览区域 */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    背景图片预览
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchBackgroundImages}
                      disabled={isLoadingImages}
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingImages ? 'animate-spin' : ''}`} />
                      刷新
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={previewRandomImage}
                      disabled={backgroundImages.length === 0}
                    >
                      随机预览
                    </Button>
                  </div>
                </div>
                
                {backgroundImages.length > 0 ? (
                  <div className="space-y-2">
                    <div 
                      className="w-full h-24 bg-cover bg-center rounded-lg border"
                      style={{ 
                        backgroundImage: currentPreviewImage ? `url(${currentPreviewImage})` : 'none',
                        backgroundColor: !currentPreviewImage ? '#f0f0f0' : 'transparent'
                      }}
                    >
                      {!currentPreviewImage && (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                          点击"随机预览"查看背景图片
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      找到 {backgroundImages.length} 张背景图片
                    </p>
                  </div>
                ) : (
                  <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm text-gray-500">
                      未找到背景图片
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      请通过管理面板上传背景图片文件
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">视觉提示</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• 幽灵方块可以帮助您快速判断方块的最终位置</li>
            <li>• 适当的透明度设置可以避免遮挡游戏区域</li>
            <li>• 背景图片会自动切换，降低视觉疲劳</li>
            <li>• 您可以根据个人喜好调整各项设置</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default VisualTab;
