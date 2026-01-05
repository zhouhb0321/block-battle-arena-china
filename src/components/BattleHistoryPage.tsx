/**
 * 对战历史页面
 * 显示用户所有对战记录和统计数据
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, Trophy, Target, TrendingUp, Zap, Timer, 
  Play, Crown, Skull, Swords, Users, Award, Flame
} from 'lucide-react';
import { 
  fetchBattleHistory, 
  fetchBattleStats, 
  BattleHistoryEntry, 
  BattleStats,
  FetchBattleHistoryOptions 
} from '@/utils/battleHistoryQueries';
import { cn } from '@/lib/utils';

interface BattleHistoryPageProps {
  onBack: () => void;
  onWatchReplay: (replayId: string) => void;
}

const BattleHistoryPage: React.FC<BattleHistoryPageProps> = ({ onBack, onWatchReplay }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [entries, setEntries] = useState<BattleHistoryEntry[]>([]);
  const [stats, setStats] = useState<BattleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // 筛选和排序状态
  const [matchType, setMatchType] = useState<'all' | 'ranked' | 'custom' | 'team'>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const options: FetchBattleHistoryOptions = {
        matchType,
        timeRange,
        sortBy,
        sortOrder: 'desc',
        page,
        pageSize
      };

      const [historyResult, statsResult] = await Promise.all([
        fetchBattleHistory(user.id, options),
        page === 1 ? fetchBattleStats(user.id) : Promise.resolve(stats)
      ]);

      setEntries(historyResult.entries);
      setTotal(historyResult.total);
      if (statsResult) setStats(statsResult);
    } catch (error) {
      console.error('Failed to load battle history:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, matchType, timeRange, sortBy, page, stats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 重置页码当筛选条件改变
  useEffect(() => {
    setPage(1);
  }, [matchType, timeRange, sortBy]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  const getMatchTypeBadge = (type: string) => {
    switch (type) {
      case 'ranked':
        return <Badge variant="default" className="bg-game-purple">排位赛</Badge>;
      case 'custom':
        return <Badge variant="secondary">自定义</Badge>;
      case 'team':
        return <Badge variant="outline" className="border-game-cyan text-game-cyan">团队战</Badge>;
      default:
        return null;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Swords className="w-8 h-8 text-primary" />
              对战历史
            </h1>
          </div>
        </div>

        {/* 统计概览 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{stats.totalMatches}</div>
                <div className="text-xs text-muted-foreground">总场数</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{stats.wins}</div>
                <div className="text-xs text-muted-foreground">胜场</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-500">{stats.losses}</div>
                <div className="text-xs text-muted-foreground">负场</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-game-orange">{stats.winRate}%</div>
                <div className="text-xs text-muted-foreground">胜率</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-game-cyan">{stats.avgPps}</div>
                <div className="text-xs text-muted-foreground">平均PPS</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-game-purple">{stats.avgApm}</div>
                <div className="text-xs text-muted-foreground">平均APM</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">{stats.highestScore.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">最高分</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-2xl font-bold text-orange-500">{stats.longestWinStreak}</span>
                </div>
                <div className="text-xs text-muted-foreground">最长连胜</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 筛选控制 */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={matchType} onValueChange={(v) => setMatchType(v as typeof matchType)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="比赛类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="ranked">排位赛</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
              <SelectItem value="team">团队战</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="时间" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部时间</SelectItem>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">最新</SelectItem>
              <SelectItem value="score">得分</SelectItem>
              <SelectItem value="duration">时长</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto text-sm text-muted-foreground">
            共 {total} 场对战
          </div>
        </div>

        {/* 对战记录列表 */}
        <div className="space-y-3">
          {loading ? (
            // 加载骨架
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="bg-card/50">
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          ) : entries.length === 0 ? (
            <Card className="bg-card/50">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Swords className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无对战记录</p>
                <p className="text-sm mt-2">开始你的第一场对战吧！</p>
              </CardContent>
            </Card>
          ) : (
            entries.map((entry) => (
              <Card 
                key={entry.id} 
                className={cn(
                  "bg-card/50 hover:bg-card/80 transition-colors",
                  entry.isWin ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* 左侧：胜负和对手信息 */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                        entry.isWin ? "bg-green-500/20" : "bg-red-500/20"
                      )}>
                        {entry.isWin ? (
                          <Crown className="w-6 h-6 text-green-500" />
                        ) : (
                          <Skull className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-bold",
                            entry.isWin ? "text-green-500" : "text-red-500"
                          )}>
                            {entry.isWin ? '胜' : '负'}
                          </span>
                          <span className="text-foreground">vs</span>
                          <span className="font-medium truncate">{entry.opponentUsername}</span>
                          {entry.opponentRating && (
                            <span className="text-sm text-muted-foreground">
                              ({entry.opponentRating}分)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                          {getMatchTypeBadge(entry.matchType)}
                          <span>BO{entry.bestOf}</span>
                          <span className="font-mono">{entry.playerWins}-{entry.opponentWins}</span>
                        </div>
                      </div>
                    </div>

                    {/* 中间：数据统计 */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-mono font-bold">{entry.playerStats.score.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">分数</div>
                      </div>
                      {entry.playerStats.pps > 0 && (
                        <div className="text-center">
                          <div className="font-mono font-bold text-game-cyan">{entry.playerStats.pps.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">PPS</div>
                        </div>
                      )}
                      {entry.playerStats.apm > 0 && (
                        <div className="text-center">
                          <div className="font-mono font-bold text-game-purple">{entry.playerStats.apm.toFixed(1)}</div>
                          <div className="text-xs text-muted-foreground">APM</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="font-mono">{formatTime(entry.duration)}</div>
                        <div className="text-xs text-muted-foreground">时长</div>
                      </div>
                    </div>

                    {/* 右侧：时间和操作 */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-sm text-muted-foreground text-right">
                        {formatRelativeTime(entry.createdAt)}
                      </div>
                      {entry.replayId && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onWatchReplay(entry.replayId!)}
                          className="gap-1"
                        >
                          <Play className="w-4 h-4" />
                          回放
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              上一页
            </Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BattleHistoryPage;
