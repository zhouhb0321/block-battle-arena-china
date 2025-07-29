import React, { useState, useEffect } from 'react';
import WallpaperSwitcher from './WallpaperSwitcher';

const ResourceManagement: React.FC = () => {
  const [musicFiles, setMusicFiles] = useState<string[]>([]);
  const [wallpaperFiles, setWallpaperFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // 模拟从/public/music和/public/wallpapers目录读取文件
  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      try {
        // 模拟加载音乐文件
        setMusicFiles([
          'song1.mp3',
          'song2.mp3',
          'background1.mp3'
        ]);
        
        // 模拟加载壁纸文件
        setWallpaperFiles([
          'wallpaper1.jpg',
          'wallpaper2.png',
          'background1.jpg'
        ]);
      } catch (error) {
        console.error('读取文件失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadFiles();
  }, []);

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // 模拟上传过程
      setTimeout(() => {
        alert(`成功上传 ${files.length} 个音乐文件`);
        // 在实际应用中，这里应该重新加载文件列表
      }, 1000);
    }
  };

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // 模拟上传过程
      setTimeout(() => {
        alert(`成功上传 ${files.length} 个壁纸文件`);
        // 在实际应用中，这里应该重新加载文件列表
      }, 1000);
    }
  };

  return (
    <div className="resource-management">
      <h2>资源管理</h2>
      
      {loading && <p>加载中...</p>}
      
      <div className="resource-section">
        <h3>音乐管理</h3>
        <div className="upload-section">
          <label htmlFor="music-upload" className="upload-button">
            上传音乐
          </label>
          <input 
            id="music-upload" 
            type="file" 
            accept="audio/*" 
            multiple 
            onChange={handleMusicUpload} 
            style={{ display: 'none' }}
          />
        </div>
        <div className="file-list">
          <h4>已上传音乐:</h4>
          <ul>
            {musicFiles.map((file, index) => (
              <li key={index}>{file}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="resource-section">
        <h3>壁纸管理</h3>
        <div className="upload-section">
          <label htmlFor="wallpaper-upload" className="upload-button">
            上传壁纸
          </label>
          <input 
            id="wallpaper-upload" 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handleWallpaperUpload} 
            style={{ display: 'none' }}
          />
        </div>
        <div className="file-list">
          <h4>已上传壁纸:</h4>
          <ul>
            {wallpaperFiles.map((file, index) => (
              <li key={index}>{file}</li>
            ))}
          </ul>
        </div>
        
        {/* 壁纸切换器 */}
        <WallpaperSwitcher />
      </div>
    </div>
  );
};

export default ResourceManagement;