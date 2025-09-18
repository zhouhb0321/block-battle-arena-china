import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Trophy, Target, Play, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loadReplayById } from '@/utils/replayLoader';
import { EnhancedReplayPlayer } from './EnhancedReplayPlayer';
import type { CompressedReplay } from '@/utils/replayTypes';

interface ReplayPreparationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  replayId: string;
  replayInfo: {
    username: string;
    gameMode: string;
    finalScore: number;
    finalLines: number;
    durationSeconds: number;
    pps: number;
    apm: number;
    isPersonalBest: boolean;
    createdAt: string;
  };
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export const ReplayPreparationDialog: React.FC<ReplayPreparationDialogProps> = ({
  isOpen,
  onClose,
  replayId,
  replayInfo
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [loadProgress, setLoadProgress] = useState(0);
  const [replayData, setReplayData] = useState<CompressedReplay | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
  };

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  const getGameModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      'sprint40': '40行竞速',
      'timeAttack2': '2分钟竞速',
      'ultra2min': '2分钟竞速',
      'blitz': '闪电模式',
      'marathon': '马拉松模式'
    };
    return labels[mode] || mode;
  };

  const handleLoadReplay = async () => {
    setLoadingState('loading');
    setLoadProgress(0);
    setErrorMessage('');

    try {
      // 模拟加载进度
      const progressInterval = setInterval(() => {
        setLoadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const loadedReplay = await loadReplayById(replayId);
      
      clearInterval(progressInterval);
      setLoadProgress(100);

      if (loadedReplay && loadedReplay.actions) {
        // loadReplayById now returns a complete CompressedReplay object
        setReplayData(loadedReplay);
        setLoadingState('success');
        toast({
          title: "录像加载成功",
          description: `成功载入 ${loadedReplay.decodedResult?.placeActionsCount || loadedReplay.actionsCount || 0} 个动作`
        });
      } else {
        throw new Error('录像数据无效或无法播放');
      }
    } catch (error) {
      console.error('Failed to load replay:', error);
      setLoadingState('error');
      setLoadProgress(0);
      const errorMsg = error instanceof Error ? error.message : '加载录像失败';
      setErrorMessage(errorMsg);
      toast({
        variant: "destructive",
        title: "加载失败",
        description: errorMsg
      });
    }
  };

  const handlePlayReplay = () => {
    if (replayData) {
      setIsPlayerOpen(true);
    }
  };

  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
  };

  const handleRetry = () => {
    setLoadingState('idle');
    setErrorMessage('');
    setLoadProgress(0);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              录像回放准备
            </DialogTitle>
            <DialogDescription>
              查看录像信息并加载回放数据
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 录像信息卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    {replayInfo.username}
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {getGameModeLabel(replayInfo.gameMode)}
                    </Badge>
                    {replayInfo.isPersonalBest && (
                      <Badge className="bg-yellow-500 text-black">
                        <Trophy className="w-3 h-3 mr-1" />
                        PB
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">得分</span>
                    </div>
                    <div className="font-bold text-lg">{formatScore(replayInfo.finalScore)}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-sm text-muted-foreground">行数</span>
                    </div>
                    <div className="font-bold text-lg">{replayInfo.finalLines}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">用时</span>
                    </div>
                    <div className="font-bold text-lg">{formatTime(replayInfo.durationSeconds)}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-sm text-muted-foreground">PPS</span>
                    </div>
                    <div className="font-bold text-lg">{replayInfo.pps.toFixed(2)}</div>
                  </div>
                </div>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                  创建时间: {new Date(replayInfo.createdAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 加载状态区域 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  录像数据加载
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingState === 'idle' && (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      点击"读取录像"按钮从数据库加载完整的回放数据
                    </p>
                    <Button onClick={handleLoadReplay} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      读取录像
                    </Button>
                  </div>
                )}

                {loadingState === 'loading' && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-2">正在从数据库加载录像数据...</p>
                      <Progress value={loadProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground mt-2">{loadProgress}%</p>
                    </div>
                  </div>
                )}

                {loadingState === 'success' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span>录像数据加载成功！</span>
                    </div>
                    <Button onClick={handlePlayReplay} className="w-full" size="lg">
                      <Play className="w-4 h-4 mr-2" />
                      播放回放
                    </Button>
                  </div>
                )}

                {loadingState === 'error' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      <span>加载失败</span>
                    </div>
                    {errorMessage && (
                      <p className="text-sm text-red-600 text-center">{errorMessage}</p>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handleRetry} variant="outline" className="flex-1">
                        重试
                      </Button>
                      <Button onClick={onClose} variant="secondary" className="flex-1">
                        关闭
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* 增强回放播放器 - 只在数据完整且对话框打开时渲染 */}
      {replayData && isPlayerOpen && (
        <EnhancedReplayPlayer
          replay={replayData}
          isOpen={isPlayerOpen}
          onClose={handleClosePlayer}
        />
      )}
    </>
  );
};