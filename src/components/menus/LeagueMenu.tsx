
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, History, Award } from 'lucide-react';

interface LeagueMenuProps {
  onBack: () => void;
}

const LeagueMenu: React.FC<LeagueMenuProps> = ({ onBack }) => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h2 className="text-3xl font-bold">联盟成就</h2>
      </div>

      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            排行榜
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            记录
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            成就
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  全球排行榜
                </CardTitle>
                <CardDescription>查看全球顶尖玩家的最佳成绩</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    40行挑战赛排行榜
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    2分钟挑战赛排行榜
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    快速游戏排行榜
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-500" />
                  国家排行榜
                </CardTitle>
                <CardDescription>查看您所在国家的顶尖玩家</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    国家40行排行榜
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    国家2分钟排行榜
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    国家对战排行榜
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>个人记录</CardTitle>
                <CardDescription>查看您的游戏记录和回放</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    我的最近游戏
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    我的最佳成绩
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    回放管理
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>优秀记录</CardTitle>
                <CardDescription>观看顶尖玩家的精彩操作</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    全球Top100回放
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    国家Top100回放
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    精选回放集
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>成就徽章</CardTitle>
              <CardDescription>游戏过程中获得的成就徽章</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">🥇</div>
                  <div className="text-sm font-medium">首次胜利</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="text-sm font-medium">速度达人</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-sm font-medium">精准消行</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">🔥</div>
                  <div className="text-sm font-medium">连胜王者</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeagueMenu;
