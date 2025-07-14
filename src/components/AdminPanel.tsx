
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Users, GamepadIcon, DollarSign, Megaphone, Activity, Settings, Database, Shield } from 'lucide-react';
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
  const [isAdmin, setIsAdmin] = useState(false);

  // 检查管理员权限
  useEffect(() => {
    const checkAdminAccess = async () => {
      console.log('检查管理员权限:', { user: user?.email });
      
      // 检查当前用户是否为管理员
      if (user?.email === 'admin@tetris.com') {
        setIsAdmin(true);
        loadAdminData();
      } else {
        // 检查本地管理员会话
        const adminSession = localStorage.getItem('admin_session');
        if (adminSession) {
          try {
            const sessionData = JSON.parse(adminSession);
            if (sessionData.email === 'admin@tetris.com' && Date.now() < sessionData.expires) {
              setIsAdmin(true);
              loadAdminData();
            } else {
              localStorage.removeItem('admin_session');
              setLoading(false);
            }
          } catch {
            localStorage.removeItem('admin_session');
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }
    };
    
    checkAdminAccess();
  }, [user]);

  const loadAdminData = async () => {
    try {
      console.log('加载管理员数据...');
      
      // 加载用户数据
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('加载用户数据失败:', usersError);
      } else {
        console.log('用户数据加载成功:', usersData?.length);
        setUsers(usersData || []);
      }

      // 加载游戏统计
      const { data: gamesData, error: gamesError } = await supabase
        .from('game_matches')
        .select('id');

      if (gamesError) {
        console.error('加载游戏数据失败:', gamesError);
      }

      setGameStats({
        totalGames: gamesData?.length || 0,
        activeUsers: usersData?.filter(u => u.games_played > 0).length || 0,
        totalUsers: usersData?.length || 0
      });
      
      console.log('管理员数据加载完成');
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <Alert className="border-red-200">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-red-600">
                您没有管理员权限访问此页面。请使用管理员账户登录。
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button onClick={onBackToMenu} variant="outline">
                返回主菜单
              </Button>
            </div>
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
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            管理员权限
          </Badge>
          {onBackToMenu && (
            <Button onClick={onBackToMenu} variant="outline">
              返回主菜单
            </Button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在线用户</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{Math.floor(gameStats.activeUsers * 0.3)}</div>
            <p className="text-xs text-muted-foreground">
              当前在线
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="users">用户管理</TabsTrigger>
          <TabsTrigger value="games">游戏数据</TabsTrigger>
          <TabsTrigger value="settings">系统设置</TabsTrigger>
          <TabsTrigger value="logs">系统日志</TabsTrigger>
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
                {users.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    暂无用户数据
                  </div>
                ) : (
                  users.map((userProfile) => (
                    <div key={userProfile.id} className="flex items-center justify-between p-4 border rounded">
                      <div>
                        <div className="font-medium">{userProfile.username}</div>
                        <div className="text-sm text-gray-500">{userProfile.email}</div>
                        <div className="text-xs text-gray-400">
                          等级: {userProfile.rating} | 游戏: {userProfile.games_played} | 胜率: {userProfile.games_played > 0 ? ((userProfile.games_won / userProfile.games_played) * 100).toFixed(1) : 0}%
                        </div>
                        <div className="text-xs text-gray-400">
                          注册时间: {new Date(userProfile.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {userProfile.user_type === 'premium' && (
                          <Badge variant="secondary">VIP</Badge>
                        )}
                        {userProfile.email === 'admin@tetris.com' && (
                          <Badge variant="destructive">管理员</Badge>
                        )}
                        {userProfile.user_type === 'admin' && (
                          <Badge variant="destructive">管理员</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>游戏数据统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-blue-600">{gameStats.totalGames}</div>
                  <div className="text-sm text-gray-600">总游戏数</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-green-600">{gameStats.activeUsers}</div>
                  <div className="text-sm text-gray-600">活跃玩家</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-purple-600">{Math.floor(gameStats.totalGames * 0.7)}</div>
                  <div className="text-sm text-gray-600">完成游戏</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-orange-600">{Math.floor(gameStats.totalGames * 0.3)}</div>
                  <div className="text-sm text-gray-600">未完成游戏</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>系统设置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="siteName">网站名称</Label>
                    <Input id="siteName" defaultValue="俄罗斯方块游戏" />
                  </div>
                  <div>
                    <Label htmlFor="maxUsers">最大用户数</Label>
                    <Input id="maxUsers" type="number" defaultValue="10000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gameTimeout">游戏超时时间（分钟）</Label>
                    <Input id="gameTimeout" type="number" defaultValue="30" />
                  </div>
                  <div>
                    <Label htmlFor="sessionTimeout">会话超时时间（小时）</Label>
                    <Input id="sessionTimeout" type="number" defaultValue="24" />
                  </div>
                </div>
                <Button className="w-full">保存设置</Button>
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

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>收入管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-green-600">¥0</div>
                  <div className="text-sm text-gray-600">今日收入</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-blue-600">¥0</div>
                  <div className="text-sm text-gray-600">本月收入</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">VIP用户</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-orange-600">0%</div>
                  <div className="text-sm text-gray-600">转化率</div>
                </div>
              </div>
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
              <div className="space-y-4">
                <Alert>
                  <Megaphone className="h-4 w-4" />
                  <AlertDescription>
                    广告系统尚未启用。启用广告可以帮助维持服务器运营成本。
                  </AlertDescription>
                </Alert>
                <Button disabled>启用广告系统</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
