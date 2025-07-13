import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Play, Pause, Volume2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MusicFile {
  id: string;
  title: string;
  filename: string;
  url: string;
  exists: boolean;
  duration?: number;
}

const AdminMusicManagement: React.FC = () => {
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const defaultMusicList: MusicFile[] = [
    {
      id: 'wotlk-main',
      title: 'WotLK Main Title',
      filename: 'WotLK_main_title.mp3',
      url: '/music/WotLK_main_title.mp3',
      exists: false
    },
    {
      id: 'tetris-theme-a',
      title: 'Tetris Theme A',
      filename: 'tetris-theme-a.mp3',
      url: '/music/tetris-theme-a.mp3',
      exists: false
    },
    {
      id: 'tetris-theme-b',
      title: 'Tetris Theme B',
      filename: 'tetris-theme-b.mp3',
      url: '/music/tetris-theme-b.mp3',
      exists: false
    },
    {
      id: 'korobeiniki',
      title: 'Korobeiniki (Traditional)',
      filename: 'korobeiniki.mp3',
      url: '/music/korobeiniki.mp3',
      exists: false
    },
    {
      id: 'tetris-99',
      title: 'Tetris 99 Theme',
      filename: 'tetris-99.mp3',
      url: '/music/tetris-99.mp3',
      exists: false
    },
    {
      id: 'type-a',
      title: 'Type A (Classic)',
      filename: 'type-a.mp3',
      url: '/music/type-a.mp3',
      exists: false
    }
  ];

  const checkMusicFile = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('canplaythrough', () => resolve(true), { once: true });
      audio.addEventListener('error', () => resolve(false), { once: true });
      audio.addEventListener('abort', () => resolve(false), { once: true });
      audio.src = url;
      audio.load();
    });
  };

  const scanMusicFiles = async () => {
    setLoading(true);
    console.log('扫描音乐文件...');
    
    const scannedFiles: MusicFile[] = [];
    
    for (const file of defaultMusicList) {
      console.log(`检查音乐文件: ${file.url}`);
      const exists = await checkMusicFile(file.url);
      
      scannedFiles.push({
        ...file,
        exists
      });
      
      if (exists) {
        console.log(`✓ 找到音乐文件: ${file.title}`);
      } else {
        console.log(`✗ 音乐文件不存在: ${file.url}`);
      }
    }
    
    setMusicFiles(scannedFiles);
    setLoading(false);
    
    const existingCount = scannedFiles.filter(f => f.exists).length;
    console.log(`扫描完成，找到 ${existingCount}/${scannedFiles.length} 个音乐文件`);
  };

  useEffect(() => {
    scanMusicFiles();
  }, []);

  const playPreview = (file: MusicFile) => {
    if (!file.exists) return;
    
    if (currentlyPlaying === file.id) {
      setCurrentlyPlaying(null);
      return;
    }
    
    setCurrentlyPlaying(file.id);
    
    const audio = new Audio(file.url);
    audio.volume = 0.3;
    audio.play().catch(console.error);
    
    // 播放10秒预览
    setTimeout(() => {
      audio.pause();
      setCurrentlyPlaying(null);
    }, 10000);
  };

  const existingFiles = musicFiles.filter(f => f.exists);
  const missingFiles = musicFiles.filter(f => !f.exists);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              音乐文件管理
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={scanMusicFiles}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              重新扫描
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p>扫描音乐文件中...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{existingFiles.length}</div>
                  <div className="text-sm text-green-700">可用文件</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{missingFiles.length}</div>
                  <div className="text-sm text-red-700">缺失文件</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{musicFiles.length}</div>
                  <div className="text-sm text-blue-700">总计文件</div>
                </div>
              </div>

              {/* 可用文件列表 */}
              {existingFiles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-green-700">可用音乐文件</h3>
                  <div className="space-y-2">
                    {existingFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <Music className="w-4 h-4 text-green-600" />
                          <div>
                            <div className="font-medium text-green-800">{file.title}</div>
                            <div className="text-sm text-green-600">{file.filename}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            可用
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playPreview(file)}
                            className="text-green-600 hover:text-green-700"
                          >
                            {currentlyPlaying === file.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 缺失文件列表 */}
              {missingFiles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-700">缺失音乐文件</h3>
                  <div className="space-y-2">
                    {missingFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-3">
                          <Music className="w-4 h-4 text-red-600" />
                          <div>
                            <div className="font-medium text-red-800">{file.title}</div>
                            <div className="text-sm text-red-600">{file.filename}</div>
                            <div className="text-xs text-red-500">路径: {file.url}</div>
                          </div>
                        </div>
                        <Badge variant="destructive">
                          缺失
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  {/* 添加说明 */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">如何添加音乐文件：</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>1. 将音乐文件放置在项目的 <code className="bg-blue-100 px-1 rounded">public/music/</code> 目录下</li>
                      <li>2. 确保文件名与上表中的文件名完全一致</li>
                      <li>3. 支持的音频格式：MP3, OGG, WAV</li>
                      <li>4. 建议文件大小不超过 10MB</li>
                      <li>5. 添加文件后点击"重新扫描"按钮</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 使用说明 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">音乐系统状态：</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• 用户可以在设置中启用/禁用背景音乐</div>
                  <div>• 游戏会自动从可用文件中随机播放</div>
                  <div>• 音量可通过主音量和音乐音量独立调节</div>
                  <div>• 支持随机播放和顺序播放模式</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMusicManagement;