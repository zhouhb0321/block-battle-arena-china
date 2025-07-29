import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, DollarSign, Users, TrendingUp, Calendar } from 'lucide-react';

interface Subscriber {
  id: string;
  user_id: string;
  username: string;
  email: string;
  subscription_tier: 'free' | 'basic' | 'premium' | 'vip';
  subscribed: boolean;
  subscription_end: string;
  created_at: string;
  updated_at: string;
  stripe_customer_id?: string;
}

interface RevenueData {
  month: string;
  revenue: number;
  subscribers: number;
}

interface PaymentRecord {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  payment_type: 'subscription' | 'donation' | 'upgrade';
  payment_date: string;
  status: 'completed' | 'pending' | 'failed';
}

const RevenueManagement: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const { toast } = useToast();
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);

  useEffect(() => {
    fetchSubscribers();
    fetchPaymentRecords();
    fetchRevenueData();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select(`
          *,
          user_profiles(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSubscribers = data?.map(sub => ({
        id: sub.id,
        user_id: sub.user_id,
        username: sub.user_profiles?.username || 'Unknown',
        email: sub.email,
        subscription_tier: sub.subscription_tier || 'free',
        subscribed: sub.subscribed,
        subscription_end: sub.subscription_end,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
        stripe_customer_id: sub.stripe_customer_id
      })) || [];

      setSubscribers(formattedSubscribers);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      toast({
        title: "错误",
        description: "获取订阅用户数据失败",
        variant: "destructive"
      });
    }
  };

  const fetchPaymentRecords = async () => {
    // 这里需要根据实际的支付记录表来实现
    // 目前使用模拟数据
    const mockPayments: PaymentRecord[] = [
      {
        id: 'pay001',
        user_id: 'user001',
        username: 'player1',
        amount: 99,
        payment_type: 'subscription',
        payment_date: '2023-06-15T10:30:00Z',
        status: 'completed'
      },
      {
        id: 'pay002',
        user_id: 'user002',
        username: 'player2',
        amount: 199,
        payment_type: 'subscription',
        payment_date: '2023-06-14T14:20:00Z',
        status: 'completed'
      }
    ];
    setPaymentRecords(mockPayments);
  };

  const fetchRevenueData = async () => {
    // 这里需要根据实际需求从数据库聚合收入数据
    const mockRevenueData: RevenueData[] = [
      { month: '2023-01', revenue: 12000, subscribers: 120 },
      { month: '2023-02', revenue: 15000, subscribers: 150 },
      { month: '2023-03', revenue: 18000, subscribers: 180 },
      { month: '2023-04', revenue: 14000, subscribers: 140 },
      { month: '2023-05', revenue: 21000, subscribers: 210 },
      { month: '2023-06', revenue: 19000, subscribers: 190 }
    ];
    setRevenueData(mockRevenueData);
    setLoading(false);
  };

  const filteredSubscribers = subscribers.filter(subscriber => {
    const matchesSearch = !searchTerm || 
      subscriber.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscriber.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTier = filterTier === 'all' || subscriber.subscription_tier === filterTier;
    
    return matchesSearch && matchesTier;
  });
  const handleAdjustSubscription = async (userId: string) => {
    try {
      // 这里实现调整用户订阅的逻辑
      toast({
        title: "成功",
        description: `已调整用户 ${userId} 的订阅状态`
      });
    } catch (error) {
      console.error('Error adjusting subscription:', error);
      toast({
        title: "错误",
        description: "调整订阅状态失败",
        variant: "destructive"
      });
    }
  };

  const handleSendRenewalReminder = async (userId: string) => {
    try {
      // 这里实现发送续费提醒的逻辑
      toast({
        title: "成功",
        description: `已向用户发送续费提醒`
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "错误",
        description: "发送提醒失败",
        variant: "destructive"
      });
    }
  };

  const getTierDisplay = (tier: string) => {
    const tiers: { [key: string]: string } = {
      'free': '免费用户',
      'basic': '基础版',
      'premium': '高级版',
      'vip': 'VIP版'
    };
    return tiers[tier] || tier;
  };

  const getTierBadge = (tier: string, subscribed: boolean) => {
    if (!subscribed) return <Badge variant="secondary">未订阅</Badge>;
    
    switch (tier) {
      case 'basic': return <Badge variant="outline">基础版</Badge>;
      case 'premium': return <Badge variant="default">高级版</Badge>;
      case 'vip': return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">VIP</Badge>;
      default: return <Badge variant="secondary">{tier}</Badge>;
    }
  };

  const calculateStats = () => {
    const totalSubscribers = subscribers.length;
    const activeSubscribers = subscribers.filter(s => s.subscribed).length;
    const totalRevenue = paymentRecords
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    const monthlyRevenue = revenueData.length > 0 ? 
      revenueData[revenueData.length - 1].revenue : 0;

    return { totalSubscribers, activeSubscribers, totalRevenue, monthlyRevenue };
  };

  const stats = calculateStats();

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return <div className="flex justify-center p-8">加载收入管理数据中...</div>;
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">收入管理</h2>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.totalSubscribers}</div>
                <p className="text-sm text-muted-foreground">订阅用户总数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.activeSubscribers}</div>
                <p className="text-sm text-muted-foreground">活跃订阅用户</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">¥{stats.totalRevenue.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">总收入</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold">¥{stats.monthlyRevenue.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">本月收入</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscribers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subscribers">订阅用户</TabsTrigger>
          <TabsTrigger value="payments">支付记录</TabsTrigger>
          <TabsTrigger value="analytics">收入分析</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-4">
          {/* 搜索和过滤 */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索用户名或邮箱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div>
                  <select
                    value={filterTier}
                    onChange={(e) => setFilterTier(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="all">所有订阅层级</option>
                    <option value="free">免费用户</option>
                    <option value="basic">基础版</option>
                    <option value="premium">高级版</option>
                    <option value="vip">VIP版</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    导出
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 订阅用户列表 */}
          <Card>
            <CardHeader>
              <CardTitle>订阅用户列表 ({filteredSubscribers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>订阅层级</TableHead>
                      <TableHead>订阅状态</TableHead>
                      <TableHead>到期时间</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscribers.map((subscriber) => (
                      <TableRow key={subscriber.id}>
                        <TableCell className="font-medium">{subscriber.username}</TableCell>
                        <TableCell>{subscriber.email}</TableCell>
                        <TableCell>
                          {getTierBadge(subscriber.subscription_tier, subscriber.subscribed)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={subscriber.subscribed ? "default" : "secondary"}>
                            {subscriber.subscribed ? '已订阅' : '未订阅'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {subscriber.subscription_end ? 
                            formatDateTime(subscriber.subscription_end) : '-'}
                        </TableCell>
                        <TableCell>{formatDateTime(subscriber.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdjustSubscription(subscriber.user_id)}
                            >
                              调整权益
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendRenewalReminder(subscriber.user_id)}
                            >
                              续费提醒
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>支付记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户名</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>支付类型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>支付时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentRecords.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.username}</TableCell>
                        <TableCell>¥{payment.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.payment_type === 'subscription' ? '订阅' : 
                             payment.payment_type === 'donation' ? '捐赠' : '升级'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            payment.status === 'completed' ? 'default' :
                            payment.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {payment.status === 'completed' ? '已完成' :
                             payment.status === 'pending' ? '处理中' : '失败'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(payment.payment_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>月度收入趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueData.map((data, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">{data.month}</div>
                      <div className="text-sm text-muted-foreground">{data.subscribers} 订阅用户</div>
                    </div>
                    <div className="text-lg font-bold">¥{data.revenue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RevenueManagement;