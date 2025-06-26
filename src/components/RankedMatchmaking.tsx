
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import RankingSystem, { getRankByPoints } from '@/components/RankingSystem';
import { Trophy, Users, Clock, Target } from 'lucide-react';

interface RankedMatchmakingProps {
  onStartMatch: () => void;
}

const RankedMatchmaking: React.FC<RankedMatchmakingProps> = ({ onStartMatch }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [playerRating] = useState(1250); // Mock player rating

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const handleStartSearch = () => {
    setIsSearching(true);
    setSearchTime(0);
    
    // Simulate finding a match after 3-8 seconds
    const matchTime = Math.random() * 5000 + 3000;
    setTimeout(() => {
      setIsSearching(false);
      setSearchTime(0);
      onStartMatch();
    }, matchTime);
  };

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchTime(0);
  };

  const currentRank = getRankByPoints(playerRating);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">{t('game.ranked')}</h1>
          <p className="text-xl text-gray-300">与相近水平的玩家进行排位对战</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Rank Info */}
          <div className="lg:col-span-1">
            <RankingSystem playerPoints={playerRating} className="mb-6" />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  本赛季统计
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">游戏场次</span>
                  <span className="font-semibold">127</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">胜率</span>
                  <span className="font-semibold text-green-600">68%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">平均PPS</span>
                  <span className="font-semibold">2.3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">平均APM</span>
                  <span className="font-semibold">89.5</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Matchmaking */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  排位匹配
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isSearching ? (
                  <div className="text-center py-8">
                    <div className="mb-6">
                      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Trophy className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">准备开始排位赛</h3>
                      <p className="text-gray-600 mb-4">
                        系统将为您匹配相近段位的对手
                      </p>
                      <div className="flex items-center justify-center gap-2 mb-6">
                        <Badge className={`${currentRank.color} text-white`}>
                          {currentRank.tier}
                        </Badge>
                        <span className="text-gray-600">±2 段位范围</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleStartSearch}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg"
                      disabled={!user || user.isGuest}
                    >
                      开始匹配
                    </Button>
                    
                    {(!user || user.isGuest) && (
                      <p className="text-sm text-gray-500 mt-2">
                        需要登录账户才能进行排位赛
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                      <Clock className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">正在寻找对手...</h3>
                    <p className="text-gray-600 mb-4">
                      预估等待时间: 30-60秒
                    </p>
                    <div className="mb-4">
                      <div className="text-2xl font-mono font-bold text-blue-600">
                        {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <Progress value={(searchTime / 60) * 100} className="mb-4" />
                    <Button 
                      onClick={handleCancelSearch}
                      variant="outline"
                    >
                      取消匹配
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Matches */}
            <Card>
              <CardHeader>
                <CardTitle>最近对战</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { opponent: 'Player123', result: 'win', rating: '+15', time: '2小时前' },
                    { opponent: 'TetrisKing', result: 'loss', rating: '-12', time: '5小时前' },
                    { opponent: 'BlockMaster', result: 'win', rating: '+18', time: '1天前' },
                  ].map((match, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={match.result === 'win' ? 'default' : 'destructive'}>
                          {match.result === 'win' ? '胜' : '负'}
                        </Badge>
                        <span className="font-medium">{match.opponent}</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${match.result === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                          {match.rating}
                        </div>
                        <div className="text-sm text-gray-500">{match.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankedMatchmaking;
