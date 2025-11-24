import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, TrendingUp, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface FriendActivityProps {
  friendIds: string[];
}

const FriendActivity: React.FC<FriendActivityProps> = ({ friendIds }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [friendIds]);

  const loadActivities = async () => {
    if (friendIds.length === 0) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 获取好友的最新个人最佳记录
      const { data: friendReplays } = await supabase
        .from('compressed_replays')
        .select('user_id, username, final_score, final_lines, game_mode, created_at, is_personal_best, pps, apm')
        .in('user_id', friendIds)
        .eq('is_personal_best', true)
        .order('created_at', { ascending: false })
        .limit(20);

      setActivities(friendReplays || []);
    } catch (error) {
      console.error('Error loading friend activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (gameMode: string) => {
    if (gameMode.includes('sprint')) return <Zap className="w-5 h-5 text-blue-500" />;
    if (gameMode.includes('ranked')) return <Trophy className="w-5 h-5 text-purple-500" />;
    return <TrendingUp className="w-5 h-5 text-green-500" />;
  };

  const getGameModeLabel = (gameMode: string) => {
    const labels: Record<string, string> = {
      'sprint_40': '40行冲刺',
      'sprint_100': '100行冲刺',
      'marathon': '马拉松',
      'ultra': '无尽模式',
      'ranked': '排位赛'
    };
    return labels[gameMode] || gameMode;
  };

  if (friendIds.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground text-sm">添加好友后即可查看动态</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          好友动态
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">加载中...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">暂无好友动态</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.map((activity, index) => (
              <div
                key={`${activity.user_id}-${activity.created_at}-${index}`}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                {getActivityIcon(activity.game_mode)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    <span className="text-primary">{activity.username}</span> 刷新了个人最佳记录！
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getGameModeLabel(activity.game_mode)} · 分数: {activity.final_score.toLocaleString()} · 
                    消行: {activity.final_lines}
                  </p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">PPS: {activity.pps?.toFixed(2) || '0.00'}</span>
                    <span className="text-xs text-muted-foreground">APM: {activity.apm?.toFixed(0) || '0'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { 
                      addSuffix: true,
                      locale: zhCN
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FriendActivity;
