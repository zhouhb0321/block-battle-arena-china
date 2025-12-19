import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Lock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BadgeItemProps {
  badge: any;
  unlocked: boolean;
  unlocked_at?: string;
}

const BadgeItem: React.FC<BadgeItemProps> = ({ badge, unlocked, unlocked_at }) => {
  const rarityColors = {
    common: 'bg-gray-400',
    rare: 'bg-blue-500',
    epic: 'bg-purple-600',
    legendary: 'bg-yellow-500'
  };

  const rarityLabels = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
  };

  return (
    <div
      className={`p-4 border rounded-lg transition-all ${
        unlocked ? 'bg-card hover:shadow-lg cursor-pointer' : 'bg-muted/50 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
          unlocked ? rarityColors[badge.rarity as keyof typeof rarityColors] : 'bg-muted'
        }`}>
          {unlocked ? (
            <Trophy className="w-8 h-8 text-white" />
          ) : (
            <Lock className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold text-sm">{badge.name_zh}</h4>
            <Badge 
              variant="secondary" 
              className={`text-xs text-white ${rarityColors[badge.rarity as keyof typeof rarityColors]}`}
            >
              {rarityLabels[badge.rarity as keyof typeof rarityLabels]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{badge.description_zh}</p>
          {unlocked && unlocked_at && (
            <p className="text-xs text-muted-foreground mt-1">
              解锁于 {new Date(unlocked_at).toLocaleDateString('zh-CN')}
            </p>
          )}
          {!unlocked && badge.unlock_condition && (
            <p className="text-xs text-muted-foreground mt-1">
              {badge.unlock_condition.threshold && `目标: ${badge.unlock_condition.threshold}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

interface BadgeCollectionProps {
  onClose?: () => void;
}

const BadgeCollection: React.FC<BadgeCollectionProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<any[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<Map<string, string>>(new Map());
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !user.isGuest) {
      loadBadges();
    }
  }, [user, category]);

  const loadBadges = async () => {
    if (!user || user.isGuest) return;
    
    setLoading(true);
    try {
      // 加载所有徽章定义
      let query = supabase.from('badges').select('*');
      
      if (category !== 'all') {
        query = query.eq('category', category);
      }
      
      const { data: allBadges } = await query.order('rarity', { ascending: true });
      
      // 加载用户已解锁的徽章
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id, unlocked_at')
        .eq('user_id', user.id);
      
      const unlockedMap = new Map(
        (userBadges || []).map(b => [b.badge_id, b.unlocked_at])
      );
      
      setBadges(allBadges || []);
      setUnlockedBadges(unlockedMap);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.isGuest) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">请登录以查看徽章收集</p>
        </CardContent>
      </Card>
    );
  }

  const unlockedCount = unlockedBadges.size;
  const totalCount = badges.length;
  const percentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const categoryLabels = {
    all: '全部',
    beginner: '新手',
    advanced: '进阶',
    master: '大师',
    special: '特殊'
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            徽章收集
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {unlockedCount}/{totalCount} ({percentage.toFixed(0)}%)
            </Badge>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="grid w-full grid-cols-5">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
            ))}
          </TabsList>
          
          <div className="mt-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : badges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无徽章</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {badges.map(badge => (
                  <BadgeItem
                    key={badge.badge_id}
                    badge={badge}
                    unlocked={unlockedBadges.has(badge.badge_id)}
                    unlocked_at={unlockedBadges.get(badge.badge_id)}
                  />
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BadgeCollection;
