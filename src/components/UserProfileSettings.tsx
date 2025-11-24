import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import UsernameChangeDialog from './UsernameChangeDialog';
import BadgeCollection from './BadgeCollection';
import { User, Mail, Trophy, Calendar, Edit, X, Star, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserProfileSettingsProps {
  onClose: () => void;
}

// Sanitization function to prevent XSS
const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [featuredBadges, setFeaturedBadges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user && !user.isGuest) {
      loadUserProfile();
      loadFeaturedBadges();
    } else {
      setLoading(false);
    }
  }, [user]);

  // ESC键关闭功能
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const loadUserProfile = async () => {
    if (!user || user.isGuest) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedBadges = async () => {
    if (!user || user.isGuest) return;

    try {
      const { data } = await supabase
        .from('user_badges')
        .select(`
          *,
          badges (*)
        `)
        .eq('user_id', user.id)
        .eq('is_featured', true)
        .limit(5);

      setFeaturedBadges(data || []);
    } catch (error) {
      console.error('Error loading featured badges:', error);
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'premium': return { label: '付费用户', color: 'bg-blue-500' };
      case 'donor': return { label: '捐赠用户', color: 'bg-green-500' };
      case 'vip': return { label: 'VIP用户', color: 'bg-purple-500' };
      default: return { label: '普通用户', color: 'bg-gray-500' };
    }
  };

  const getRankColor = (rank: string) => {
    if (rank.startsWith('S')) return 'bg-red-500';
    if (rank.startsWith('A')) return 'bg-orange-500';
    if (rank.startsWith('B')) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || user.isGuest) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>用户资料</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">游客用户无法查看资料设置</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>用户资料</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">无法加载用户资料</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userTypeInfo = getUserTypeLabel(userProfile.user_type);
  const remainingChanges = userProfile.user_type === 'regular' 
    ? Math.max(0, 1 - (userProfile.username_changes_count || 0))
    : '∞';

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card 
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>用户资料</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 精选徽章 */}
          {featuredBadges.length > 0 && (
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" />
                精选徽章
              </h3>
              <div className="flex gap-3">
                {featuredBadges.map(userBadge => {
                  const badge = (userBadge as any).badges;
                  const rarityColors = {
                    common: 'bg-gray-400',
                    rare: 'bg-blue-500',
                    epic: 'bg-purple-600',
                    legendary: 'bg-yellow-500'
                  };
                  return (
                    <div key={badge.badge_id} className="relative group">
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${rarityColors[badge.rarity as keyof typeof rarityColors]}`}>
                        <Trophy className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-white fill-white" />
                      </div>
                      <div className="absolute invisible group-hover:visible bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg whitespace-nowrap z-10">
                        {badge.name_zh}
                        <div className="text-xs text-gray-300">{badge.description_zh}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">个人资料</TabsTrigger>
              <TabsTrigger value="badges">徽章收集</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">用户名</span>
                </div>
                <UsernameChangeDialog 
                  trigger={
                    <Button variant="ghost" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                  }
                />
              </div>
              <p className="text-lg font-semibold">{sanitizeText(userProfile.username)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">邮箱</span>
              </div>
              <p className="text-lg">{sanitizeText(userProfile.email)}</p>
            </div>
          </div>

          {/* 用户状态 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">用户类型</span>
              <Badge className={`${userTypeInfo.color} text-white`}>
                {userTypeInfo.label}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">等级</span>
              </div>
              <Badge className={`${getRankColor(userProfile.rank)} text-white`}>
                {userProfile.rank}
              </Badge>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">评分</span>
              <p className="text-lg font-semibold">{userProfile.rating}</p>
            </div>
          </div>

          {/* 游戏统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{userProfile.games_played}</p>
              <p className="text-sm text-gray-600">总游戏数</p>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{userProfile.games_won}</p>
              <p className="text-sm text-gray-600">胜利数</p>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{userProfile.best_pps.toFixed(2)}</p>
              <p className="text-sm text-gray-600">最佳 PPS</p>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{userProfile.best_apm.toFixed(2)}</p>
              <p className="text-sm text-gray-600">最佳 APM</p>
            </div>
          </div>

          {/* 用户名修改信息 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">用户名修改信息</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">剩余修改次数: </span>
                <span className="font-medium">{remainingChanges}</span>
              </div>
              {userProfile.username_last_changed_at && (
                <div>
                  <span className="text-blue-700">上次修改时间: </span>
                  <span className="font-medium">
                    {new Date(userProfile.username_last_changed_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2">
              <UsernameChangeDialog 
                trigger={
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    修改用户名
                  </Button>
                }
              />
            </div>
          </div>

          {/* 注册信息 */}
          <div className="pt-4 border-t">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>注册时间: {new Date(userProfile.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
            </TabsContent>

            <TabsContent value="badges" className="mt-6">
              <BadgeCollection />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfileSettings;
