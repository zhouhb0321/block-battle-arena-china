import React, { useState, useEffect } from 'react';
import { Play, Trash2, Share2, Filter, Calendar, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ReplayBrowserProps {
  onPlayReplay: (replayId: string) => void;
}

export const ReplayBrowser: React.FC<ReplayBrowserProps> = ({ onPlayReplay }) => {
  const { user } = useAuth();
  const [replays, setReplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<string>('all');
  const [filterTime, setFilterTime] = useState<string>('all');
  const [filterBest, setFilterBest] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'time'>('date');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadReplays();
  }, [user, filterMode, filterTime, filterBest, sortBy]);

  const loadReplays = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('compressed_replays')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_playable', true)
        .order('created_at', { ascending: false });

      // 游戏模式筛选
      if (filterMode !== 'all') {
        query = query.eq('game_mode', filterMode);
      }

      // 时间范围筛选
      if (filterTime !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (filterTime) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      // 个人最佳筛选
      if (filterBest) {
        query = query.eq('is_personal_best', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // 排序
      let sortedData = data || [];
      switch (sortBy) {
        case 'score':
          sortedData = [...sortedData].sort((a, b) => b.final_score - a.final_score);
          break;
        case 'time':
          sortedData = [...sortedData].sort((a, b) => a.duration_seconds - b.duration_seconds);
          break;
        case 'date':
        default:
          // 已经按日期排序
          break;
      }
      
      setReplays(sortedData);
    } catch (error) {
      console.error('Failed to load replays:', error);
      toast.error('加载回放失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (replayId: string) => {
    if (!confirm('确定要删除这个回放吗？此操作无法撤销。')) return;

    try {
      const { error } = await supabase
        .from('compressed_replays')
        .delete()
        .eq('id', replayId);

      if (error) throw error;

      toast.success('回放已删除');
      loadReplays();
    } catch (error) {
      console.error('Failed to delete replay:', error);
      toast.error('删除回放失败');
    }
  };

  const handleShare = (replay: any) => {
    const shareUrl = `${window.location.origin}/replay/${replay.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('分享链接已复制到剪贴板');
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 生成游戏板缩略图
  const generateThumbnail = (board: number[][] | null) => {
    if (!board || !Array.isArray(board)) return null;
    
    return (
      <div className="w-full h-32 bg-background/80 rounded border border-border overflow-hidden">
        <div className="grid gap-px" style={{ 
          gridTemplateRows: `repeat(${board.length}, minmax(0, 1fr))`,
          gridTemplateColumns: `repeat(${board[0]?.length || 10}, minmax(0, 1fr))`,
          height: '100%'
        }}>
          {board.slice(0, 20).map((row, y) => 
            row.slice(0, 10).map((cell, x) => (
              <div
                key={`${y}-${x}`}
                className={cell > 0 ? 'bg-primary/60' : 'bg-muted/20'}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  const paginatedReplays = replays.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(replays.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">筛选:</span>
            </div>

            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="游戏模式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有模式</SelectItem>
                <SelectItem value="sprint40">40行竞速</SelectItem>
                <SelectItem value="sprint100">100行竞速</SelectItem>
                <SelectItem value="timeAttack2">2分钟挑战</SelectItem>
                <SelectItem value="timeAttack5">5分钟挑战</SelectItem>
                <SelectItem value="endless">无尽模式</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTime} onValueChange={setFilterTime}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="时间" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部时间</SelectItem>
                <SelectItem value="today">今天</SelectItem>
                <SelectItem value="week">本周</SelectItem>
                <SelectItem value="month">本月</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={filterBest ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterBest(!filterBest)}
            >
              仅显示最佳
            </Button>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">最新</SelectItem>
                  <SelectItem value="score">最高分</SelectItem>
                  <SelectItem value="time">最快</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              共 {replays.length} 个回放
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 回放列表 */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : paginatedReplays.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          没有找到回放记录
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedReplays.map((replay) => (
            <Card key={replay.id} className="group hover:shadow-lg transition-all bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0 space-y-0">
                {/* 游戏板缩略图 */}
                <div className="relative">
                  {generateThumbnail(replay.initial_board)}
                  <div className="absolute top-2 right-2">
                    {replay.is_personal_best && (
                      <Badge variant="default" className="bg-yellow-500 shadow-lg">最佳</Badge>
                    )}
                  </div>
                </div>

                {/* 内容区域 */}
                <div className="p-4 space-y-3">
                  {/* 标题和日期 */}
                  <div>
                    <h3 className="font-semibold text-base truncate">{replay.game_mode}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(replay.created_at)}
                    </p>
                  </div>

                  {/* 统计数据 */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">得分</span>
                      <span className="font-mono font-bold">{replay.final_score.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">行数</span>
                      <span className="font-mono font-bold">{replay.final_lines}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">时长</span>
                      <span className="font-mono">{formatTime(replay.duration_seconds)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">PPS</span>
                      <span className="font-mono">{replay.pps.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => onPlayReplay(replay.id)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      播放
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShare(replay)}
                    >
                      <Share2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(replay.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            上一页
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
};
