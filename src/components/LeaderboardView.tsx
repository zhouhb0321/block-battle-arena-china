import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Trophy, Clock, Target, Medal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ReplayPreparationDialog } from './ReplayPreparationDialog';

interface LeaderboardEntry {
  id: string;
  username: string;
  final_score: number;
  final_lines: number;
  duration_seconds: number;
  pps: number;
  apm: number;
  created_at: string;
  game_mode: string;
  is_personal_best: boolean;
  compressed_actions: any;
  initial_board: any;
  game_settings: any;
  seed: string;
  checksum: string;
}

const LeaderboardView: React.FC = () => {
  const [sprint40Leaderboard, setSprint40Leaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeAttack2Leaderboard, setTimeAttack2Leaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntryForPreparation, setSelectedEntryForPreparation] = useState<LeaderboardEntry | null>(null);
  const [isPreparationDialogOpen, setIsPreparationDialogOpen] = useState(false);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      // Load 40-line sprint leaderboard (fastest times)
      const { data: sprint40Data, error: sprint40Error } = await supabase
        .from('compressed_replays')
        .select('*')
        .eq('game_mode', 'sprint40')
        .eq('is_featured', true)
        .order('duration_seconds', { ascending: true })
        .limit(500);

      if (!sprint40Error && sprint40Data) {
        setSprint40Leaderboard(sprint40Data);
      }

      // Load 2-minute time attack leaderboard (highest scores)
      const { data: timeAttack2Data, error: timeAttack2Error } = await supabase
        .from('compressed_replays')
        .select('*')
        .in('game_mode', ['timeAttack2', 'ultra2min'])
        .eq('is_featured', true)
        .order('final_score', { ascending: false })
        .limit(500);

      if (!timeAttack2Error && timeAttack2Data) {
        setTimeAttack2Leaderboard(timeAttack2Data);
      }

    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReplay = (entry: LeaderboardEntry) => {
    setSelectedEntryForPreparation(entry);
    setIsPreparationDialogOpen(true);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
  };

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">#{rank}</span>;
  };

  const LeaderboardTable = ({ 
    data, 
    type 
  }: { 
    data: LeaderboardEntry[]; 
    type: 'sprint40' | 'timeAttack2' 
  }) => (
    <div className="space-y-2">
      {data.map((entry, index) => (
        <Card key={entry.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getRankIcon(index + 1)}
                  <span className="font-bold text-lg">#{index + 1}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{entry.username}</h3>
                    {entry.is_personal_best && (
                      <Badge className="bg-yellow-500 text-black">
                        <Trophy className="w-3 h-3 mr-1" />
                        PB
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {type === 'sprint40' ? (
                      <>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-green-500" />
                          <span className="font-bold">{formatTime(entry.duration_seconds)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span>得分: {formatScore(entry.final_score)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span className="font-bold">{formatScore(entry.final_score)} 分</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>行数: {entry.final_lines}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-1">
                      <span>PPS: {entry.pps.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>APM: {entry.apm.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(entry.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleViewReplay(entry)}
                className="ml-4"
                size="sm"
              >
                <Play className="w-4 h-4 mr-1" />
                观看回放
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载排行榜中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">全球排行榜</h2>
        <Button onClick={loadLeaderboards} variant="outline" size="sm">
          刷新
        </Button>
      </div>

      <Tabs defaultValue="sprint40" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sprint40">40行竞速 - Top 500</TabsTrigger>
          <TabsTrigger value="timeAttack2">2分钟竞速 - Top 500</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sprint40" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                40行竞速 - 用时最短的500名
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sprint40Leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">暂无排行榜数据</p>
                </div>
              ) : (
                <LeaderboardTable data={sprint40Leaderboard} type="sprint40" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeAttack2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                2分钟竞速 - 得分最高的500名
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeAttack2Leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">暂无排行榜数据</p>
                </div>
              ) : (
                <LeaderboardTable data={timeAttack2Leaderboard} type="timeAttack2" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedEntryForPreparation && (
        <ReplayPreparationDialog
          isOpen={isPreparationDialogOpen}
          onClose={() => {
            setIsPreparationDialogOpen(false);
            setSelectedEntryForPreparation(null);
          }}
          replayId={selectedEntryForPreparation.id}
          replayInfo={{
            username: selectedEntryForPreparation.username,
            gameMode: selectedEntryForPreparation.game_mode,
            finalScore: selectedEntryForPreparation.final_score,
            finalLines: selectedEntryForPreparation.final_lines,
            durationSeconds: selectedEntryForPreparation.duration_seconds,
            pps: selectedEntryForPreparation.pps,
            apm: selectedEntryForPreparation.apm,
            isPersonalBest: selectedEntryForPreparation.is_personal_best,
            createdAt: selectedEntryForPreparation.created_at
          }}
        />
      )}
    </div>
  );
};

export default LeaderboardView;