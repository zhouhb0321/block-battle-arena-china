
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Globe, DollarSign, Settings, AlertTriangle } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [ads, setAds] = useState([
    {
      id: '1',
      title: '示例广告 - 中国区',
      content: '这是一个面向中国用户的广告内容',
      position: 'left' as const,
      region: 'CN',
      language: 'zh',
      isActive: true,
      targetUrl: 'https://example.com/cn',
      imageUrl: '/placeholder.svg'
    },
    {
      id: '2', 
      title: 'Sample Ad - US',
      content: 'This is an ad targeted for US users',
      position: 'right' as const,
      region: 'US',
      language: 'en',
      isActive: true,
      targetUrl: 'https://example.com/us',
      imageUrl: '/placeholder.svg'
    }
  ]);

  const [paymentSettings, setPaymentSettings] = useState({
    alipayAccount: '',
    paypalAccount: '',
    preferredCurrency: 'USD',
    autoWithdraw: false,
    withdrawThreshold: 100
  });

  const regions = [
    { code: 'CN', name: '中国', flag: '🇨🇳' },
    { code: 'US', name: '美国', flag: '🇺🇸' },
    { code: 'JP', name: '日本', flag: '🇯🇵' },
    { code: 'KR', name: '韩国', flag: '🇰🇷' },
    { code: 'TW', name: '台湾', flag: '🇹🇼' },
    { code: 'GLOBAL', name: '全球', flag: '🌍' }
  ];

  const languages = [
    { code: 'zh', name: '简体中文' },
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' }
  ];

  const handleAdUpdate = (adId: string, updates: any) => {
    setAds(prev => prev.map(ad => 
      ad.id === adId ? { ...ad, ...updates } : ad
    ));
  };

  const handlePaymentUpdate = (field: string, value: any) => {
    setPaymentSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">管理员控制面板</h1>
        </div>
        <p className="text-gray-600">系统管理和配置中心</p>
      </div>

      <Tabs defaultValue="ads" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ads">广告管理</TabsTrigger>
          <TabsTrigger value="payments">支付设置</TabsTrigger>
          <TabsTrigger value="system">系统设置</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                区域化广告管理
              </CardTitle>
              <CardDescription>
                根据用户地区和语言配置不同的广告内容
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {ads.map((ad) => (
                  <Card key={ad.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`title-${ad.id}`}>广告标题</Label>
                            <Input
                              id={`title-${ad.id}`}
                              value={ad.title}
                              onChange={(e) => handleAdUpdate(ad.id, { title: e.target.value })}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`content-${ad.id}`}>广告内容</Label>
                            <Textarea
                              id={`content-${ad.id}`}
                              value={ad.content}
                              onChange={(e) => handleAdUpdate(ad.id, { content: e.target.value })}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`url-${ad.id}`}>目标链接</Label>
                            <Input
                              id={`url-${ad.id}`}
                              value={ad.targetUrl}
                              onChange={(e) => handleAdUpdate(ad.id, { targetUrl: e.target.value })}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label>目标区域</Label>
                            <Select 
                              value={ad.region} 
                              onValueChange={(value) => handleAdUpdate(ad.id, { region: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {regions.map((region) => (
                                  <SelectItem key={region.code} value={region.code}>
                                    <span className="flex items-center gap-2">
                                      <span>{region.flag}</span>
                                      <span>{region.name}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>目标语言</Label>
                            <Select 
                              value={ad.language} 
                              onValueChange={(value) => handleAdUpdate(ad.id, { language: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {languages.map((lang) => (
                                  <SelectItem key={lang.code} value={lang.code}>
                                    {lang.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>广告位置</Label>
                            <Select 
                              value={ad.position} 
                              onValueChange={(value) => handleAdUpdate(ad.id, { position: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">左侧</SelectItem>
                                <SelectItem value="right">右侧</SelectItem>
                                <SelectItem value="top">顶部</SelectItem>
                                <SelectItem value="bottom">底部</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`active-${ad.id}`}
                              checked={ad.isActive}
                              onCheckedChange={(checked) => handleAdUpdate(ad.id, { isActive: checked })}
                            />
                            <Label htmlFor={`active-${ad.id}`}>启用广告</Label>
                          </div>
                          
                          <div className="flex gap-2">
                            <Badge variant={ad.isActive ? "default" : "secondary"}>
                              {ad.isActive ? '活跃' : '停用'}
                            </Badge>
                            <Badge variant="outline">
                              {regions.find(r => r.code === ad.region)?.flag} {ad.region}
                            </Badge>
                            <Badge variant="outline">
                              {languages.find(l => l.code === ad.language)?.name}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Button className="w-full">
                  + 添加新广告
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                支付账户设置
              </CardTitle>
              <CardDescription>
                配置支付宝和PayPal账户信息用于收入提取
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">支付宝设置</h3>
                  <div>
                    <Label htmlFor="alipay">支付宝账户</Label>
                    <Input
                      id="alipay"
                      type="email"
                      placeholder="your-email@example.com"
                      value={paymentSettings.alipayAccount}
                      onChange={(e) => handlePaymentUpdate('alipayAccount', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">PayPal设置</h3>
                  <div>
                    <Label htmlFor="paypal">PayPal账户</Label>
                    <Input
                      id="paypal"
                      type="email"
                      placeholder="paypal@example.com"
                      value={paymentSettings.paypalAccount}
                      onChange={(e) => handlePaymentUpdate('paypalAccount', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>首选货币</Label>
                  <Select 
                    value={paymentSettings.preferredCurrency} 
                    onValueChange={(value) => handlePaymentUpdate('preferredCurrency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">美元 (USD)</SelectItem>
                      <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                      <SelectItem value="EUR">欧元 (EUR)</SelectItem>
                      <SelectItem value="JPY">日元 (JPY)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="threshold">自动提取阈值</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={paymentSettings.withdrawThreshold}
                    onChange={(e) => handlePaymentUpdate('withdrawThreshold', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="flex items-end">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-withdraw"
                      checked={paymentSettings.autoWithdraw}
                      onCheckedChange={(checked) => handlePaymentUpdate('autoWithdraw', checked)}
                    />
                    <Label htmlFor="auto-withdraw">自动提取</Label>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-800">安全提醒</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      支付账户信息将加密存储。建议定期更改密码并启用双重认证。
                    </p>
                  </div>
                </div>
              </div>
              
              <Button className="w-full">
                保存支付设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                系统配置
              </CardTitle>
              <CardDescription>
                全局系统设置和维护选项
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">广告系统</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>启用广告系统</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>区域化广告</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>广告点击统计</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold">收入系统</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>启用捐赠功能</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>显示收入统计</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>自动生成报告</Label>
                      <Switch />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-4">系统维护</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline">
                    清理缓存
                  </Button>
                  <Button variant="outline">
                    重新加载广告
                  </Button>
                  <Button variant="outline">
                    导出数据
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
