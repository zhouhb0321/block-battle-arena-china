
import React, { useState, useEffect, useCallback } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

interface BackgroundWallpaperProps {
  children: React.ReactNode;
}

const BackgroundWallpaper: React.FC<BackgroundWallpaperProps> = ({ children }) => {
  const { settings } = useUserSettings();
  const [currentWallpaper, setCurrentWallpaper] = useState<string>('');
  const [nextWallpaper, setNextWallpaper] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 可用的壁纸列表 - 用户需要将图片放在 public/wallpapers/ 目录下
  const availableWallpapers = [
    '/wallpapers/wallpaper1.jpg',
    '/wallpapers/wallpaper2.jpg',
    '/wallpapers/wallpaper3.jpg',
    '/wallpapers/wallpaper4.jpg',
    '/wallpapers/wallpaper5.jpg',
    '/wallpapers/wallpaper6.jpg',
    '/wallpapers/wallpaper7.jpg',
    '/wallpapers/wallpaper8.jpg',
    '/wallpapers/sunset1.jpg'
  ];

  // 检查图片是否存在
  const checkImageExists = useCallback((url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }, []);

  // 获取可用的壁纸
  const getAvailableWallpapers = useCallback(async () => {
    const validWallpapers = [];
    for (const wallpaper of availableWallpapers) {
      const exists = await checkImageExists(wallpaper);
      if (exists) {
        validWallpapers.push(wallpaper);
      }
    }
    return validWallpapers;
  }, [availableWallpapers, checkImageExists]);

  // 随机选择壁纸
  const getRandomWallpaper = useCallback((validWallpapers: string[], exclude?: string) => {
    const filtered = exclude ? validWallpapers.filter(w => w !== exclude) : validWallpapers;
    if (filtered.length === 0) return validWallpapers[0] || '';
    return filtered[Math.floor(Math.random() * filtered.length)];
  }, []);

  // 切换壁纸
  const switchWallpaper = useCallback(async () => {
    if (!settings.enableWallpaper) return;
    
    const validWallpapers = await getAvailableWallpapers();
    if (validWallpapers.length === 0) return;

    const newWallpaper = getRandomWallpaper(validWallpapers, currentWallpaper);
    
    setNextWallpaper(newWallpaper);
    setIsTransitioning(true);
    
    // 预加载下一张图片
    const img = new Image();
    img.onload = () => {
      setTimeout(() => {
        setCurrentWallpaper(newWallpaper);
        setIsTransitioning(false);
        setNextWallpaper('');
      }, 1000); // 1秒淡入淡出效果
    };
    img.src = newWallpaper;
  }, [settings.enableWallpaper, currentWallpaper, getAvailableWallpapers, getRandomWallpaper]);

  // 初始化壁纸
  useEffect(() => {
    if (settings.enableWallpaper && !currentWallpaper) {
      getAvailableWallpapers().then(validWallpapers => {
        if (validWallpapers.length > 0) {
          const initialWallpaper = getRandomWallpaper(validWallpapers);
          setCurrentWallpaper(initialWallpaper);
        }
      });
    }
  }, [settings.enableWallpaper, currentWallpaper, getAvailableWallpapers, getRandomWallpaper]);

  // 设置定时切换
  useEffect(() => {
    if (!settings.enableWallpaper) {
      setCurrentWallpaper('');
      return;
    }

    // 使用用户设置的切换间隔
    const switchInterval = (settings.wallpaperChangeInterval || 120) * 1000;
    
    const timer = setInterval(switchWallpaper, switchInterval);
    
    return () => clearInterval(timer);
  }, [settings.enableWallpaper, settings, switchWallpaper]);

  return (
    <div className="relative min-h-screen w-full">
      {/* 当前壁纸 */}
      {currentWallpaper && settings.enableWallpaper && (
        <div
          className={`fixed inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
            isTransitioning ? 'opacity-60' : 'opacity-80'
          }`}
          style={{
            backgroundImage: `url(${currentWallpaper})`,
            zIndex: -2,
            filter: 'brightness(0.3) contrast(1.2) saturate(0.8)' // 深色处理减少视觉干扰
          }}
        />
      )}
      
      {/* 下一张壁纸（用于过渡效果）*/}
      {nextWallpaper && isTransitioning && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 opacity-60"
          style={{
            backgroundImage: `url(${nextWallpaper})`,
            zIndex: -1,
            filter: 'brightness(0.3) contrast(1.2) saturate(0.8)'
          }}
        />
      )}
      
      {/* 深色遮罩确保内容可读性 */}
      {currentWallpaper && settings.enableWallpaper && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px]"
          style={{ zIndex: -1 }}
        />
      )}
      
      {/* 游戏内容 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default BackgroundWallpaper;
