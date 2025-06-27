
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface SinglePlayerMenuProps {
  onGameStart: (gameType: string, gameMode: any) => void;
  onBack: () => void;
}

const SinglePlayerMenu: React.FC<SinglePlayerMenuProps> = ({ onGameStart, onBack }) => {
  const singlePlayerModes = [
    {
      id: 'sprint40',
      title: '40行挑战赛',
      description: '以最快速度完成40行消除，T-Spin算4行，All Clear算10行',
      icon: '🏃',
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      id: 'ultra2min',
      title: '2分钟挑战赛',
      description: '2分钟内获得最高分，top500记录回放',
      icon: '⏱️',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'endless',
      title: '无尽模式',
      description: '放松练习，自然下落速度，可选自我博弈',
      icon: '♾️',
      color: 'bg-green-500 hover:bg-green-600'
    }
  ];

  const handleModeSelect = (mode: any) => {
    onGameStart('singleplayer', mode);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h2 className="text-3xl font-bold">单人游戏</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {singlePlayerModes.map((mode) => (
          <Card key={mode.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">{mode.icon}</div>
              <CardTitle>{mode.title}</CardTitle>
              <CardDescription className="text-sm">{mode.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className={`w-full text-white ${mode.color}`}
                onClick={() => handleModeSelect(mode)}
              >
                开始游戏
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">游戏模式说明：</h3>
        <ul className="text-sm space-y-1 text-gray-600">
          <li>• <strong>40行挑战</strong>：采用高级消行算法，特殊技巧可获得更多消行数</li>
          <li>• <strong>2分钟挑战</strong>：专注于在有限时间内获得最高分数</li>
          <li>• <strong>无尽模式</strong>：默认每秒下降一行，可开启自我博弈增加难度</li>
        </ul>
      </div>
    </div>
  );
};

export default SinglePlayerMenu;
