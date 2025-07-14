import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, GamepadIcon, DollarSign, Megaphone, Activity } from 'lucide-react';
import EnhancedAdminLogsPanel from './EnhancedAdminLogsPanel';
import AdminMusicManagement from './AdminMusicManagement';
import AdminWallpaperManagement from './AdminWallpaperManagement';

interface AdminPanelProps {
  onBackToMenu?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToMenu }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [gameStats, setGameStats] = useState({
    totalGames: 0,
    activeUsers: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.isAdmin) {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    try {
      // 加载用户数据
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // 加载游戏统计
      const { data: gamesData } = await supabase
        .from('game_matches')
        .select('id');

      setUsers(usersData || []);
      setGameStats({
        totalGames: gamesData?.length || 0,
        activeUsers: usersData?.filter(u => u.games_played > 0).length || 0,
        totalUsers: usersData?.length || 0
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-600">您没有管理员权限访问此页面。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p>加载管理面板...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">管理员面板</h1>
        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
          管理员权限
        </Badge>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gameStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              活跃用户: {gameStats.activeUsers}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总游戏数</CardTitle>
            <GamepadIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gameStats.totalGames}</div>
            <p className="text-xs text-muted-foreground">
              已完成的游戏
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统状态</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">正常</div>
            <p className="text-xs text-muted-foreground">
              所有服务运行正常
            </p>
          </CardContent>
        </Card>
      </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="users">用户管理</TabsTrigger>
            <TabsTrigger value="logs">系统日志</TabsTrigger>
            <TabsTrigger value="games">游戏记录</TabsTrigger>
            <TabsTrigger value="music">音乐管理</TabsTrigger>
            <TabsTrigger value="wallpapers">壁纸管理</TabsTrigger>
            <TabsTrigger value="revenue">收入管理</TabsTrigger>
            <TabsTrigger value="ads">广告管理</TabsTrigger>
          </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>用户列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="text-xs text-gray-400">
                        等级: {user.rating} | 游戏: {user.games_played} | 胜率: {user.games_played > 0 ? ((user.games_won / user.games_played) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.user_type === 'premium' && (
                        <Badge variant="secondary">VIP</Badge>
                      )}
                      {user.email === 'admin@tetris.com' && (
                        <Badge variant="destructive">管理员</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <EnhancedAdminLogsPanel />
        </TabsContent>

        <TabsContent value="music">
          <AdminMusicManagement />
        </TabsContent>

        <TabsContent value="wallpapers">
          <AdminWallpaperManagement />
        </TabsContent>

        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>游戏记录管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">游戏记录功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>收入管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">收入管理功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>广告管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">广告管理功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
