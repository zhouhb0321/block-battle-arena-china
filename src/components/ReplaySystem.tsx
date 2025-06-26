import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Trophy, Clock, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ReplayPlayer from './ReplayPlayer';
import type { GameReplay, ReplayAction } from '@/utils/gameTypes';

const ReplaySystem: React.FC = () => {
  const { user } = useAuth();
  const [replays, setReplays] = useState<GameReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReplay, setSelectedReplay] = useState<GameReplay | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  useEffect(() => {
    loadReplays();
  }, [user]);

  const loadReplays = async () => {
    if (!user || user.isGuest) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('game_replays_new')
        .select(`
          *,
          user_profiles!game_replays_new_user_id_fkey(username, avatar_url)
        `)
        .or(`user_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading replays:', error);
        return;
      }

      if (data) {
        const formattedReplays: GameReplay[] = data.map(replay => {
          const replayData = replay.replay_data as any;
          const actions: ReplayAction[] = replayData?.actions || [];
          const userProfile = replay.user_profiles as any;
          
          return {
            id: replay.id,
            matchId: replay.id,
            userId: replay.user_id,
            gameType: replay.game_mode,
            gameMode: replay.game_mode,
            score: replay.final_score,
            lines: replay.final_lines,
            level: replay.final_level,
            pps: parseFloat(replay.pps.toString()),
            apm: parseFloat(replay.apm.toString()),
            duration: replay.duration,
            actions: actions,
            finalBoard: Array(20).fill(null).map(() => Array(10).fill(0)),
            date: replay.created_at,
            playerName: userProfile?.username || 'Unknown Player',
            isPersonalBest: replay.is_personal_best || false
          };
        });

        setReplays(formattedReplays);
      }
    } catch (error) {
      console.error('Error loading replays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayReplay = (replay: GameReplay) => {
    setSelectedReplay(replay);
    setIsPlayerOpen(true);
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getGameModeLabel = (mode: string) => {
    const modes: { [key: string]: string } = {
      'sprint_40': '40行竞速',
      'ultra_2min': '2分钟极限',
      'endless': '无尽模式',
      'multiplayer': '多人对战'
    };
    return modes[mode] || mode;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载回放中...</p>
        </div>
      </div>
    );
  }

  if (!user || user.isGuest) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-semibold mb-4">回放系统</h3>
        <p className="text-gray-600 mb-4">回放功能仅对注册用户开放</p>
        <p className="text-sm text-gray-500">请先登录或注册账户来使用回放功能</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">游戏回放</h2>
        <Button onClick={loadReplays} variant="outline" size="sm">
          刷新
        </Button>
      </div>

      {replays.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无回放记录</h3>
            <p className="text-gray-600">完成游戏后，您的回放记录将显示在这里</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {replays.map((replay) => (
            <Card key={replay.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{replay.playerName}</h3>
                      <Badge variant="secondary">
                        {getGameModeLabel(replay.gameType)}
                      </Badge>
                      {replay.isPersonalBest && (
                        <Badge className="bg-yellow-500 text-black">
                          <Trophy className="w-3 h-3 mr-1" />
                          PB
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span>得分: {replay.score.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>行数: {replay.lines}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-green-500" />
                        <span>时长: {formatDuration(replay.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>PPS: {replay.pps.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(replay.date).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <Button
                    onClick={() => handlePlayReplay(replay)}
                    className="ml-4"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    播放
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ReplayPlayer
        replay={selectedReplay}
        isOpen={isPlayerOpen}
        onClose={() => {
          setIsPlayerOpen(false);
          setSelectedReplay(null);
        }}
      />
    </div>
  );
};

export default ReplaySystem;
