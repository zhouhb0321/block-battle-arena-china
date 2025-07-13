import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, User, GamepadIcon, AlertCircle, Search, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface SessionLog {
  id: string;
  username: string;
  session_type: string;
  game_mode?: string;
  created_at: string;
  session_data: any;
  ip_address?: string;
  user_agent?: string;
}

interface AdminLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_username?: string;
  details: any;
  created_at: string;
  ip_address?: string;
}

interface GameLog {
  id: string;
  username: string;
  game_mode: string;
  score: number;
  lines: number;
  duration: number;
  created_at: string;
}

const EnhancedAdminLogsPanel: React.FC = () => {
  const { user } = useAuth();
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [gameLogs, setGameLogs] = useState<GameLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 搜索和过滤状态
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionTypeFilter, setSessionTypeFilter] = useState('all');
  const [gameModeFilter, setGameModeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (user?.isAdmin) {
      loadLogs();
      // 每30秒自动刷新
      const interval = setInterval(loadLogs, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadLogs = async () => {
    try {
      // 加载会话日志
      const { data: sessionData } = await supabase
        .from('user_session_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      // 加载管理员日志
      const { data: adminData } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      // 模拟游戏日志（可以从game_matches或其他表获取）
      const mockGameLogs: GameLog[] = [
        {
          id: '1',
          username: 'player1',
          game_mode: 'sprint_40',
          score: 15000,
          lines: 40,
          duration: 120,
          created_at: new Date().toISOString()
        }
      ];

      setSessionLogs(sessionData || []);
      setAdminLogs(adminData || []);
      setGameLogs(mockGameLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <User className="w-4 h-4 text-green-500" />;
      case 'logout':
        return <User className="w-4 h-4 text-red-500" />;
      case 'game_start':
        return <GamepadIcon className="w-4 h-4 text-blue-500" />;
      case 'game_end':
        return <GamepadIcon className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSessionTypeBadge = (type: string) => {
    const variants = {
      login: 'bg-green-100 text-green-800',
      logout: 'bg-red-100 text-red-800',
      game_start: 'bg-blue-100 text-blue-800',
      game_end: 'bg-gray-100 text-gray-800'
    };
    return variants[type as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  // 过滤逻辑
  const getFilteredSessionLogs = () => {
    let filtered = sessionLogs;
    
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.session_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.game_mode && log.game_mode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (sessionTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.session_type === sessionTypeFilter);
    }
    
    if (gameModeFilter !== 'all') {
      filtered = filtered.filter(log => log.game_mode === gameModeFilter);
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case '1h':
          filterDate.setHours(now.getHours() - 1);
          break;
        case '24h':
          filterDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(log => new Date(log.created_at) >= filterDate);
    }
    
    return filtered;
  };

  const filteredLogs = getFilteredSessionLogs();
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const uniqueSessionTypes = [...new Set(sessionLogs.map(log => log.session_type))];
  const uniqueGameModes = [...new Set(sessionLogs.map(log => log.game_mode).filter(Boolean))];

  if (!user?.isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-red-600">没有权限访问日志系统</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p>加载日志中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions">用户会话日志</TabsTrigger>
          <TabsTrigger value="admin">管理员操作日志</TabsTrigger>
          <TabsTrigger value="games">游戏日志</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  用户会话日志 ({filteredLogs.length})
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadLogs}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 搜索和过滤器 */}
              <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-48">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="搜索用户名、会话类型、游戏模式..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={sessionTypeFilter} onValueChange={(value) => {
                  setSessionTypeFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="会话类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有类型</SelectItem>
                    {uniqueSessionTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={gameModeFilter} onValueChange={(value) => {
                  setGameModeFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="游戏模式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有模式</SelectItem>
                    {uniqueGameModes.map(mode => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={(value) => {
                  setDateFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="时间范围" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部时间</SelectItem>
                    <SelectItem value="1h">1小时内</SelectItem>
                    <SelectItem value="24h">24小时内</SelectItem>
                    <SelectItem value="7d">7天内</SelectItem>
                    <SelectItem value="30d">30天内</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 日志列表 */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {paginatedLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      {getSessionTypeIcon(log.session_type)}
                      <div>
                        <div className="font-medium">{log.username}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(log.created_at)}
                          {log.game_mode && ` · ${log.game_mode}`}
                          {log.ip_address && ` · IP: ${log.ip_address}`}
                        </div>
                        {log.user_agent && (
                          <div className="text-xs text-gray-400 max-w-md truncate">
                            {log.user_agent}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={getSessionTypeBadge(log.session_type)}>
                      {log.session_type}
                    </Badge>
                  </div>
                ))}
                {paginatedLogs.length === 0 && (
                  <p className="text-center text-gray-500 py-8">没有找到匹配的日志</p>
                )}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    显示 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} 条，共 {filteredLogs.length} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                管理员操作日志 ({adminLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {adminLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{log.action_type}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(log.created_at)}
                        {log.target_username && ` · 目标用户: ${log.target_username}`}
                        {log.ip_address && ` · IP: ${log.ip_address}`}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          详情: {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">管理员操作</Badge>
                  </div>
                ))}
                {adminLogs.length === 0 && (
                  <p className="text-center text-gray-500 py-4">暂无管理员日志</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GamepadIcon className="w-5 h-5" />
                游戏日志 ({gameLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {gameLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{log.username}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(log.created_at)} · {log.game_mode}
                      </div>
                      <div className="text-xs text-gray-400">
                        分数: {log.score.toLocaleString()} · 行数: {log.lines} · 时长: {log.duration}s
                      </div>
                    </div>
                    <Badge variant="secondary">游戏记录</Badge>
                  </div>
                ))}
                {gameLogs.length === 0 && (
                  <p className="text-center text-gray-500 py-4">暂无游戏日志</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAdminLogsPanel;