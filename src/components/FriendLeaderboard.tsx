import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal } from 'lucide-react';

interface FriendLeaderboardProps {
  userId: string;
  friendIds: string[];
}

const FriendLeaderboard: React.FC<FriendLeaderboardProps> = ({ userId, friendIds }) => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'rating' | 'best_pps' | 'best_apm'>('rating');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [friendIds, sortBy]);

  const loadLeaderboard = async () => {
    if (friendIds.length === 0) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, username, rating, best_pps, best_apm, rank')
        .in('id', [...friendIds, userId])
        .order(sortBy, { ascending: false });

      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return null;
  };

  if (friendIds.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground text-sm">添加好友后即可查看排行榜</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-primary" />
            好友排行榜
          </CardTitle>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">评分</SelectItem>
              <SelectItem value="best_pps">PPS</SelectItem>
              <SelectItem value="best_apm">APM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">加载中...</div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  player.id === userId 
                    ? 'bg-primary/10 border-2 border-primary' 
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {getMedalIcon(index) || (
                      <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{player.username}</p>
                    <Badge variant="secondary" className="text-xs">{player.rank}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {sortBy === 'rating' && player.rating}
                    {sortBy === 'best_pps' && player.best_pps.toFixed(2)}
                    {sortBy === 'best_apm' && player.best_apm.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sortBy === 'rating' && 'TR'}
                    {sortBy === 'best_pps' && 'PPS'}
                    {sortBy === 'best_apm' && 'APM'}
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

export default FriendLeaderboard;
