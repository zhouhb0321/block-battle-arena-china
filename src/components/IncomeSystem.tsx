
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Heart, TrendingUp, Gift, Users, Calendar } from 'lucide-react';

const IncomeSystem: React.FC = () => {
  const { t } = useLanguage();
  const [donationAmount, setDonationAmount] = useState('');

  // Mock data - in real app this would come from backend
  const incomeData = {
    totalIncome: 12450.50,
    adRevenue: 8230.30,
    donations: 4220.20,
    monthlyGrowth: 15.2,
    topDonors: [
      { name: 'Anonymous', amount: 500, date: '2024-01-15' },
      { name: 'TetrisLover', amount: 200, date: '2024-01-10' },
      { name: 'BlockMaster', amount: 150, date: '2024-01-08' },
    ],
    adMetrics: {
      impressions: 125000,
      clicks: 2500,
      ctr: 2.0,
      rpm: 6.58
    }
  };

  const handleDonation = () => {
    // In real app, integrate with payment processor
    console.log('Processing donation:', donationAmount);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">收入管理系统</h2>
        <p className="text-gray-600">管理广告收入和用户捐赠</p>
      </div>

      {/* Income Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('income.total')}</p>
                <p className="text-2xl font-bold">${incomeData.totalIncome.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('income.ads')}</p>
                <p className="text-2xl font-bold">${incomeData.adRevenue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('income.donations')}</p>
                <p className="text-2xl font-bold">${incomeData.donations.toLocaleString()}</p>
              </div>
              <Heart className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">月增长率</p>
                <p className="text-2xl font-bold text-green-600">+{incomeData.monthlyGrowth}%</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="donations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="donations">捐赠管理</TabsTrigger>
          <TabsTrigger value="ads">广告收入</TabsTrigger>
        </TabsList>

        <TabsContent value="donations" className="space-y-6">
          {/* Donation Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                支持我们的平台
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">快速捐赠</h4>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[5, 10, 25].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        onClick={() => setDonationAmount(amount.toString())}
                        className="h-12"
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="自定义金额"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md"
                    />
                    <Button onClick={handleDonation} disabled={!donationAmount}>
                      捐赠
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">捐赠用途</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• 服务器维护和升级</li>
                    <li>• 游戏功能开发</li>
                    <li>• 客服支持</li>
                    <li>• 社区活动奖励</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Donors */}
          <Card>
            <CardHeader>
              <CardTitle>感谢榜</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {incomeData.topDonors.map((donor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <span className="font-medium">{donor.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">${donor.amount}</div>
                      <div className="text-sm text-gray-500">{donor.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="space-y-6">
          {/* Ad Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{incomeData.adMetrics.impressions.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">展示次数</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{incomeData.adMetrics.clicks.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">点击次数</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{incomeData.adMetrics.ctr}%</p>
                  <p className="text-sm text-gray-600">点击率</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">${incomeData.adMetrics.rpm}</p>
                  <p className="text-sm text-gray-600">千次展示收入</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ad Performance */}
          <Card>
            <CardHeader>
              <CardTitle>广告位表现</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { position: '左侧边栏', impressions: 45000, clicks: 900, revenue: 295.50 },
                  { position: '右侧边栏', impressions: 48000, clicks: 960, revenue: 316.80 },
                  { position: '游戏内横幅', impressions: 32000, clicks: 640, revenue: 211.20 },
                ].map((ad, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{ad.position}</h4>
                      <p className="text-sm text-gray-600">
                        {ad.impressions.toLocaleString()} 展示 • {ad.clicks.toLocaleString()} 点击
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">${ad.revenue}</p>
                      <p className="text-sm text-gray-600">
                        {((ad.clicks / ad.impressions) * 100).toFixed(2)}% CTR
                      </p>
                    </div>
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

export default IncomeSystem;
