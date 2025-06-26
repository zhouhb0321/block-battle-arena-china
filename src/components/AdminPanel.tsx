
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
import { Shield, Globe, DollarSign, Settings, AlertTriangle, Users, Trophy, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminPanel: React.FC = () => {
  const { t } = useLanguage();
  
  const [ads, setAds] = useState([
    {
      id: '1',
      title: t('ad.placeholder') + ' - 中国区',
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
      title: t('ad.placeholder') + ' - US',
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

  const [rankSettings, setRankSettings] = useState({
    basePoints: 1000,
    winPoints: 25,
    losePoints: 15,
    promotionThreshold: 100,
    demotionThreshold: 50
  });

  const [userStats, setUserStats] = useState({
    totalUsers: 12543,
    activeUsers: 3241,
    premiumUsers: 156,
    totalMatches: 45123
  });

  const regions = [
    { code: 'CN', name: '中国', flag: '🇨🇳' },
    { code: 'US', name: '美国', flag: '🇺🇸' },
    { code: 'JP', name: '日本', flag: '🇯🇵' },
    { code: 'KR', name: '韩国', flag: '🇰🇷' },
    { code: 'TW', name: '台湾', flag: '🇹🇼' },
    { code: 'ES', name: '西班牙', flag: '🇪🇸' },
    { code: 'GLOBAL', name: '全球', flag: '🌍' }
  ];

  const languages = [
    { code: 'zh', name: '简体中文' },
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'es', name: 'Español' }
  ];

  const handleAdUpdate = (adId: string, updates: any) => {
    setAds(prev => prev.map(ad => 
      ad.id === adId ? { ...ad, ...updates } : ad
    ));
  };

  const handlePaymentUpdate = (field: string, value: any) => {
    setPaymentSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleRankUpdate = (field: string, value: any) => {
    setRankSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">{t('admin.panel')}</h1>
        </div>
        <p className="text-gray-600">系统管理和配置中心</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="ads">广告管理</TabsTrigger>
          <TabsTrigger value="payments">支付设置</TabsTrigger>
          <TabsTrigger value="ranking">排位设置</TabsTrigger>
          <TabsTrigger value="system">系统设置</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总用户数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+12% 较上月</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.activeUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">今日在线</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">付费用户</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.premiumUsers}</div>
                <p className="text-xs text-muted-foreground">+5% 较上月</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总对局数</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalMatches.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+24% 较上月</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>管理员功能快速访问</CardTitle>
              <CardDescription>常用管理功能的快捷入口</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Globe className="w-6 h-6 mb-2" />
                  <span>广告管理</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <DollarSign className="w-6 h-6 mb-2" />
                  <span>收入统计</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Trophy className="w-6 h-6 mb-2" />
                  <span>排位设置</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Users className="w-6 h-6 mb-2" />
                  <span>用户管理</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="ranking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                排位系统设置
              </CardTitle>
              <CardDescription>
                配置排位赛的积分规则和晋级要求
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">基础设置</h3>
                  <div>
                    <Label htmlFor="basePoints">初始积分</Label>
                    <Input
                      id="basePoints"
                      type="number"
                      value={rankSettings.basePoints}
                      onChange={(e) => handleRankUpdate('basePoints', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="winPoints">胜利积分</Label>
                    <Input
                      id="winPoints"
                      type="number"
                      value={rankSettings.winPoints}
                      onChange={(e) => handleRankUpdate('winPoints', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="losePoints">失败扣分</Label>
                    <Input
                      id="losePoints"
                      type="number"
                      value={rankSettings.losePoints}
                      onChange={(e) => handleRankUpdate('losePoints', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">晋级设置</h3>
                  <div>
                    <Label htmlFor="promotionThreshold">晋级门槛</Label>
                    <Input
                      id="promotionThreshold"
                      type="number"
                      value={rankSettings.promotionThreshold}
                      onChange={(e) => handleRankUpdate('promotionThreshold', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="demotionThreshold">降级门槛</Label>
                    <Input
                      id="demotionThreshold"
                      type="number"
                      value={rankSettings.demotionThreshold}
                      onChange={(e) => handleRankUpdate('demotionThreshold', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">排位等级说明</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>C-: 0-499</div>
                  <div>C: 500-699</div>
                  <div>C+: 700-899</div>
                  <div>B-: 900-1099</div>
                  <div>B: 1100-1299</div>
                  <div>B+: 1300-1499</div>
                  <div>A-: 1500-1699</div>
                  <div>A: 1700-1899</div>
                  <div>A+: 1900-2099</div>
                  <div>S-: 2100-2299</div>
                  <div>S: 2300-2499</div>
                  <div>S+: 2500-2699</div>
                  <div>SS: 2700-2999</div>
                  <div>X: 3000+</div>
                </div>
              </div>
              
              <Button className="w-full">
                保存排位设置
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
