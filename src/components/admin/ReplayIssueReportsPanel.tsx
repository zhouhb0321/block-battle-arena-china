/**
 * 管理员面板 - 回放问题报告管理
 * 查看和处理用户提交的回放不一致报告
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReplayIssueReport {
  id: string;
  replay_id?: string;
  user_id?: string;
  replay_metadata: any;
  total_differences: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  consistency_rate: number;
  differences_summary: any[];
  auto_detected: boolean;
  status?: string;
  reported_at: string;
  resolved_at?: string;
}

export const ReplayIssueReportsPanel: React.FC = () => {
  const [reports, setReports] = useState<ReplayIssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  
  useEffect(() => {
    fetchReports();
  }, [filter]);
  
  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('replay_issue_reports')
        .select('*')
        .order('reported_at', { ascending: false });
      
      if (filter === 'pending') {
        query = query.is('resolved_at', null);
      } else if (filter === 'resolved') {
        query = query.not('resolved_at', 'is', null);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('获取报告失败:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const markAsResolved = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('replay_issue_reports')
        .update({ resolved_at: new Date().toISOString(), status: 'resolved' })
        .eq('id', reportId);
      
      if (error) throw error;
      fetchReports();
    } catch (err) {
      console.error('标记为已解决失败:', err);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          回放问题报告
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="pending">待处理</TabsTrigger>
            <TabsTrigger value="resolved">已解决</TabsTrigger>
          </TabsList>
          
          <TabsContent value={filter} className="mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无{filter === 'pending' ? '待处理' : filter === 'resolved' ? '已解决' : ''}报告
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {reports.map(report => (
                    <Card key={report.id} className="p-4">
                      <div className="space-y-3">
                        {/* 头部 */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold">
                              {report.replay_metadata?.username || '未知用户'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(report.reported_at).toLocaleString('zh-CN')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {report.auto_detected && (
                              <Badge variant="outline">自动检测</Badge>
                            )}
                            {report.resolved_at ? (
                              <Badge variant="secondary">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                已解决
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <Clock className="w-3 h-3 mr-1" />
                                待处理
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* 统计 */}
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="text-xs text-muted-foreground">总差异</div>
                            <div className="font-semibold">{report.total_differences}</div>
                          </div>
                          <div className="text-center p-2 bg-destructive/10 rounded">
                            <div className="text-xs text-muted-foreground">严重</div>
                            <div className="font-semibold text-destructive">{report.critical_count}</div>
                          </div>
                          <div className="text-center p-2 bg-yellow-500/10 rounded">
                            <div className="text-xs text-muted-foreground">警告</div>
                            <div className="font-semibold text-yellow-500">{report.warning_count}</div>
                          </div>
                          <div className="text-center p-2 bg-blue-500/10 rounded">
                            <div className="text-xs text-muted-foreground">一致性</div>
                            <div className="font-semibold text-blue-500">
                              {report.consistency_rate.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        
                        {/* 元数据 */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>游戏模式: {report.replay_metadata?.gameMode}</div>
                          <div>时长: {(report.replay_metadata?.duration / 1000).toFixed(1)}s</div>
                          <div>Seed: {report.replay_metadata?.seed?.slice(0, 16)}...</div>
                        </div>
                        
                        {/* 操作 */}
                        {!report.resolved_at && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsResolved(report.id)}
                            >
                              标记为已解决
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
