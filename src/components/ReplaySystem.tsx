
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Play, Download, Share2, Clock, Trophy, Film, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ReplayPlayer from './ReplayPlayer';
import { toast } from 'sonner';

interface GameReplay {
  id: string;
  user_id: string;
  opponent_id?: string;
  game_mode: string;
  final_score: number;
  final_lines: number;
  final_level: number;
  pps: number;
  apm: number;
  duration: number;
  replay_data: any;
  is_personal_best: boolean;
  is_world_record: boolean;
  created_at: string;
  user_profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface ReplaySystemProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReplaySystem: React.FC<ReplaySystemProps> = ({ isOpen, onClose }) => {
  const [replays, setReplays] = useState<GameReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'personal' | 'world'>('personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReplay, setSelectedReplay] = useState<GameReplay | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const { user } = useAuth();

  // 加载回放数据
  const loadReplays = async () => {
    if (!user || user.isGuest) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('game_replays_new')
        .select(`
          *,
          user_profiles!user_id (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (filter === 'personal') {
        query = query.eq('user_id', user.id);
      } else if (filter === 'world') {
        query = query.eq('is_world_record', true);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Error loading replays:', error);
        toast.error('加载回放失败');
        return;
      }

      setReplays(data || []);
    } catch (error) {
      console.error('Error loading replays:', error);
      toast.error('加载回放失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadReplays();
    }
  }, [isOpen, filter, user]);

  const filteredReplays = replays.filter(replay => {
    if (!searchTerm) return true;
    const username = replay.user_profiles?.username || 'Unknown';
    return username.toLowerCase().includes(searchTerm.toLowerCase()) ||
           replay.game_mode.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameModeDisplay = (mode: string) => {
    const modes: { [key: string]: string } = {
      'sprint_40': '40行竞速',
      'ultra_2min': '2分钟极限',
      'endless': '无限模式',
      'ranked': '排位赛'
    };
    return modes[mode] || mode;
  };

  const playReplay = (replay: GameReplay) => {
    setSelectedReplay(replay);
    setPlayerOpen(true);
  };

  const shareReplay = async (replay: GameReplay) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${replay.user_profiles?.username || 'Player'} 的游戏回放`,
          text: `${getGameModeDisplay(replay.game_mode)} - 得分: ${replay.final_score.toLocaleString()}`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(window.location.href);
      toast.success('链接已复制到剪贴板');
    }
  };

  if (!user || user.isGuest) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5" />
              游戏回放
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Film className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">需要注册账户</h3>
            <p className="text-muted-foreground mb-4">
              回放功能仅对注册用户开放
            </p>
            <Button onClick={onClose}>
              去注册
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5" />
              游戏回放
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* 筛选和搜索 */}
            <div className="flex gap-4 mb-4">
              <div className="flex gap-2">
                <Button
                  variant={filter === 'personal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('personal')}
                >
                  我的回放
                </Button>
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  全部回放
                </Button>
                <Button
                  variant={filter === 'world' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('world')}
                >
                  世界纪录
                </Button>
              </div>
              
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索玩家名或游戏模式..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 回放列表 */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">加载中...</p>
                </div>
              ) : filteredReplays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <div className="text-lg">暂无回放记录</div>
                  <div className="text-sm">完成游戏后将自动保存回放</div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredReplays.map((replay) => (
                    <Card key={replay.id} className="hover:bg-muted/50 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {replay.user_profiles?.username || 'Unknown Player'}
                            {replay.is_personal_best && (
                              <Badge variant="secondary" className="text-xs">
                                <Trophy className="w-3 h-3 mr-1" />
                                PB
                              </Badge>
                            )}
                            {replay.is_world_record && (
                              <Badge className="bg-yellow-500 text-xs">
                                <Trophy className="w-3 h-3 mr-1" />
                                世界纪录
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => playReplay(replay)}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => shareReplay(replay)}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          {getGameModeDisplay(replay.game_mode)} • {formatDate(replay.created_at)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-5 gap-2 text-xs">
                          <div>
                            <div className="text-muted-foreground">得分</div>
                            <div className="font-mono">{replay.final_score.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">行数</div>
                            <div className="font-mono">{replay.final_lines}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">等级</div>
                            <div className="font-mono">{replay.final_level}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">PPS</div>
                            <div className="font-mono">{replay.pps.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">时长</div>
                            <div className="font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(replay.duration)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 回放播放器 */}
      {selectedReplay && (
        <ReplayPlayer
          isOpen={playerOpen}
          onClose={() => setPlayerOpen(false)}
          replayData={selectedReplay.replay_data}
          gameInfo={{
            playerName: selectedReplay.user_profiles?.username || 'Unknown Player',
            gameMode: getGameModeDisplay(selectedReplay.game_mode),
            score: selectedReplay.final_score,
            lines: selectedReplay.final_lines,
            duration: selectedReplay.duration,
            pps: selectedReplay.pps,
            apm: selectedReplay.apm
          }}
        />
      )}
    </>
  );
};

export default ReplaySystem;
