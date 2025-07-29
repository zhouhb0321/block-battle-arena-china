import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LogEntry {
  id: string;
  timestamp: string;
  event_message: string;
  error_severity?: string;
}

const AdminLogsPanel: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'ERROR' | 'LOG'>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // 使用 admin_activity_logs 作为示例日志表
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('id, created_at, action_type, details')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('获取日志失败:', error);
        return;
      }

      const formattedLogs: LogEntry[] = data?.map((log: any) => ({
        id: log.id,
        timestamp: log.created_at,
        event_message: `${log.action_type}: ${JSON.stringify(log.details)}`,
        error_severity: 'LOG',
      })) || [];

      setLogs(formattedLogs);
    } catch (error) {
      console.error('获取日志异常:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.event_message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || log.error_severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) / 1000).toLocaleString();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索日志..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={severityFilter} onValueChange={(value: any) => setSeverityFilter(value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="严重程度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="ERROR">错误</SelectItem>
            <SelectItem value="LOG">日志</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={fetchLogs} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <ScrollArea className="h-[500px] border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">时间</TableHead>
              <TableHead className="w-24">级别</TableHead>
              <TableHead>消息</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs">
                  {formatTimestamp(log.timestamp)}
                </TableCell>
                <TableCell>
                  <Badge variant={log.error_severity === 'ERROR' ? 'destructive' : 'default'}>
                    {log.error_severity || 'LOG'}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{log.event_message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      
      <div className="text-sm text-muted-foreground">
        显示 {filteredLogs.length} 条日志记录
      </div>
    </div>
  );
};

export default AdminLogsPanel;