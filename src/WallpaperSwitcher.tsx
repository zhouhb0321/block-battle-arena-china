import React, { useState, useEffect } from 'react';

const WallpaperSwitcher: React.FC = () => {
  const [wallpapers] = useState<string[]>([
    'background1.jpg',
    'background2.jpg',
    'background3.jpg'
  ]);
  
  const [currentWallpaper, setCurrentWallpaper] = useState<string>('');

  // 应用背景壁纸到整个应用
  useEffect(() => {
    if (currentWallpaper) {
      document.body.style.backgroundImage = `url(/wallpapers/${currentWallpaper})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundRepeat = 'no-repeat';
    } else {
      document.body.style.backgroundImage = 'none';
    }
    
    // 清理副作用
    return () => {
      document.body.style.backgroundImage = 'none';
    };
  }, [currentWallpaper]);

  const handleWallpaperChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentWallpaper(e.target.value);
  };

  return (
    <div className="wallpaper-switcher">
      <h3>背景壁纸</h3>
      <select value={currentWallpaper} onChange={handleWallpaperChange}>
        <option value="">无背景</option>
        {wallpapers.map((wallpaper, index) => (
          <option key={index} value={wallpaper}>
            {wallpaper}
          </option>
        ))}
      </select>
      
      <div className="wallpaper-preview-info">
        <p>注意：背景图片将作为游戏界面的背景显示，不会影响游戏实际操作。</p>
        <p>背景将以覆盖模式显示，确保在各种屏幕尺寸下都能正常显示。</p>
      </div>
    </div>
  );
};

export default WallpaperSwitcher;