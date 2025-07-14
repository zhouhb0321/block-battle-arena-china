
import { useState, useEffect, useCallback } from 'react';
import { useUserSettings } from './useUserSettings';

interface WallpaperFile {
  name: string;
  url: string;
}

export const useWallpaperManager = () => {
  const { settings, updateSettings } = useUserSettings();
  const [availableWallpapers, setAvailableWallpapers] = useState<WallpaperFile[]>([]);
  const [currentWallpaperIndex, setCurrentWallpaperIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 自动检测壁纸文件，不需要用户手动触发
  const detectWallpapers = useCallback(async () => {
    try {
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      const wallpapers: WallpaperFile[] = [];
      
      // 预定义的壁纸列表，应用启动时检测
      const commonNames = [
        'wallpaper1', 'wallpaper2', 'wallpaper3', 'wallpaper4', 'wallpaper5',
        'bg1', 'bg2', 'bg3', 'bg4', 'bg5',
        'background1', 'background2', 'background3'
      ];

      for (const name of commonNames) {
        for (const ext of extensions) {
          try {
            const url = `/wallpapers/${name}.${ext}`;
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
              wallpapers.push({ name: `${name}.${ext}`, url });
            }
          } catch (error) {
            // 文件不存在，继续检测其他文件
          }
        }
      }

      setAvailableWallpapers(wallpapers);
      if (wallpapers.length > 0 && !settings.enableWallpaper) {
        // 如果检测到壁纸但未启用，可以选择自动启用或保持当前设置
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error detecting wallpapers:', error);
      setIsLoading(false);
    }
  }, [settings.enableWallpaper]);

  // 自动切换壁纸功能
  useEffect(() => {
    if (!settings.enableWallpaper || availableWallpapers.length === 0) return;

    const interval = setInterval(() => {
      setCurrentWallpaperIndex(prev => 
        (prev + 1) % availableWallpapers.length
      );
    }, Math.random() * 60000 + 120000); // 2-3分钟随机切换

    return () => clearInterval(interval);
  }, [settings.enableWallpaper, availableWallpapers.length]);

  // 应用壁纸到页面背景
  useEffect(() => {
    if (settings.enableWallpaper && availableWallpapers.length > 0) {
      const wallpaper = availableWallpapers[currentWallpaperIndex];
      const opacity = (settings.wallpaperOpacity || 100) / 100;
      document.body.style.backgroundImage = `url('${wallpaper.url}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.opacity = opacity.toString();
    } else {
      document.body.style.backgroundImage = '';
    }
  }, [settings.enableWallpaper, availableWallpapers, currentWallpaperIndex, settings.wallpaperOpacity]);

  // 应用启动时自动检测
  useEffect(() => {
    detectWallpapers();
  }, [detectWallpapers]);

  return {
    availableWallpapers,
    currentWallpaperIndex,
    isLoading
    // 移除 detectWallpapers 函数，不再暴露给UI使用
  };
};
