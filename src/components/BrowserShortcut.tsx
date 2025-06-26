
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Chrome, Firefox, Safari, Download, Monitor, Info } from 'lucide-react';

const BrowserShortcut: React.FC = () => {
  const [shortcutName, setShortcutName] = useState('俄罗斯方块竞技');
  const [installStatus, setInstallStatus] = useState<{[key: string]: boolean}>({});

  const getBrowserType = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    return 'unknown';
  };

  const currentBrowser = getBrowserType();

  const createDesktopShortcut = () => {
    const shortcutContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=${shortcutName}
Comment=俄罗斯方块竞技游戏
Exec=xdg-open "${window.location.origin}"
Icon=game-tetris
Terminal=false
Categories=Game;
`;

    const blob = new Blob([shortcutContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${shortcutName}.desktop`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setInstallStatus(prev => ({ ...prev, desktop: true }));
  };

  const createWindowsShortcut = () => {
    const shortcutContent = `[InternetShortcut]
URL=${window.location.origin}
IconFile=${window.location.origin}/favicon.ico
IconIndex=0
`;

    const blob = new Blob([shortcutContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${shortcutName}.url`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setInstallStatus(prev => ({ ...prev, windows: true }));
  };

  const createChromeExtension = async () => {
    const manifest = {
      manifest_version: 3,
      name: shortcutName,
      version: "1.0",
      description: "俄罗斯方块竞技游戏快速启动器",
      action: {
        default_popup: "popup.html",
        default_title: shortcutName
      },
      permissions: ["activeTab"],
      icons: {
        16: "icon16.png",
        48: "icon48.png",
        128: "icon128.png"
      }
    };

    const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 10px; }
    .launch-btn { 
      width: 100%; 
      padding: 15px; 
      background: linear-gradient(45deg, #3b82f6, #8b5cf6);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }
    .launch-btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <h3>${shortcutName}</h3>
  <button class="launch-btn" onclick="openGame()">开始游戏</button>
  <script>
    function openGame() {
      chrome.tabs.create({ url: '${window.location.origin}' });
    }
  </script>
</body>
</html>`;

    // Create downloadable extension files
    const files = [
      { name: 'manifest.json', content: JSON.stringify(manifest, null, 2) },
      { name: 'popup.html', content: popupHtml }
    ];

    // For demo purposes, create a zip-like structure info
    const extensionInfo = {
      files: files,
      instructions: [
        '1. 创建一个新文件夹',
        '2. 将manifest.json和popup.html保存到文件夹中',
        '3. 打开Chrome扩展管理页面 (chrome://extensions/)',
        '4. 启用开发者模式',
        '5. 点击"加载已解压的扩展程序"',
        '6. 选择创建的文件夹'
      ]
    };

    // Download manifest file
    const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    const manifestLink = document.createElement('a');
    manifestLink.href = manifestUrl;
    manifestLink.download = 'manifest.json';
    manifestLink.click();

    // Download popup HTML
    const popupBlob = new Blob([popupHtml], { type: 'text/html' });
    const popupUrl = URL.createObjectURL(popupBlob);
    const popupLink = document.createElement('a');
    popupLink.href = popupUrl;
    popupLink.download = 'popup.html';
    popupLink.click();

    URL.revokeObjectURL(manifestUrl);
    URL.revokeObjectURL(popupUrl);
    
    setInstallStatus(prev => ({ ...prev, chrome: true }));
    alert('扩展文件已下载，请按照说明安装Chrome扩展程序');
  };

  const installPWA = async () => {
    if ('serviceWorker' in navigator) {
      try {
        // Register service worker for PWA
        await navigator.serviceWorker.register('/sw.js');
        
        // Create PWA manifest
        const manifest = {
          name: shortcutName,
          short_name: shortcutName,
          description: "俄罗斯方块竞技游戏",
          start_url: "/",
          display: "standalone",
          background_color: "#1f2937",
          theme_color: "#3b82f6",
          icons: [
            {
              src: "/favicon.ico",
              sizes: "64x64 32x32 24x24 16x16",
              type: "image/x-icon"
            }
          ]
        };

        // Create and inject manifest
        const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        
        let manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
          manifestLink = document.createElement('link');
          manifestLink.setAttribute('rel', 'manifest');
          document.head.appendChild(manifestLink);
        }
        manifestLink.setAttribute('href', manifestUrl);
        
        setInstallStatus(prev => ({ ...prev, pwa: true }));
        alert('PWA配置完成！您现在可以通过浏览器菜单"安装应用"来添加到桌面。');
      } catch (error) {
        console.error('PWA安装失败:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            浏览器快捷方式和插件
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="shortcut-name">快捷方式名称</Label>
            <Input
              id="shortcut-name"
              value={shortcutName}
              onChange={(e) => setShortcutName(e.target.value)}
              placeholder="自定义快捷方式名称"
            />
          </div>

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              检测到您正在使用: <Badge variant="outline">{currentBrowser}</Badge>
              {currentBrowser === 'chrome' && ' - 推荐安装Chrome扩展或PWA应用'}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chrome扩展 */}
            <Card className="border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Chrome className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold">Chrome扩展</h3>
                  {installStatus.chrome && <Badge className="bg-green-100 text-green-800">已创建</Badge>}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  创建Chrome浏览器扩展，快速启动游戏
                </p>
                <Button 
                  onClick={createChromeExtension}
                  className="w-full"
                  variant={currentBrowser === 'chrome' ? 'default' : 'outline'}
                >
                  下载扩展文件
                </Button>
              </CardContent>
            </Card>

            {/* PWA应用 */}
            <Card className="border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Monitor className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold">PWA应用</h3>
                  {installStatus.pwa && <Badge className="bg-green-100 text-green-800">已配置</Badge>}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  安装为原生应用，支持离线使用
                </p>
                <Button 
                  onClick={installPWA}
                  className="w-full"
                  variant="default"
                >
                  安装PWA应用
                </Button>
              </CardContent>
            </Card>

            {/* 桌面快捷方式 (Linux) */}
            <Card className="border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Monitor className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold">Linux桌面快捷方式</h3>
                  {installStatus.desktop && <Badge className="bg-green-100 text-green-800">已创建</Badge>}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  创建Linux桌面快捷方式文件
                </p>
                <Button 
                  onClick={createDesktopShortcut}
                  className="w-full"
                  variant="outline"
                >
                  下载.desktop文件
                </Button>
              </CardContent>
            </Card>

            {/* Windows快捷方式 */}
            <Card className="border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Monitor className="w-6 h-6 text-orange-600" />
                  <h3 className="font-semibold">Windows快捷方式</h3>
                  {installStatus.windows && <Badge className="bg-green-100 text-green-800">已创建</Badge>}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  创建Windows桌面快捷方式
                </p>
                <Button 
                  onClick={createWindowsShortcut}
                  className="w-full"
                  variant="outline"
                >
                  下载.url文件
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">浏览器支持说明</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Chrome className="w-4 h-4" />
                  <span className="font-medium">Chrome</span>
                </div>
                <ul className="text-blue-700 text-xs space-y-1">
                  <li>• 扩展程序</li>
                  <li>• PWA应用</li>
                  <li>• 桌面快捷方式</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Firefox className="w-4 h-4" />
                  <span className="font-medium">Firefox</span>
                </div>
                <ul className="text-blue-700 text-xs space-y-1">
                  <li>• PWA应用</li>
                  <li>• 桌面快捷方式</li>
                  <li>• 书签工具栏</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrowserShortcut;
