
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Play, Upload, RefreshCw, Trophy, Clock, Target, AlertCircle, LayoutGrid, List } from 'lucide-react';
import { ReplayImporter } from './ReplayImporter';
import { ReplayBrowser } from './replay/ReplayBrowser';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ReplayPreparationDialog } from './ReplayPreparationDialog';
import { ReplayPlayerV4Unified } from './ReplayPlayerV4Unified';
import { DualReplayComparison } from './DualReplayComparison';
import type { GameReplay } from '@/utils/gameTypes';

const ReplaySystem: React.FC = () => {
  const { user } = useAuth();
  const [replays, setReplays] = useState<GameReplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReplayForPreparation, setSelectedReplayForPreparation] = useState<GameReplay | null>(null);
  const [isPreparationDialogOpen, setIsPreparationDialogOpen] = useState(false);
  const [showOldReplays, setShowOldReplays] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  // ✅ P0 修复：独立的播放器状态
  const [playerReplayData, setPlayerReplayData] = useState<any>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  
  // 对比模式状态
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<GameReplay[]>([]);
  const [comparisonData, setComparisonData] = useState<{ replay1: any; replay2: any } | null>(null);

  useEffect(() => {
    loadReplays();
  }, [user]);

  const loadReplays = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load v4.0+ and v3.0+ metadata from compressed_replays
      const { data: compressedReplays, error: compressedError } = await supabase
        .from('compressed_replays')
        .select(`
          id, user_id, username, game_mode, duration_seconds, 
          final_score, final_lines, pps, apm, is_personal_best, 
          created_at, version, actions_count, place_actions_count, seed, 
          initial_board, game_settings
        `)
        .eq('user_id', user.id)
        .gte('version', '3.0')
        .order('created_at', { ascending: false });

      const processedReplays: GameReplay[] = [];

      if (compressedReplays && !compressedError) {
        console.info('ReplaySystem: Loading compressed replays metadata count:', compressedReplays.length);
        
        for (const replay of compressedReplays) {
          // Check playability based on metadata only
          const { isReplayPlayable } = await import('@/utils/replayLoader');
          
          // For V4, check place_actions_count; for V3+, check actions_count
          const version = parseFloat(replay.version || '1.0');
          let isPlayable = false;
          
          if (version >= 4.0) {
            // V4 requires place_actions_count > 0
            isPlayable = (replay.place_actions_count || 0) > 0;
          } else {
            // V3 uses isReplayPlayable function
            isPlayable = isReplayPlayable(replay);
          }

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
                  das: 167, arr: 33, sdf: 41, dcd: 0,
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
    if (comparisonMode) {
      // 对比模式下选择回放
      if (selectedForComparison.find(r => r.id === replay.id)) {
        setSelectedForComparison(selectedForComparison.filter(r => r.id !== replay.id));
      } else if (selectedForComparison.length < 2) {
        setSelectedForComparison([...selectedForComparison, replay]);
      }
    } else {
      // 正常播放模式
      setSelectedReplayForPreparation(replay);
      setIsPreparationDialogOpen(true);
    }
  };
  
  const handleToggleComparisonMode = () => {
    setComparisonMode(!comparisonMode);
    setSelectedForComparison([]);
  };
  
  const handleStartComparison = async () => {
    if (selectedForComparison.length !== 2) return;
    
    // 加载两个回放的完整数据
    const { loadReplayById } = await import('@/utils/replayLoader');
    
    try {
      const data1 = await loadReplayById(selectedForComparison[0].id);
      const data2 = await loadReplayById(selectedForComparison[1].id);
      
      // 确保都是 V4 格式
      if (isV4Replay(data1) && isV4Replay(data2)) {
        setComparisonData({
          replay1: getV4Data(data1),
          replay2: getV4Data(data2)
        });
      } else {
        console.error('Both replays must be V4 format for comparison');
      }
    } catch (error) {
      console.error('Error loading replays for comparison:', error);
    }
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

  // ✅ P0 修复：处理播放准备完成
  const handlePlayReady = (replayData: any) => {
    console.group('[ReplaySystem] Opening player');
    console.log('Replay data:', {
      isV4: isV4Replay(replayData),
      hasEvents: replayData?.events?.length || replayData?.actions?.length,
      metadata: replayData?.metadata || replayData?.initialPieceSequence
    });
    console.groupEnd();
    
    setPlayerReplayData(replayData);
    setIsPlayerOpen(true);
    setIsPreparationDialogOpen(false);
  };

  // Helper functions for V4 detection - 增强数据检测
  const isV4Replay = (data: any): boolean => {
    if (!data) return false;
    // 检查多种 V4 格式标识
    if (data.format === 'v4') return true;
    if (data.version === '4.0') return true;
    if (data.v4Data) return true;
    // 检查是否有 V4 必需的字段
    if (data.events && data.stats && data.metadata) return true;
    return false;
  };

  const getV4Data = (data: any): any | null => {
    if (!data) return null;
    // 尝试多种数据格式提取
    if (data.v4Data) return data.v4Data;
    if (data.format === 'v4') return data;
    // 直接的 V4 结构
    if (data.events && data.stats && data.metadata) return data;
    // 包装在 replay_data 中
    if (data.replay_data?.events) return data.replay_data;
    return null;
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
        <div className="flex items-center gap-2">
          <ReplayImporter />
          
          {/* 视图切换 */}
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          
          <Button 
            variant={comparisonMode ? "default" : "outline"} 
            onClick={handleToggleComparisonMode}
            size="sm"
          >
            {comparisonMode ? '退出对比' : '对比模式'}
          </Button>
          {comparisonMode && selectedForComparison.length === 2 && (
            <Button onClick={handleStartComparison} size="sm">
              开始对比
            </Button>
          )}
          <Button onClick={loadReplays} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {comparisonMode && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <p className="text-sm">
              对比模式已启用。请选择两个回放进行对比分析。
              已选择: {selectedForComparison.length}/2
            </p>
          </CardContent>
        </Card>
      )}

      {/* 卡片视图 */}
      {viewMode === 'grid' && (
        <ReplayBrowser
          onPlayReplay={(replayId) => {
            const replay = replays.find(r => r.id === replayId);
            if (replay) {
              setSelectedReplayForPreparation(replay);
              setIsPreparationDialogOpen(true);
            }
          }}
        />
      )}

      {/* 列表视图 */}
      {viewMode === 'list' && replays.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无回放记录</h3>
            <p className="text-gray-600">完成游戏后，您的回放记录将显示在这里</p>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
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
                      {replay.isPlayable ? (
                        <Badge variant="default" className="bg-green-500 text-white">
                          <Play className="w-3 h-3 mr-1" />
                          可播放
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          数据不完整
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

                  <div className="flex items-center gap-2">
                    {replay.isPlayable ? (
                      <Badge variant="default" className="bg-green-500 text-white">
                        <Play className="w-3 h-3 mr-1" />
                        可播放
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        数据不完整
                      </Badge>
                    )}
                    
                    <Button 
                      onClick={() => handleViewReplay(replay)}
                      className="ml-4"
                      size="sm"
                      disabled={!replay.isPlayable}
                      variant={comparisonMode && selectedForComparison.find(r => r.id === replay.id) ? "default" : "outline"}
                    >
                      {comparisonMode ? (
                        selectedForComparison.find(r => r.id === replay.id) ? (
                          <>✓ 已选择</>
                        ) : (
                          <>选择对比</>
                        )
                      ) : replay.isPlayable ? (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          观看回放
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 mr-1" />
                          数据不完整
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

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
          onPlayReady={handlePlayReady}
        />
      )}

      {/* 统一的播放器（不受对话框关闭影响） */}
      {playerReplayData && isPlayerOpen && isV4Replay(playerReplayData) && (
        <ReplayPlayerV4Unified
          key={playerReplayData?.id || playerReplayData?.v4Data?.metadata?.seed || 'replay'}
          replay={getV4Data(playerReplayData)}
          onClose={() => setIsPlayerOpen(false)}
          autoPlay={true}
        />
      )}
      
      {/* 对比播放器 */}
      {comparisonData && (
        <DualReplayComparison
          replay1={comparisonData.replay1}
          replay2={comparisonData.replay2}
          onClose={() => {
            setComparisonData(null);
            setSelectedForComparison([]);
            setComparisonMode(false);
          }}
        />
      )}
    </div>
  );
};

export default ReplaySystem;
