import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Music, 
  Image, 
  Play, 
  Pause, 
  Volume2, 
  Trash2, 
  RefreshCw,
  FileAudio,
  FileImage
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface MusicFile {
  name: string;
  url: string;
  size?: string;
}

interface WallpaperFile {
  name: string;
  url: string;
  size?: string;
}

const AdminResourceManager: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [wallpaperFiles, setWallpaperFiles] = useState<WallpaperFile[]>([]);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);
  const [currentPlayingMusic, setCurrentPlayingMusic] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const musicFileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperFileInputRef = useRef<HTMLInputElement>(null);

  const typedUser = user as (typeof user & { isAdmin?: boolean });

  // 检查管理员权限
  if (!typedUser?.isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">访问被拒绝</h2>
            <p className="text-muted-foreground">需要管理员权限</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 检查音频文件是否存在
  const checkAudioExists = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('canplaythrough', () => resolve(true), { once: true });
      audio.addEventListener('error', () => resolve(false), { once: true });
      audio.addEventListener('abort', () => resolve(false), { once: true });
      audio.src = url;
      audio.load();
    });
  };

  // 检查图片文件是否存在
  const checkImageExists = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };

  // 加载音乐文件列表
  const loadMusicFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('music-files')
        .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

      if (error) throw error;

      const musicList: MusicFile[] = await Promise.all(
        data.map(async (file) => {
          const { data: urlData } = supabase.storage
            .from('music-files')
            .getPublicUrl(file.name);
          
          return {
            name: file.name,
            url: urlData.publicUrl,
            size: `${(file.metadata?.size || 0 / 1024 / 1024).toFixed(2)} MB`
          };
        })
      );

      setMusicFiles(musicList);
    } catch (error) {
      console.error('Error loading music files:', error);
      toast({
        title: "错误",
        description: "加载音乐文件失败",
        variant: "destructive"
      });
    }
  };

  // 加载壁纸文件列表
  const loadWallpaperFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('wallpapers')
        .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

      if (error) throw error;

      const wallpaperList: WallpaperFile[] = await Promise.all(
        data.map(async (file) => {
          const { data: urlData } = supabase.storage
            .from('wallpapers')
            .getPublicUrl(file.name);
          
          return {
            name: file.name,
            url: urlData.publicUrl,
            size: `${(file.metadata?.size || 0 / 1024 / 1024).toFixed(2)} MB`
          };
        })
      );

      setWallpaperFiles(wallpaperList);
    } catch (error) {
      console.error('Error loading wallpaper files:', error);
      toast({
        title: "错误",
        description: "加载壁纸文件失败",
        variant: "destructive"
      });
    }
  };

  // 播放音乐
  const playMusic = (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().then(() => {
        setCurrentPlayingMusic(url);
      }).catch(console.error);
    }
  };

  // 暂停音乐
  const pauseMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setCurrentPlayingMusic(null);
    }
  };

  // 处理音乐文件上传
  const handleMusicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingMusic(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const { error } = await supabase.storage
          .from('music-files')
          .upload(file.name, file, { upsert: true });
        
        if (error) throw error;
      });

      await Promise.all(uploadPromises);
      await loadMusicFiles();
      
      toast({
        title: "成功",
        description: `成功上传 ${files.length} 个音乐文件`,
      });
    } catch (error) {
      console.error('音乐文件上传失败:', error);
      toast({
        title: "错误",
        description: "音乐文件上传失败",
        variant: "destructive"
      });
    } finally {
      setUploadingMusic(false);
    }
  };

  // 处理壁纸文件上传
  const handleWallpaperUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingWallpaper(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const { error } = await supabase.storage
          .from('wallpapers')
          .upload(file.name, file, { upsert: true });
        
        if (error) throw error;
      });

      await Promise.all(uploadPromises);
      await loadWallpaperFiles();
      
      toast({
        title: "成功",
        description: `成功上传 ${files.length} 个壁纸文件`,
      });
    } catch (error) {
      console.error('壁纸文件上传失败:', error);
      toast({
        title: "错误",
        description: "壁纸文件上传失败",
        variant: "destructive"
      });
    } finally {
      setUploadingWallpaper(false);
    }
  };

  // 删除音乐文件
  const deleteMusicFile = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from('music-files')
        .remove([fileName]);
      
      if (error) throw error;
      
      await loadMusicFiles();
      toast({
        title: "成功",
        description: `已删除音乐文件: ${fileName}`,
      });
    } catch (error) {
      console.error('删除音乐文件失败:', error);
      toast({
        title: "错误",
        description: "删除音乐文件失败",
        variant: "destructive"
      });
    }
  };

  // 删除壁纸文件
  const deleteWallpaperFile = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from('wallpapers')
        .remove([fileName]);
      
      if (error) throw error;
      
      await loadWallpaperFiles();
      toast({
        title: "成功",
        description: `已删除壁纸文件: ${fileName}`,
      });
    } catch (error) {
      console.error('删除壁纸文件失败:', error);
      toast({
        title: "错误",
        description: "删除壁纸文件失败",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadMusicFiles();
    loadWallpaperFiles();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">资源管理</h2>
        <Badge variant="secondary">仅管理员可见</Badge>
      </div>

      <Tabs defaultValue="music" className="space-y-4">
        <TabsList>
          <TabsTrigger value="music" className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            音乐管理
          </TabsTrigger>
          <TabsTrigger value="wallpapers" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            壁纸管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="music" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileAudio className="w-5 h-5" />
                  音乐文件管理
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => musicFileInputRef.current?.click()}
                    disabled={uploadingMusic}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingMusic ? '上传中...' : '上传音乐'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMusicFiles}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={musicFileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleMusicUpload}
                className="hidden"
              />
              
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {musicFiles.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无音乐文件</p>
                      <p className="text-sm">请上传音乐文件到 /public/music/ 目录</p>
                    </div>
                  ) : (
                    musicFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <Music className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">{file.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentPlayingMusic === file.url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => pauseMusic()}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => playMusic(file.url)}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMusicFile(file.name)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallpapers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  壁纸文件管理
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => wallpaperFileInputRef.current?.click()}
                    disabled={uploadingWallpaper}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingWallpaper ? '上传中...' : '上传壁纸'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadWallpaperFiles}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={wallpaperFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleWallpaperUpload}
                className="hidden"
              />
              
              <ScrollArea className="h-64">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {wallpaperFiles.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-8">
                      <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无壁纸文件</p>
                      <p className="text-sm">请上传图片文件到 /public/wallpapers/ 目录</p>
                    </div>
                  ) : (
                    wallpaperFiles.map((file, index) => (
                      <div
                        key={index}
                        className="relative group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteWallpaperFile(file.name)}
                              className="text-red-500 hover:text-red-700 bg-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-2 bg-white">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500 truncate">{file.url}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 隐藏的音频元素用于播放 */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
};

export default AdminResourceManager; 