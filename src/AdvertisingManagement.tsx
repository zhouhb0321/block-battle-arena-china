import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Advertisement {
  id: string;
  title: string;
  content: string;
  start_date: string;
  end_date: string;
  position: string;
  region: string;
  language: string;
  is_active: boolean;
  impressions: number;
  clicks: number;
  target_url?: string;
  image_url?: string;
}

const AdvertisingManagement: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    start_date: '',
    end_date: '',
    position: 'header',
    region: '全球',
    language: 'zh',
    target_url: '',
    image_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
      toast({
        title: "错误",
        description: "获取广告数据失败",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAd = async () => {
    if (!formData.title || !formData.content || !formData.start_date || !formData.end_date) {
      toast({
        title: "错误",
        description: "请填写所有必填字段",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('advertisements')
        .insert([{
          ...formData,
          is_active: true,
          impressions: 0,
          clicks: 0
        }]);

      if (error) throw error;

      toast({
        title: "成功",
        description: "广告创建成功"
      });

      setFormData({
        title: '',
        content: '',
        start_date: '',
        end_date: '',
        position: 'header',
        region: '全球',
        language: 'zh',
        target_url: '',
        image_url: ''
      });

      fetchAds();
    } catch (error) {
      console.error('Error creating ad:', error);
      toast({
        title: "错误",
        description: "创建广告失败",
        variant: "destructive"
      });
    }
  };

  const handleToggleAd = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "成功",
        description: `广告已${!isActive ? '启用' : '停用'}`
      });

      fetchAds();
    } catch (error) {
      console.error('Error toggling ad:', error);
      toast({
        title: "错误",
        description: "操作失败",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (isActive: boolean, startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!isActive) return <Badge variant="secondary">已停用</Badge>;
    if (now < start) return <Badge variant="outline">计划中</Badge>;
    if (now > end) return <Badge variant="destructive">已过期</Badge>;
    return <Badge variant="default">投放中</Badge>;
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    return impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
  };

  if (loading) {
    return <div className="flex justify-center p-8">加载广告数据中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">广告管理</h2>
      </div>

      {/* 创建广告表单 */}
      <Card>
        <CardHeader>
          <CardTitle>创建新广告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">广告标题</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="请输入广告标题"
              />
            </div>
            <div>
              <label className="text-sm font-medium">投放位置</label>
              <Select value={formData.position} onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">页面顶部</SelectItem>
                  <SelectItem value="sidebar">侧边栏</SelectItem>
                  <SelectItem value="footer">页面底部</SelectItem>
                  <SelectItem value="popup">弹窗</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">广告内容</label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="请输入广告内容"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">开始时间</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">结束时间</label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">目标地区</label>
              <Input
                value={formData.region}
                onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                placeholder="如: 北京,上海,广州"
              />
            </div>
            <div>
              <label className="text-sm font-medium">语言</label>
              <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">目标链接</label>
              <Input
                value={formData.target_url}
                onChange={(e) => setFormData(prev => ({ ...prev, target_url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">图片链接</label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <Button onClick={handleCreateAd} className="w-full">
            创建广告
          </Button>
        </CardContent>
      </Card>

      {/* 广告列表 */}
      <Card>
        <CardHeader>
          <CardTitle>广告列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>地区</TableHead>
                  <TableHead>语言</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>展示数</TableHead>
                  <TableHead>点击数</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell className="font-medium">{ad.title}</TableCell>
                    <TableCell>{ad.position}</TableCell>
                    <TableCell>{ad.region}</TableCell>
                    <TableCell>{ad.language}</TableCell>
                    <TableCell>
                      {getStatusBadge(ad.is_active, ad.start_date, ad.end_date)}
                    </TableCell>
                    <TableCell>{ad.impressions.toLocaleString()}</TableCell>
                    <TableCell>{ad.clicks.toLocaleString()}</TableCell>
                    <TableCell>{calculateCTR(ad.clicks, ad.impressions)}%</TableCell>
                    <TableCell>
                      <Button
                        variant={ad.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleAd(ad.id, ad.is_active)}
                      >
                        {ad.is_active ? '停用' : '启用'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 统计数据 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{ads.filter(ad => ad.is_active).length}</div>
            <p className="text-sm text-muted-foreground">活跃广告</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {ads.reduce((sum, ad) => sum + ad.impressions, 0).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">总展示数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {ads.reduce((sum, ad) => sum + ad.clicks, 0).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">总点击数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {calculateCTR(
                ads.reduce((sum, ad) => sum + ad.clicks, 0),
                ads.reduce((sum, ad) => sum + ad.impressions, 0)
              )}%
            </div>
            <p className="text-sm text-muted-foreground">平均CTR</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvertisingManagement;