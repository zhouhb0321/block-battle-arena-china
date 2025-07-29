import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, Filter, Trophy, Clock, Target } from 'lucide-react';

interface GameRecord {
  id: string;
  user_id: string;
  username: string;
  game_mode: string;
  final_score: number;
  final_lines: number;
  final_level: number;
  pps: number;
  apm: number;
  duration: number;
  created_at: string;
  is_personal_best: boolean;
  is_world_record: boolean;
}

interface SessionLog {
  id: string;
  user_id: string;
  username: string;
  session_type: string;
  game_mode: string;
  session_data: any;
  created_at: string;
  ip_address: string;
}

const GameRecordManagement: React.FC = () => {
  const [gameRecords, setGameRecords] = useState<GameRecord[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [gameModeFilter, setGameModeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchGameRecords();
    fetchSessionLogs();
  }, []);

  const fetchGameRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('game_replays_new')
        .select(`
          *,
          user_profiles(username)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const formattedRecords = data?.map(record => ({
        id: record.id,
        user_id: record.user_id,
        username: record.user_profiles?.username || 'Unknown',
        game_mode: record.game_mode,
        final_score: record.final_score,
        final_lines: record.final_lines,
        final_level: record.final_level,
        pps: record.pps,
        apm: record.apm,
        duration: record.duration,
        created_at: record.created_at,
        is_personal_best: record.is_personal_best,
        is_world_record: record.is_world_record
      })) || [];

      setGameRecords(formattedRecords);
    } catch (error) {
      console.error('Error fetching game records:', error);
      toast({
        title: "错误",
        description: "获取游戏记录失败",
        variant: "destructive"
      });
    }
  };

  const fetchSessionLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_session_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setSessionLogs(data || []);
    } catch (error) {
      console.error('Error fetching session logs:', error);
      toast({
        title: "错误",
        description: "获取会话日志失败",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredGameRecords = gameRecords.filter(record => {
    const matchesSearch = !searchTerm || 
      record.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.game_mode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGameMode = gameModeFilter === 'all' || record.game_mode === gameModeFilter;
    
    const matchesDateRange = (!dateRange.start || new Date(record.created_at) >= new Date(dateRange.start)) &&
                           (!dateRange.end || new Date(record.created_at) <= new Date(dateRange.end));
    
    return matchesSearch && matchesGameMode && matchesDateRange;
  });

  const filteredSessionLogs = sessionLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.session_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.game_mode && log.game_mode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDateRange = (!dateRange.start || new Date(log.created_at) >= new Date(dateRange.start)) &&
                           (!dateRange.end || new Date(log.created_at) <= new Date(dateRange.end));
    
    return matchesSearch && matchesDateRange;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "提示",
        description: "没有数据可导出",
        variant: "default"
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "成功",
      description: `已导出 ${data.length} 条记录`
    });
  };

  const getGameModeDisplay = (mode: string) => {
    const modes: { [key: string]: string } = {
      'sprint_40': '40行竞速',
      'classic': '经典模式',
      'zen': '禅模式',
      'vs_1v1': '1对1对战',
      'multiplayer': '多人对战'
    };
    return modes[mode] || mode;
  };

  const getSessionTypeDisplay = (type: string) => {
    const types: { [key: string]: string } = {
      'game_start': '游戏开始',
      'game_end': '游戏结束',
      'login': '用户登录',
      'logout': '用户登出'
    };
    return types[type] || type;
  };

  const calculateStats = () => {
    const totalGames = gameRecords.length;
    const totalSessions = sessionLogs.filter(log => log.session_type === 'game_start').length;
    const avgScore = gameRecords.length > 0 ? 
      Math.round(gameRecords.reduce((sum, record) => sum + record.final_score, 0) / gameRecords.length) : 0;
    const personalBests = gameRecords.filter(record => record.is_personal_best).length;

    return { totalGames, totalSessions, avgScore, personalBests };
  };

  const stats = calculateStats();

  if (loading) {
    return <div className="flex justify-center p-8">加载游戏记录中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">游戏记录管理</h2>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.totalGames}</div>
                <p className="text-sm text-muted-foreground">游戏记录总数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.totalSessions}</div>
                <p className="text-sm text-muted-foreground">游戏会话总数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.avgScore.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">平均得分</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.personalBests}</div>
                <p className="text-sm text-muted-foreground">个人最佳记录</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和过滤 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名或游戏模式..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={gameModeFilter} onValueChange={setGameModeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="选择游戏模式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有模式</SelectItem>
                <SelectItem value="sprint_40">40行竞速</SelectItem>
                <SelectItem value="classic">经典模式</SelectItem>
                <SelectItem value="zen">禅模式</SelectItem>
                <SelectItem value="vs_1v1">1对1对战</SelectItem>
                <SelectItem value="multiplayer">多人对战</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              placeholder="开始日期"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              placeholder="结束日期"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="game-records" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="game-records">游戏记录</TabsTrigger>
          <TabsTrigger value="session-logs">会话日志</TabsTrigger>
        </TabsList>

        <TabsContent value="game-records" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              显示 {filteredGameRecords.length} 条记录
            </div>
            <Button
              onClick={() => exportToCSV(filteredGameRecords, 'game_records')}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              导出CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户名</TableHead>
                      <TableHead>游戏模式</TableHead>
                      <TableHead>得分</TableHead>
                      <TableHead>行数</TableHead>
                      <TableHead>等级</TableHead>
                      <TableHead>PPS</TableHead>
                      <TableHead>APM</TableHead>
                      <TableHead>时长</TableHead>
                      <TableHead>记录类型</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGameRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.username}</TableCell>
                        <TableCell>{getGameModeDisplay(record.game_mode)}</TableCell>
                        <TableCell>{record.final_score.toLocaleString()}</TableCell>
                        <TableCell>{record.final_lines}</TableCell>
                        <TableCell>{record.final_level}</TableCell>
                        <TableCell>{record.pps.toFixed(2)}</TableCell>
                        <TableCell>{record.apm.toFixed(0)}</TableCell>
                        <TableCell>{formatDuration(record.duration)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {record.is_world_record && (
                              <Badge variant="default" className="text-xs">世界记录</Badge>
                            )}
                            {record.is_personal_best && (
                              <Badge variant="secondary" className="text-xs">个人最佳</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(record.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session-logs" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              显示 {filteredSessionLogs.length} 条日志
            </div>
            <Button
              onClick={() => exportToCSV(filteredSessionLogs, 'session_logs')}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              导出CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户名</TableHead>
                      <TableHead>会话类型</TableHead>
                      <TableHead>游戏模式</TableHead>
                      <TableHead>IP地址</TableHead>
                      <TableHead>会话数据</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessionLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.username}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getSessionTypeDisplay(log.session_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.game_mode ? getGameModeDisplay(log.game_mode) : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-xs">
                            {JSON.stringify(log.session_data)}
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(log.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GameRecordManagement;