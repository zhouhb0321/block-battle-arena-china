
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface AdConfig {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  targetUrl?: string;
  position: 'left' | 'right' | 'top' | 'bottom' | 'popup';
  isActive: boolean;
  displayFrequency: number;
  startDate?: string;
  endDate?: string;
}

interface AdManagerProps {
  ads: AdConfig[];
  onUpdateAd: (ad: AdConfig) => void;
  onDeleteAd: (id: string) => void;
  onCreateAd: (ad: Omit<AdConfig, 'id'>) => void;
}

const AdManager: React.FC<AdManagerProps> = ({ ads, onUpdateAd, onDeleteAd, onCreateAd }) => {
  const [selectedAd, setSelectedAd] = useState<AdConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newAd, setNewAd] = useState<Omit<AdConfig, 'id'>>({
    title: '',
    content: '',
    position: 'left',
    isActive: true,
    displayFrequency: 100
  });

  const positionLabels = {
    left: '左侧',
    right: '右侧',
    top: '顶部',
    bottom: '底部',
    popup: '弹窗'
  };

  const handleCreateAd = () => {
    if (newAd.title && newAd.content) {
      onCreateAd(newAd);
      setNewAd({
        title: '',
        content: '',
        position: 'left',
        isActive: true,
        displayFrequency: 100
      });
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">广告管理</h2>
        <Button onClick={() => setIsCreating(true)}>
          添加广告
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">活跃广告</TabsTrigger>
          <TabsTrigger value="inactive">停用广告</TabsTrigger>
          <TabsTrigger value="analytics">统计数据</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid gap-4">
            {ads.filter(ad => ad.isActive).map((ad) => (
              <Card key={ad.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {ad.title}
                        <Badge variant="secondary">
                          {positionLabels[ad.position]}
                        </Badge>
                        <Badge variant={ad.isActive ? "default" : "secondary"}>
                          {ad.isActive ? '活跃' : '停用'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        显示频率: {ad.displayFrequency}%
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAd(ad)}
                      >
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeleteAd(ad.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>内容:</strong> {ad.content}
                    </div>
                    {ad.targetUrl && (
                      <div className="text-sm">
                        <strong>链接:</strong> {ad.targetUrl}
                      </div>
                    )}
                    {ad.startDate && ad.endDate && (
                      <div className="text-sm text-muted-foreground">
                        {ad.startDate} - {ad.endDate}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inactive">
          <div className="grid gap-4">
            {ads.filter(ad => !ad.isActive).map((ad) => (
              <Card key={ad.id} className="opacity-60">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {ad.title}
                        <Badge variant="secondary">已停用</Badge>
                      </CardTitle>
                      <CardDescription>{ad.content}</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onUpdateAd({ ...ad, isActive: true })}
                    >
                      启用
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>总展示次数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">12,345</div>
                <div className="text-sm text-muted-foreground">本月</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>点击次数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">567</div>
                <div className="text-sm text-muted-foreground">CTR: 4.6%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>活跃广告</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{ads.filter(ad => ad.isActive).length}</div>
                <div className="text-sm text-muted-foreground">共 {ads.length} 个</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 创建/编辑广告对话框 */}
      {(isCreating || selectedAd) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {isCreating ? '创建广告' : '编辑广告'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  value={isCreating ? newAd.title : selectedAd?.title || ''}
                  onChange={(e) => {
                    if (isCreating) {
                      setNewAd(prev => ({ ...prev, title: e.target.value }));
                    } else if (selectedAd) {
                      setSelectedAd({ ...selectedAd, title: e.target.value });
                    }
                  }}
                />
              </div>
              
              <div>
                <Label htmlFor="content">内容</Label>
                <Textarea
                  id="content"
                  value={isCreating ? newAd.content : selectedAd?.content || ''}
                  onChange={(e) => {
                    if (isCreating) {
                      setNewAd(prev => ({ ...prev, content: e.target.value }));
                    } else if (selectedAd) {
                      setSelectedAd({ ...selectedAd, content: e.target.value });
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="position">位置</Label>
                <select
                  id="position"
                  className="w-full p-2 border rounded"
                  value={isCreating ? newAd.position : selectedAd?.position || 'left'}
                  onChange={(e) => {
                    const position = e.target.value as AdConfig['position'];
                    if (isCreating) {
                      setNewAd(prev => ({ ...prev, position }));
                    } else if (selectedAd) {
                      setSelectedAd({ ...selectedAd, position });
                    }
                  }}
                >
                  {Object.entries(positionLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="frequency">显示频率 (%)</Label>
                <Input
                  id="frequency"
                  type="number"
                  min="0"
                  max="100"
                  value={isCreating ? newAd.displayFrequency : selectedAd?.displayFrequency || 100}
                  onChange={(e) => {
                    const frequency = parseInt(e.target.value);
                    if (isCreating) {
                      setNewAd(prev => ({ ...prev, displayFrequency: frequency }));
                    } else if (selectedAd) {
                      setSelectedAd({ ...selectedAd, displayFrequency: frequency });
                    }
                  }}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={isCreating ? newAd.isActive : selectedAd?.isActive || false}
                  onCheckedChange={(checked) => {
                    if (isCreating) {
                      setNewAd(prev => ({ ...prev, isActive: checked }));
                    } else if (selectedAd) {
                      setSelectedAd({ ...selectedAd, isActive: checked });
                    }
                  }}
                />
                <Label htmlFor="active">启用广告</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    if (isCreating) {
                      handleCreateAd();
                    } else if (selectedAd) {
                      onUpdateAd(selectedAd);
                      setSelectedAd(null);
                    }
                  }}
                  className="flex-1"
                >
                  {isCreating ? '创建' : '保存'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedAd(null);
                  }}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdManager;
