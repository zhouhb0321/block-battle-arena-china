
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import BattleRoomManager from '@/components/BattleRoomManager';
import { useBattleWebSocket } from '@/hooks/useBattleWebSocket';

interface MultiPlayerMenuProps {
  onGameStart: (gameType: string, gameMode: any) => void;
  onBack: () => void;
}

const MultiPlayerMenu: React.FC<MultiPlayerMenuProps> = ({ onGameStart, onBack }) => {
  const [view, setView] = useState<'modes' | 'rooms' | 'battle'>('modes');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const { connect, isConnected, lastMessage } = useBattleWebSocket();

  const multiPlayerModes = [
    {
      id: 'quickGame',
      title: '快速游戏',
      description: '公共房间，随机加入，像攀登塔一样挑战',
      icon: '⚡',
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => setView('rooms')
    },
    {
      id: 'league',
      title: '方块联盟',
      description: '1v1 随机配对，5局3胜制，获得联盟分',
      icon: '🏅',
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => setView('rooms')
    },
    {
      id: 'customRoom',
      title: '自定义房间',
      description: '创建公共或私人房间，自定义规则',
      icon: '🏠',
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => setView('rooms')
    }
  ];

  const handleJoinRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    connect(roomId);
    setView('battle');
  };

  const handleBackToModes = () => {
    setView('modes');
    setCurrentRoomId(null);
  };

  const renderView = () => {
    switch (view) {
      case 'rooms':
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button variant="ghost" onClick={handleBackToModes} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <h3 className="text-2xl font-bold">选择或创建房间</h3>
            </div>
            <BattleRoomManager onJoinRoom={handleJoinRoom} />
          </div>
        );

      case 'battle':
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button variant="ghost" onClick={handleBackToModes} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                离开房间
              </Button>
              <h3 className="text-2xl font-bold">对战房间</h3>
              <div className="ml-4">
                {isConnected ? (
                  <span className="text-green-600 text-sm">● 已连接</span>
                ) : (
                  <span className="text-red-600 text-sm">● 连接中...</span>
                )}
              </div>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-lg mb-4">等待其他玩家加入...</p>
                  <p className="text-sm text-gray-600">房间ID: {currentRoomId}</p>
                  {lastMessage && (
                    <div className="mt-4 p-3 bg-gray-100 rounded">
                      <pre className="text-xs">{JSON.stringify(lastMessage, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {multiPlayerModes.map((mode) => (
              <Card key={mode.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">{mode.icon}</div>
                  <CardTitle>{mode.title}</CardTitle>
                  <CardDescription className="text-sm">{mode.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className={`w-full text-white ${mode.color}`}
                    onClick={mode.action}
                  >
                    进入游戏
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {view === 'modes' && (
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h2 className="text-3xl font-bold">多人游戏</h2>
        </div>
      )}

      {renderView()}

      {view === 'modes' && (
        <div className="mt-8 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">游戏模式说明：</h3>
          <ul className="text-sm space-y-1 text-gray-600">
            <li>• <strong>快速游戏</strong>：随时加入随时退出，挑战更高等级的玩家</li>
            <li>• <strong>方块联盟</strong>：正式比赛，5局3胜制，影响联盟分数</li>
            <li>• <strong>自定义房间</strong>：支持练习模式（可撤销操作）和对战模式</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default MultiPlayerMenu;
