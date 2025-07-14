
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image, Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WallpaperFile {
  id: string;
  title: string;
  filename: string;
  url: string;
  exists: boolean;
  category: string;
}

const AdminWallpaperManagement: React.FC = () => {
  const [wallpaperFiles, setWallpaperFiles] = useState<WallpaperFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const defaultWallpaperList: WallpaperFile[] = [
    {
      id: 'landscape1',
      title: '风景 1',
      filename: 'landscape1.jpg',
      url: '/wallpapers/landscape1.jpg',
      exists: false,
      category: '风景'
    },
    {
      id: 'landscape2',
      title: '风景 2',
      filename: 'landscape2.jpg',
      url: '/wallpapers/landscape2.jpg',
      exists: false,
      category: '风景'
    },
    {
      id: 'landscape3',
      title: '风景 3',
      filename: 'landscape3.jpg',
      url: '/wallpapers/landscape3.jpg',
      exists: false,
      category: '风景'
    },
    {
      id: 'mountain1',
      title: '山脉 1',
      filename: 'mountain1.jpg',
      url: '/wallpapers/mountain1.jpg',
      exists: false,
      category: '山脉'
    },
    {
      id: 'mountain2',
      title: '山脉 2',
      filename: 'mountain2.jpg',
      url: '/wallpapers/mountain2.jpg',
      exists: false,
      category: '山脉'
    },
    {
      id: 'forest1',
      title: '森林 1',
      filename: 'forest1.jpg',
      url: '/wallpapers/forest1.jpg',
      exists: false,
      category: '森林'
    },
    {
      id: 'forest2',
      title: '森林 2',
      filename: 'forest2.jpg',
      url: '/wallpapers/forest2.jpg',
      exists: false,
      category: '森林'
    },
    {
      id: 'sunset1',
      title: '日落 1',
      filename: 'sunset1.jpg',
      url: '/wallpapers/sunset1.jpg',
      exists: false,
      category: '日落'
    },
    {
      id: 'abstract1',
      title: '抽象 1',
      filename: 'abstract1.jpg',
      url: '/wallpapers/abstract1.jpg',
      exists: false,
      category: '抽象'
    },
    {
      id: 'space1',
      title: '太空 1',
      filename: 'space1.jpg',
      url: '/wallpapers/space1.jpg',
      exists: false,
      category: '太空'
    }
  ];

  const checkImageFile = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      img.src = url;
    });
  };

  const scanWallpaperFiles = async () => {
    setLoading(true);
    console.log('扫描壁纸文件...');
    
    const scannedFiles: WallpaperFile[] = [];
    
    for (const file of defaultWallpaperList) {
      console.log(`检查壁纸文件: ${file.url}`);
      const exists = await checkImageFile(file.url);
      
      scannedFiles.push({
        ...file,
        exists
      });
      
      if (exists) {
        console.log(`✓ 找到壁纸文件: ${file.title}`);
      } else {
        console.log(`✗ 壁纸文件不存在: ${file.url}`);
      }
    }
    
    setWallpaperFiles(scannedFiles);
    setLoading(false);
    
    const existingCount = scannedFiles.filter(f => f.exists).length;
    console.log(`扫描完成，找到 ${existingCount}/${scannedFiles.length} 个壁纸文件`);
  };

  useEffect(() => {
    scanWallpaperFiles();
  }, []);

  const showPreview = (file: WallpaperFile) => {
    if (!file.exists) return;
    setPreviewImage(file.url);
  };

  const existingFiles = wallpaperFiles.filter(f => f.exists);
  const missingFiles = wallpaperFiles.filter(f => !f.exists);

  // 按类别分组
  const groupByCategory = (files: WallpaperFile[]) => {
    return files.reduce((groups, file) => {
      const category = file.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(file);
      return groups;
    }, {} as Record<string, WallpaperFile[]>);
  };

  const existingByCategory = groupByCategory(existingFiles);
  const missingByCategory = groupByCategory(missingFiles);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              壁纸文件管理
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={scanWallpaperFiles}
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
              <p>扫描壁纸文件中...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    {existingFiles.length}
                  </div>
                  <div className="text-sm text-green-700">可用壁纸</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-2">
                    <XCircle className="w-6 h-6" />
                    {missingFiles.length}
                  </div>
                  <div className="text-sm text-red-700">缺失壁纸</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{wallpaperFiles.length}</div>
                  <div className="text-sm text-blue-700">总计壁纸</div>
                </div>
              </div>

              {/* 可用壁纸列表 */}
              {existingFiles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    可用壁纸文件 ({existingFiles.length})
                  </h3>
                  {Object.entries(existingByCategory).map(([category, files]) => (
                    <div key={category} className="mb-6">
                      <h4 className="text-md font-medium mb-3 text-green-600">{category} ({files.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {files.map((file) => (
                          <div key={file.id} className="p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-medium text-green-800">{file.title}</div>
                                <div className="text-sm text-green-600">{file.filename}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  可用
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => showPreview(file)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-200"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            {/* 缩略图预览 */}
                            <div 
                              className="w-full h-24 bg-cover bg-center rounded cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                              style={{
                                backgroundImage: `url(${file.url})`,
                                filter: 'brightness(0.8) contrast(1.1)'
                              }}
                              onClick={() => showPreview(file)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 缺失壁纸列表 */}
              {missingFiles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-700 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    缺失壁纸文件 ({missingFiles.length})
                  </h3>
                  {Object.entries(missingByCategory).map(([category, files]) => (
                    <div key={category} className="mb-4">
                      <h4 className="text-md font-medium mb-2 text-red-600">{category} ({files.length})</h4>
                      <div className="space-y-2">
                        {files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-3">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <div>
                                <div className="font-medium text-red-800">{file.title}</div>
                                <div className="text-sm text-red-600">{file.filename}</div>
                                <div className="text-xs text-red-500 font-mono">路径: {file.url}</div>
                              </div>
                            </div>
                            <Badge variant="destructive">
                              缺失
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 使用说明 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  壁纸系统状态
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• 用户可以在设置中启用/禁用动态壁纸</div>
                  <div>• 系统会每2-3分钟自动切换壁纸</div>
                  <div>• 壁纸会自动应用深色滤镜以确保内容可读性</div>
                  <div>• 支持响应式设计，适配不同屏幕尺寸</div>
                  <div>• 壁纸文件位置: <code className="bg-gray-200 px-1 rounded">public/wallpapers/</code></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 预览弹窗 */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-4xl max-h-4xl p-4">
            <img 
              src={previewImage} 
              alt="壁纸预览" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <Button 
              className="mt-4 w-full"
              onClick={() => setPreviewImage(null)}
            >
              关闭预览
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWallpaperManagement;
