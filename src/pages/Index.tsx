
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthModal from "@/components/AuthModal";
import GameModeSelector from "@/components/GameModeSelector";
import FixedTetrisGame from "@/components/FixedTetrisGame";
import RankingSystem from "@/components/RankingSystem";
import ReplaySystem from "@/components/ReplaySystem";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentView, setCurrentView] = useState<'menu' | 'game' | 'ranking' | 'replay'>('menu');
  const [selectedMode, setSelectedMode] = useState<any>(null);

  const handleModeSelect = (mode: any) => {
    setSelectedMode(mode);
    setCurrentView('game');
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
    setSelectedMode(null);
  };

  // 示例回放数据
  const mockReplays = [
    {
      id: '1',
      playerName: 'TestPlayer',
      gameMode: '40行竞速',
      score: 15420,
      lines: 40,
      level: 5,
      duration: 125,
      date: new Date().toISOString(),
      moves: [],
      isPersonalBest: true
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-8">{t('game.title')}</h1>
          <p className="text-xl text-gray-300 mb-8">现代化俄罗斯方块游戏</p>
          <Button 
            onClick={() => setShowAuthModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
          >
            开始游戏
          </Button>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  if (currentView === 'game') {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="p-4">
          <Button 
            onClick={handleBackToMenu}
            className="mb-4 bg-gray-600 hover:bg-gray-700"
          >
            返回主菜单
          </Button>
        </div>
        <FixedTetrisGame />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">{t('game.title')}</h1>
          <div className="flex items-center gap-4">
            <span className="text-white">欢迎, {user.username}</span>
            <Button onClick={logout} variant="outline">
              退出登录
            </Button>
          </div>
        </div>

        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="menu">游戏模式</TabsTrigger>
            <TabsTrigger value="ranking">排行榜</TabsTrigger>
            <TabsTrigger value="replay">回放</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            <GameModeSelector onModeSelect={handleModeSelect} />
          </TabsContent>

          <TabsContent value="ranking">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RankingSystem playerPoints={user.rating} />
              <div className="bg-white p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">全球排行榜</h3>
                <div className="text-center text-gray-500">
                  排行榜功能正在开发中...
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="replay">
            <div className="bg-white p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">游戏回放</h3>
              <ReplaySystem 
                replays={mockReplays}
                onPlayReplay={(replay) => {
                  console.log('Playing replay:', replay);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="bg-white p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">游戏设置</h3>
              <div className="text-center text-gray-500">
                设置功能正在开发中...
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
