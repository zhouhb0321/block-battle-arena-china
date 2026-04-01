import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Bug, Lightbulb, HelpCircle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Feedback {
  id: string;
  user_id: string | null;
  username: string | null;
  feedback_type: string;
  content: string;
  page: string | null;
  app_version: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const FeedbackPanel: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_feedback' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any;

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (e) {
      console.error('Failed to load feedbacks:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updateData: any = { status };
      if (notes !== undefined) updateData.admin_notes = notes;

      const { error } = await supabase
        .from('user_feedback' as any)
        .update(updateData)
        .eq('id', id) as any;

      if (error) throw error;
      toast.success('状态已更新');
      setEditingId(null);
      loadFeedbacks();
    } catch (e) {
      console.error('Update failed:', e);
      toast.error('更新失败');
    }
  };

  const filtered = feedbacks.filter(f => {
    if (filter !== 'all' && f.feedback_type !== filter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    return true;
  });

  const typeIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug className="w-4 h-4 text-red-500" />;
      case 'suggestion': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      default: return <HelpCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      reviewed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${variants[status] || ''}`}>{status}</span>;
  };

  const counts = {
    total: feedbacks.length,
    new: feedbacks.filter(f => f.status === 'new').length,
    bug: feedbacks.filter(f => f.feedback_type === 'bug').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{counts.total}</div>
            <p className="text-xs text-muted-foreground">总反馈</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{counts.new}</div>
            <p className="text-xs text-muted-foreground">待处理</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-600">{counts.bug}</div>
            <p className="text-xs text-muted-foreground">Bug报告</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="suggestion">建议</SelectItem>
            <SelectItem value="other">其他</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="new">新反馈</SelectItem>
            <SelectItem value="reviewed">已查看</SelectItem>
            <SelectItem value="resolved">已解决</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadFeedbacks} className="ml-auto gap-1">
          <RefreshCw className="w-3.5 h-3.5" />
          刷新
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            暂无反馈
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((fb) => (
            <Card key={fb.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {typeIcon(fb.feedback_type)}
                    <span className="font-medium text-sm">{fb.username || '匿名用户'}</span>
                    {statusBadge(fb.status)}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {fb.app_version && <span className="mr-2">v{fb.app_version}</span>}
                    {new Date(fb.created_at).toLocaleString()}
                  </div>
                </div>

                <p className="text-sm whitespace-pre-wrap">{fb.content}</p>

                {fb.page && <p className="text-xs text-muted-foreground">页面: {fb.page}</p>}

                {fb.admin_notes && (
                  <div className="bg-muted/50 rounded p-2 text-xs">
                    <strong>管理员备注:</strong> {fb.admin_notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {fb.status === 'new' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(fb.id, 'reviewed')}>
                      标记已查看
                    </Button>
                  )}
                  {fb.status !== 'resolved' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(fb.id, 'resolved')}>
                      标记已解决
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(editingId === fb.id ? null : fb.id);
                      setAdminNotes(fb.admin_notes || '');
                    }}
                  >
                    备注
                  </Button>
                </div>

                {editingId === fb.id && (
                  <div className="flex gap-2">
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="添加管理员备注..."
                      className="text-sm h-16 resize-none"
                    />
                    <Button size="sm" onClick={() => updateStatus(fb.id, fb.status, adminNotes)}>
                      保存
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackPanel;
