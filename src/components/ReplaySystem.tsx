
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Play, Trophy, Clock, Target } from 'lucide-react';
import { ReplayImporter } from './ReplayImporter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ReplayPreparationDialog } from './ReplayPreparationDialog';
import type { GameReplay } from '@/utils/gameTypes';

const ReplaySystem: React.FC = () => {
  const { user } = useAuth();
  const [replays, setReplays] = useState<GameReplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReplayForPreparation, setSelectedReplayForPreparation] = useState<GameReplay | null>(null);
  const [isPreparationDialogOpen, setIsPreparationDialogOpen] = useState(false);
  const [showOldReplays, setShowOldReplays] = useState(false);

  useEffect(() => {
    loadReplays();
  }, [user]);

  const loadReplays = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load only metadata from compressed_replays (no compressed_actions)
      const { data: compressedReplays, error: compressedError } = await supabase
        .from('compressed_replays')
        .select(`
          id, user_id, username, game_mode, duration_seconds, 
          final_score, final_lines, pps, apm, is_personal_best, 
          created_at, version, actions_count, seed, 
          initial_board, game_settings
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const processedReplays: GameReplay[] = [];

      if (compressedReplays && !compressedError) {
        console.info('ReplaySystem: Loading compressed replays metadata count:', compressedReplays.length);
        
        for (const replay of compressedReplays) {
          // Check playability based on metadata only
          const { isReplayPlayable } = await import('@/utils/replayLoader');
          const isPlayable = isReplayPlayable(replay);

          processedReplays.push({
            id: replay.id,
            userId: replay.user_id,
            gameMode: replay.game_mode,
            score: replay.final_score,
            lines: replay.final_lines,
            duration: replay.duration_seconds * 1000,
            startTime: 0,
            endTime: replay.duration_seconds * 1000,
            pps: replay.pps || 0,
            apm: replay.apm || 0,
            isPersonalBest: replay.is_personal_best,
            date: replay.created_at,
            actions: [],
            isPlayable,
            playerName: replay.username || 'Unknown',
            metadata: {
              version: replay.version || '2.0',
              settings: replay.game_settings || {
                das: 167, arr: 33, sdf: 41,
                controls: {
                  moveLeft: 'ArrowLeft', moveRight: 'ArrowRight', softDrop: 'ArrowDown',
                  hardDrop: 'Space', rotateClockwise: 'ArrowUp', rotateCounterclockwise: 'KeyZ',
                  rotate180: 'KeyA', hold: 'KeyC', pause: 'Escape', backToMenu: 'KeyQ'
                },
                enableGhost: true, enableSound: true, masterVolume: 0.7, backgroundMusic: '',
                musicVolume: 0.5, ghostOpacity: 0.5, enableWallpaper: true, undoSteps: 10,
                wallpaperChangeInterval: 30000
              },
              seed: replay.seed,
              initialBoard: replay.initial_board
            }
          });
        }
      }
      // If no compressed replays, try fallback tables
      if (!compressedReplays || compressedReplays.length === 0) {
        console.info('ReplaySystem: No compressed replays found, trying fallback tables');
        
        // Try new format replay table
        const { data: newReplays, error: newError } = await supabase
          .from('game_replays_new')
          .select(`
            id, user_id, game_mode, final_score, final_lines, 
            pps, apm, duration, is_personal_best, created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (newReplays && newReplays.length > 0) {
          for (const replay of newReplays) {
            processedReplays.push({
              id: replay.id,
              userId: replay.user_id,
              gameMode: replay.game_mode,
              score: replay.final_score,
              lines: replay.final_lines,
              duration: replay.duration,
              startTime: 0,
              endTime: replay.duration,
              pps: replay.pps || 0,
              apm: replay.apm || 0,
              isPersonalBest: replay.is_personal_best,
              date: replay.created_at,
              actions: [],
              isPlayable: false,
              playerName: 'Unknown',
              metadata: {
                version: '1.0',
                settings: {
                  das: 167, arr: 33, sdf: 41,
                  controls: {
                    moveLeft: 'ArrowLeft', moveRight: 'ArrowRight', softDrop: 'ArrowDown',
                    hardDrop: 'Space', rotateClockwise: 'ArrowUp', rotateCounterclockwise: 'KeyZ',
                    rotate180: 'KeyA', hold: 'KeyC', pause: 'Escape', backToMenu: 'KeyQ'
                  },
                  enableGhost: true, enableSound: true, masterVolume: 0.7, backgroundMusic: '',
                  musicVolume: 0.5, ghostOpacity: 0.5, enableWallpaper: true, undoSteps: 10,
                  wallpaperChangeInterval: 30000
                },
                initialBoard: []
              }
            });
          }
        }
      }

      setReplays(processedReplays);
    } catch (error) {
      console.error('Error loading replays:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleViewReplay = (replay: GameReplay) => {
    setSelectedReplayForPreparation(replay);
    setIsPreparationDialogOpen(true);
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getGameModeLabel = (mode: string) => {
    const modes: { [key: string]: string } = {
      'sprint40': '40行竞速',
      'sprint_40': '40行竞速',
      'timeAttack2': '2分钟竞速',
      'ultra2min': '2分钟竞速',
      'ultra_2min': '2分钟极限',
      'endless': '无尽模式',
      'multiplayer': '多人对战',
      '1v1': '1v1对战',
      'ranked': '排位赛'
    };
    return modes[mode] || mode;
  };

  if (isLoading) {
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
        <div className="flex items-center gap-4">
          <ReplayImporter />
          <div className="flex items-center gap-2">
            <Switch
              checked={showOldReplays}
              onCheckedChange={(checked) => {
                setShowOldReplays(checked);
                loadReplays(); // 重新加载以应用过滤
              }}
            />
            <span className="text-sm">显示旧回放</span>
          </div>
          <Button onClick={loadReplays} variant="outline" size="sm">
            刷新
          </Button>
        </div>
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
                    {!replay.isPlayable && (
                      <Badge variant="destructive" className="text-xs">
                        数据不完整（旧格式）
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
                    onClick={() => handleViewReplay(replay)}
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
      )}

      {selectedReplayForPreparation && (
        <ReplayPreparationDialog
          isOpen={isPreparationDialogOpen}
          onClose={() => {
            setIsPreparationDialogOpen(false);
            setSelectedReplayForPreparation(null);
          }}
          replayId={selectedReplayForPreparation.id}
          replayInfo={{
            username: selectedReplayForPreparation.playerName || 'Unknown',
            gameMode: selectedReplayForPreparation.gameMode,
            finalScore: selectedReplayForPreparation.score,
            finalLines: selectedReplayForPreparation.lines,
            durationSeconds: selectedReplayForPreparation.duration / 1000,
            pps: selectedReplayForPreparation.pps,
            apm: selectedReplayForPreparation.apm,
            isPersonalBest: selectedReplayForPreparation.isPersonalBest,
            createdAt: selectedReplayForPreparation.date
          }}
        />
      )}
    </div>
  );
};

export default ReplaySystem;
