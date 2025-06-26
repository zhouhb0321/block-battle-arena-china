
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Users, Settings, Trophy, Gamepad2, Book } from 'lucide-react';
import TetrisGame from '@/components/TetrisGame';
import FixedTetrisGame from '@/components/FixedTetrisGame';
import GameSettingsDialog from '@/components/GameSettingsDialog';
import KeyboardSettings from '@/components/KeyboardSettings';
import ReplaySystem from '@/components/ReplaySystem';
import AuthModal from '@/components/AuthModal';

const Index = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'menu' | 'single' | 'multi' | 'settings' | 'replays'>('menu');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleStartSingle = () => {
    setCurrentView('single');
  };

  const handleStartMulti = () => {
    if (!user || user.isGuest) {
      setAuthModalOpen(true);
      return;
    }
    setCurrentView('multi');
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  if (currentView === 'single') {
    return <FixedTetrisGame />;
  }

  if (currentView === 'multi') {
    return <TetrisGame mode="multi" />;
  }

  if (currentView === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={handleBackToMenu} variant="outline">
              ← 返回主菜单
            </Button>
            <h1 className="text-3xl font-bold text-white">游戏设置</h1>
          </div>
          
          <Tabs defaultValue="keyboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="keyboard">键盘设置</TabsTrigger>
              <TabsTrigger value="game">游戏设置</TabsTrigger>
            </TabsList>
            
            <TabsContent value="keyboard" className="mt-6">
              <KeyboardSettings />
            </TabsContent>
            
            <TabsContent value="game" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <GameSettingsDialog trigger={
                    <Button className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      打开游戏设置
                    </Button>
                  } />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  if (currentView === 'replays') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={handleBackToMenu} variant="outline">
              ← 返回主菜单
            </Button>
            <h1 className="text-3xl font-bold text-white">游戏回放</h1>
          </div>
          <ReplaySystem />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            方块竞技场
          </h1>
          <p className="text-xl text-gray-300">体验最纯粹的俄罗斯方块竞技</p>
        </div>

        {/* 用户信息 */}
        <div className="text-center mb-8">
          {user && !user.isGuest ? (
            <p className="text-white">
              欢迎回来，<span className="font-semibold text-blue-400">{user.username}</span>！
            </p>
          ) : (
            <p className="text-gray-300">
              游客模式 | 
              <Button 
                variant="link" 
                className="text-blue-400 p-0 ml-2"
                onClick={() => setAuthModalOpen(true)}
              >
                登录/注册
              </Button>
            </p>
          )}
        </div>

        {/* 主菜单 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 单人模式 */}
          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 group cursor-pointer">
            <CardContent className="p-8 text-center" onClick={handleStartSingle}>
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">单人模式</h3>
              <p className="text-gray-300 mb-4">挑战自己的极限，刷新个人记录</p>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                开始游戏
              </Button>
            </CardContent>
          </Card>

          {/* 多人对战 */}
          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 group cursor-pointer">
            <CardContent className="p-8 text-center" onClick={handleStartMulti}>
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">多人对战</h3>
              <p className="text-gray-300 mb-4">与全球玩家实时对战</p>
              <Button className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
                {user && !user.isGuest ? '开始匹配' : '需要登录'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 次要功能 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 游戏设置 */}
          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer">
            <CardContent className="p-6 text-center" onClick={() => setCurrentView('settings')}>
              <Settings className="w-8 h-8 mx-auto mb-3 text-gray-400" />
              <h4 className="font-semibold text-white mb-2">游戏设置</h4>
              <p className="text-sm text-gray-400">自定义按键和游戏参数</p>
            </CardContent>
          </Card>

          {/* 回放系统 */}
          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer">
            <CardContent className="p-6 text-center" onClick={() => setCurrentView('replays')}>
              <Trophy className="w-8 h-8 mx-auto mb-3 text-gray-400" />
              <h4 className="font-semibold text-white mb-2">回放系统</h4>
              <p className="text-sm text-gray-400">观看和分析游戏录像</p>
            </CardContent>
          </Card>

          {/* 教程 */}
          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer">
            <CardContent className="p-6 text-center">
              <Book className="w-8 h-8 mx-auto mb-3 text-gray-400" />
              <h4 className="font-semibold text-white mb-2">游戏教程</h4>
              <p className="text-sm text-gray-400">学习高级技巧和策略</p>
            </CardContent>
          </Card>
        </div>

        {/* 版权信息 */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>© 2024 方块竞技场 | 基于现代俄罗斯方块规则</p>
        </div>
      </div>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </div>
  );
};

export default Index;
