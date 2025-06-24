
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Users, Trophy, Play } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import GameSettings from '@/components/GameSettings';
import GameModeSelector from '@/components/GameModeSelector';
import TetrisGame from '@/components/TetrisGame';
import LanguageSelector from '@/components/LanguageSelector';
import ShareDialog from '@/components/ShareDialog';

type GameMode = {
  id: string;
  title: string;
  description: string;
  maxPlayers?: number;
  icon: string;
};

const Index = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [currentView, setCurrentView] = useState<'menu' | 'modeSelect' | 'game'>('menu');
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  const handleModeSelect = (mode: GameMode) => {
    if (!isAuthenticated && (mode.id === 'freeForAll' || mode.id === 'oneVsOne' || mode.id === 'customRoom')) {
      setShowAuthModal(true);
      return;
    }
    setSelectedMode(mode);
    setCurrentView('game');
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
    setSelectedMode(null);
  };

  if (currentView === 'game' && selectedMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <Button onClick={handleBackToMenu} variant="outline">
              返回菜单
            </Button>
            <Button onClick={() => setShowShareDialog(true)} variant="outline">
              分享游戏
            </Button>
          </div>
          <TetrisGame 
            mode={selectedMode.maxPlayers ? 'multi' : 'single'}
            gameType={selectedMode.id as any}
          />
        </div>
        
        <ShareDialog 
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
        />
      </div>
    );
  }

  if (currentView === 'modeSelect') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="p-4">
          <Button onClick={handleBackToMenu} variant="outline" className="mb-4">
            返回主菜单
          </Button>
          <GameModeSelector onModeSelect={handleModeSelect} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* 头部导航 */}
      <nav className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {t('game.title')}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <LanguageSelector />
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm">欢迎, {user?.username}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsModal(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                退出
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowAuthModal(true)}>
              {t('auth.login')} / {t('auth.register')}
            </Button>
          )}
        </div>
      </nav>

      {/* 主要内容区域 */}
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* 欢迎区域 */}
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold mb-4">
              方块竞技场
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              全球玩家实时对战的俄罗斯方块平台
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                className="text-lg px-8 py-4"
                onClick={() => setCurrentView('modeSelect')}
              >
                <Play className="w-5 h-5 mr-2" />
                开始游戏
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-4"
                onClick={() => setShowShareDialog(true)}
              >
                分享平台
              </Button>
            </div>
          </div>

          {/* 功能卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
              <CardHeader>
                <Users className="w-8 h-8 text-blue-400 mb-2" />
                <CardTitle className="text-white">多人对战</CardTitle>
                <CardDescription className="text-gray-300">
                  支持最多128人同时在线对战
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 实时对战系统</li>
                  <li>• 自定义房间</li>
                  <li>• 好友邀请</li>
                  <li>• 社交分享功能</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
              <CardHeader>
                <Trophy className="w-8 h-8 text-yellow-400 mb-2" />
                <CardTitle className="text-white">排行榜</CardTitle>
                <CardDescription className="text-gray-300">
                  全球玩家实时排名系统
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 全球排行榜</li>
                  <li>• 个人统计</li>
                  <li>• 成就系统</li>
                  <li>• 游戏回放</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
              <CardHeader>
                <Settings className="w-8 h-8 text-green-400 mb-2" />
                <CardTitle className="text-white">自定义设置</CardTitle>
                <CardDescription className="text-gray-300">
                  完全可定制的游戏体验
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 键位设置</li>
                  <li>• 游戏参数调整</li>
                  <li>• 个性化界面</li>
                  <li>• 多语言支持</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* 游戏特色 */}
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h3 className="text-2xl font-bold mb-6 text-center">游戏特色</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-400">🎮 经典玩法</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• 7-bag随机序列</li>
                  <li>• T-Spin、All-Spin支持</li>
                  <li>• 标准SRS旋转系统</li>
                  <li>• 完整的游戏回放系统</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2 text-purple-400">🌐 社交功能</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• 微信、QQ等平台分享</li>
                  <li>• 好友系统</li>
                  <li>• 社群创建</li>
                  <li>• 实时聊天</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2 text-green-400">⚙️ 高级设置</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• DAS/ARR/SDF调节</li>
                  <li>• 自定义键位</li>
                  <li>• Ghost piece预览</li>
                  <li>• 音效控制</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部 */}
      <footer className="border-t border-gray-700 p-6 text-center text-gray-400">
        <p>&copy; 2024 方块竞技场 - 为中国玩家量身定制的俄罗斯方块对战平台</p>
        <p className="text-sm mt-2">支持微信、QQ、钉钉、飞书等多平台分享</p>
      </footer>

      {/* 模态框 */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      <GameSettings 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />

      <ShareDialog 
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />
    </div>
  );
};

export default Index;
