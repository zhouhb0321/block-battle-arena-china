
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, GamepadIcon, DollarSign, Megaphone, Activity, AlertCircle, FolderOpen } from 'lucide-react';
import AdminLogsPanel from './AdminLogsPanel';
import AdminResourceManager from './AdminResourceManager';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [gameStats, setGameStats] = useState({
    totalGames: 0,
    activeUsers: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);

  const typedUser = user as (typeof user & { isAdmin?: boolean });

  useEffect(() => {
    console.log('AdminPanel 渲染:', { 
      user: user?.email, 
      isAdmin: typedUser?.isAdmin 
    });
    
    // Only load admin data if user is confirmed admin
    if (typedUser?.isAdmin) {
      loadAdminData();
    } else {
      // Clear any existing data if user is not admin
      setUsers([]);
      setGameStats({
        totalGames: 0,
        activeUsers: 0,
        totalUsers: 0
      });
      setLoading(false);
    }
  }, [user, typedUser?.isAdmin]);

  const loadAdminData = async () => {
    try {
      console.log('开始加载管理数据...');
      
      // 加载用户数据
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('加载用户数据失败:', usersError);
      }

      // 加载游戏统计
      const { data: gamesData, error: gamesError } = await supabase
        .from('game_matches')
        .select('id');

      if (gamesError) {
        console.error('加载游戏数据失败:', gamesError);
      }

      setUsers(usersData || []);
      setGameStats({
        totalGames: gamesData?.length || 0,
        activeUsers: usersData?.filter(u => u.games_played > 0).length || 0,
        totalUsers: usersData?.length || 0
      });
      
      console.log('管理数据加载完成:', {
        users: usersData?.length || 0,
        games: gamesData?.length || 0
      });
    } catch (error) {
      console.error('加载管理数据时发生错误:', error);
    } finally {
      setLoading(false);
    }
  };

  // 检查管理员权限
  if (!typedUser?.isAdmin) {
    console.log('非管理员用户访问管理面板:', user?.email);
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('accessDenied')}</h2>
            <p className="text-muted-foreground">{t('adminAccessRequired')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>{t('loadingAdminPanel')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('adminPanel')}</h1>
        <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          {t('adminAccess')}
        </Badge>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gameStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {t('activeUsers')}: {gameStats.activeUsers}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalGames')}</CardTitle>
            <GamepadIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gameStats.totalGames}</div>
            <p className="text-xs text-muted-foreground">
              {t('completedGames')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('systemStatus')}</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{t('normal')}</div>
            <p className="text-xs text-muted-foreground">
              {t('allServicesRunning')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">{t('userManagement')}</TabsTrigger>
          <TabsTrigger value="logs">{t('systemLogs')}</TabsTrigger>
          <TabsTrigger value="games">{t('gameRecords')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('revenueManagement')}</TabsTrigger>
          <TabsTrigger value="ads">{t('adManagement')}</TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            资源管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('userList')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('level')}: {user.rating} | {t('games')}: {user.games_played} | {t('winRate')}: {user.games_played > 0 ? ((user.games_won / user.games_played) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.user_type === 'premium' && (
                        <Badge variant="secondary">VIP</Badge>
                      )}
                      {user.email === 'admin@tetris.com' && (
                        <Badge variant="destructive">{t('admin')}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {t('systemLogs')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminLogsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('gameRecordManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('gameRecordFeatureInDevelopment')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('revenueManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('revenueManagementFeatureInDevelopment')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('adManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('adManagementFeatureInDevelopment')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <AdminResourceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
