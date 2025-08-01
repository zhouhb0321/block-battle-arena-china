
import React, { useState, useEffect, useCallback } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { supabase } from '@/integrations/supabase/client';

interface BackgroundWallpaperProps {
  children: React.ReactNode;
}

const BackgroundWallpaper: React.FC<BackgroundWallpaperProps> = ({ children }) => {
  const { settings } = useUserSettings();
  const [currentWallpaper, setCurrentWallpaper] = useState<string>('');
  const [nextWallpaper, setNextWallpaper] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [availableWallpapers, setAvailableWallpapers] = useState<string[]>([]);

  // 检查图片是否存在
  const checkImageExists = useCallback((url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }, []);

  // 从Supabase Storage获取壁纸文件列表
  const fetchWallpaperFiles = useCallback(async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase.storage
        .from('wallpapers')
        .list('', {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) {
        console.error('获取壁纸文件列表失败:', error);
        return [];
      }
      
      const wallpapers: string[] = [];
      for (const file of data || []) {
        if (file.name.match(/\.(jpg|jpeg|png|webp|bmp)$/i)) {
          const { data: { publicUrl } } = supabase.storage
            .from('wallpapers')
            .getPublicUrl(file.name);
          
          wallpapers.push(publicUrl);
        }
      }
      
      return wallpapers;
    } catch (error) {
      console.error('获取壁纸文件异常:', error);
      return [];
    }
  }, []);
  
  // 获取可用的壁纸
  const getAvailableWallpapers = useCallback(async () => {
    // 首先尝试从Supabase Storage获取
    const storageWallpapers = await fetchWallpaperFiles();
    if (storageWallpapers.length > 0) {
      return storageWallpapers;
    }
    
    // 如果Storage中没有文件，检查本地wallpapers
    const validWallpapers = [];
    for (const wallpaper of availableWallpapers) {
      const exists = await checkImageExists(wallpaper);
      if (exists) {
        validWallpapers.push(wallpaper);
      }
    }
    return validWallpapers;
  }, [availableWallpapers, checkImageExists, fetchWallpaperFiles]);

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

  // 初始化壁纸和获取列表
  useEffect(() => {
    const initializeWallpapers = async () => {
      // 首先获取壁纸列表
      const wallpapers = await fetchWallpaperFiles();
      setAvailableWallpapers(wallpapers);
      
      // 如果启用壁纸且还没有当前壁纸，设置初始壁纸
      if (settings.enableWallpaper && !currentWallpaper && wallpapers.length > 0) {
        const initialWallpaper = getRandomWallpaper(wallpapers);
        setCurrentWallpaper(initialWallpaper);
      }
    };
    
    initializeWallpapers();
  }, [settings.enableWallpaper, currentWallpaper, fetchWallpaperFiles, getRandomWallpaper]);

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
