
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, User, GamepadIcon, AlertCircle } from 'lucide-react';

interface SessionLog {
  id: string;
  username: string;
  session_type: string;
  game_mode?: string;
  created_at: string;
  session_data: any;
}

interface AdminLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_username?: string;
  details: any;
  created_at: string;
}

const AdminLogsPanel: React.FC = () => {
  const { user } = useAuth();
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.isAdmin) {
      loadLogs();
    }
  }, [user]);

  const loadLogs = async () => {
    try {
      // Load session logs
      const { data: sessionData } = await supabase
        .from('user_session_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Load admin logs
      const { data: adminData } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setSessionLogs(sessionData || []);
      setAdminLogs(adminData || []);
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sessions">用户会话日志</TabsTrigger>
          <TabsTrigger value="admin">管理员操作日志</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                用户会话日志
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessionLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSessionTypeIcon(log.session_type)}
                      <div>
                        <div className="font-medium">{log.username}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(log.created_at)}
                          {log.game_mode && ` · ${log.game_mode}`}
                        </div>
                      </div>
                    </div>
                    <Badge className={getSessionTypeBadge(log.session_type)}>
                      {log.session_type}
                    </Badge>
                  </div>
                ))}
                {sessionLogs.length === 0 && (
                  <p className="text-center text-gray-500 py-4">暂无会话日志</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                管理员操作日志
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
                      </div>
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
      </Tabs>
    </div>
  );
};

export default AdminLogsPanel;
