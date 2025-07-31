import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, Filter, AlertTriangle } from 'lucide-react';

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'login' | 'game' | 'admin' | 'security';
  userId?: string;
  username?: string;
  action: string;
  ipAddress: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const LogManagement: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [logType, setLogType] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalLogs, setTotalLogs] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [currentPage, pageSize]);

  const fetchLogs = async () => {
    try {
      const offset = (currentPage - 1) * pageSize;
      
      // 从多个表获取日志数据，支持分页
      const [sessionLogs, adminLogs, securityLogs, sessionCount, adminCount, securityCount] = await Promise.all([
        supabase.from('user_session_logs').select('*').order('created_at', { ascending: false }).range(offset, offset + pageSize - 1),
        supabase.from('admin_activity_logs').select('*').order('created_at', { ascending: false }).range(offset, offset + pageSize - 1),
        supabase.from('security_events').select('*').order('created_at', { ascending: false }).range(offset, offset + pageSize - 1),
        supabase.from('user_session_logs').select('*', { count: 'exact', head: true }),
        supabase.from('admin_activity_logs').select('*', { count: 'exact', head: true }),
        supabase.from('security_events').select('*', { count: 'exact', head: true })
      ]);

      const allLogs: LogEntry[] = [];

      // 处理用户会话日志
      sessionLogs.data?.forEach((log, index) => {
        allLogs.push({
          id: parseInt(`1${index.toString().padStart(5, '0')}`),
          timestamp: log.created_at,
          type: 'game',
          userId: log.user_id,
          username: log.username,
          action: getSessionAction(log.session_type),
          ipAddress: log.ip_address || '',
          details: `${log.session_type}: ${log.game_mode || ''}`,
          severity: 'low'
        });
      });

      // 处理管理员操作日志
      adminLogs.data?.forEach((log, index) => {
        allLogs.push({
          id: parseInt(`2${index.toString().padStart(5, '0')}`),
          timestamp: log.created_at,
          type: 'admin',
          userId: log.admin_user_id,
          username: log.target_username || 'Administrator',
          action: log.action_type,
          ipAddress: log.ip_address || '',
          details: JSON.stringify(log.details),
          severity: 'high'
        });
      });

      // 处理安全事件日志
      securityLogs.data?.forEach((log, index) => {
        allLogs.push({
          id: parseInt(`3${index.toString().padStart(5, '0')}`),
          timestamp: log.created_at,
          type: 'security',
          userId: log.user_id || '',
          username: 'System',
          action: log.event_type,
          ipAddress: log.ip_address?.toString() || '',
          details: JSON.stringify(log.event_data),
          severity: getSeverityFromEventType(log.event_type)
        });
      });

      // 按时间排序
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // 设置总日志数
      const total = (sessionCount.count || 0) + (adminCount.count || 0) + (securityCount.count || 0);
      setTotalLogs(total);
      
      setLogs(allLogs);
      setFilteredLogs(allLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "错误",
        description: "获取日志数据失败",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSessionAction = (sessionType: string) => {
    const actions: { [key: string]: string } = {
      'game_start': '开始游戏',
      'game_end': '结束游戏',
      'login': '用户登录',
      'logout': '用户登出'
    };
    return actions[sessionType] || sessionType;
  };

  const getSeverityFromEventType = (eventType: string): 'low' | 'medium' | 'high' | 'critical' => {
    if (eventType.includes('failed') || eventType.includes('security')) return 'critical';
    if (eventType.includes('admin') || eventType.includes('delete')) return 'high';
    if (eventType.includes('update') || eventType.includes('modify')) return 'medium';
    return 'low';
  };

  // 应用筛选条件
  useEffect(() => {
    let result = [...logs];
    
    // 关键词搜索
    if (searchTerm) {
      result = result.filter(log => 
        log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress.includes(searchTerm) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 时间范围筛选
    if (dateRange.start && dateRange.end) {
      result = result.filter(log => {
        const logDate = new Date(log.timestamp);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setDate(endDate.getDate() + 1);
        return logDate >= startDate && logDate <= endDate;
      });
    }
    
    // 日志类型筛选
    if (logType !== 'all') {
      result = result.filter(log => log.type === logType);
    }

    // 严重性筛选
    if (severityFilter !== 'all') {
      result = result.filter(log => log.severity === severityFilter);
    }
    
    setFilteredLogs(result);
    // 重置到第一页当筛选条件改变时
    setCurrentPage(1);
  }, [searchTerm, dateRange, logType, severityFilter, logs]);

  const handleExport = () => {
    if (selectedLogs.length === 0) {
      toast({
        title: "提示",
        description: "请先选择要导出的日志记录",
        variant: "default"
      });
      return;
    }
    
    const logsToExport = filteredLogs.filter(log => selectedLogs.includes(log.id));
    
    // 生成CSV内容
    const headers = ['时间', '类型', '用户ID', '用户名', '操作', 'IP地址', '详情', '重要性'];
    const csvContent = [
      headers.join(','),
      ...logsToExport.map(log => [
        log.timestamp,
        log.type,
        log.userId || '',
        log.username || '',
        log.action,
        log.ipAddress,
        log.details,
        log.severity
      ].map(field => `"${field}"`).join(','))
    ].join('\n');
    
    // 创建并下载CSV文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "成功",
      description: `成功导出 ${selectedLogs.length} 条日志记录`
    });
  };

  const toggleLogSelection = (id: number) => {
    if (selectedLogs.includes(id)) {
      setSelectedLogs(selectedLogs.filter(logId => logId !== id));
    } else {
      setSelectedLogs([...selectedLogs, id]);
    }
  };

  const selectAllLogs = () => {
    if (selectedLogs.length === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(filteredLogs.map(log => log.id));
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />严重</Badge>;
      case 'high': return <Badge variant="destructive">高</Badge>;
      case 'medium': return <Badge variant="secondary">中</Badge>;
      case 'low': return <Badge variant="outline">低</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getTypeDisplay = (type: string) => {
    const types: { [key: string]: string } = {
      'login': '登录日志',
      'game': '游戏日志',
      'admin': '管理日志',
      'security': '安全日志'
    };
    return types[type] || type;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  if (loading) {
    return <div className="flex justify-center p-8">加载日志中...</div>;
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">系统日志管理</h2>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-sm text-muted-foreground">日志总数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <p className="text-sm text-muted-foreground">筛选后数量</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {logs.filter(log => log.severity === 'critical' || log.severity === 'high').length}
            </div>
            <p className="text-sm text-muted-foreground">高危事件</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{selectedLogs.length}</div>
            <p className="text-sm text-muted-foreground">已选择</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索关键词..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              placeholder="开始日期"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              placeholder="结束日期"
            />
            <Select value={logType} onValueChange={setLogType}>
              <SelectTrigger>
                <SelectValue placeholder="日志类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                <SelectItem value="game">游戏日志</SelectItem>
                <SelectItem value="admin">管理日志</SelectItem>
                <SelectItem value="security">安全日志</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="严重性" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有级别</SelectItem>
                <SelectItem value="low">低</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">每页显示:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              导出选中日志
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日志表格 */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input 
                      type="checkbox" 
                      checked={selectedLogs.length === filteredLogs.length && filteredLogs.length > 0}
                      onChange={selectAllLogs}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>IP地址</TableHead>
                  <TableHead>详情</TableHead>
                  <TableHead>重要性</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        checked={selectedLogs.includes(log.id)}
                        onChange={() => toggleLogSelection(log.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeDisplay(log.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.username}</div>
                        <div className="text-xs text-muted-foreground">{log.userId}</div>
                      </div>
                    </TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm">{log.details}</div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* 分页控制 */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>共 {totalLogs} 条记录</span>
              <span>•</span>
              <span>第 {currentPage} 页，共 {totalPages} 页</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNumber = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className="w-8"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogManagement;