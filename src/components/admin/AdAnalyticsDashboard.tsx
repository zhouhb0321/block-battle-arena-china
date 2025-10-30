import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAdAnalytics } from '@/utils/adAnalytics';

interface AdAnalyticsDashboardProps {
  adId: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const AdAnalyticsDashboard: React.FC<AdAnalyticsDashboardProps> = ({ adId }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  useEffect(() => {
    fetchAnalytics();
  }, [adId, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getAdAnalytics(adId, dateRange.start, dateRange.end);
      
      // Process data for charts
      const timeSeriesData = processTimeSeriesData(data);
      const deviceData = processDeviceData(data);
      const regionData = processRegionData(data);

      setAnalytics({
        ...data,
        timeSeriesData,
        deviceData,
        regionData
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTimeSeriesData = (data: any) => {
    const dailyData: { [key: string]: { impressions: number; clicks: number } } = {};

    data.impressions?.forEach((imp: any) => {
      const date = new Date(imp.timestamp).toLocaleDateString();
      if (!dailyData[date]) dailyData[date] = { impressions: 0, clicks: 0 };
      dailyData[date].impressions++;
    });

    data.clicks?.forEach((click: any) => {
      const date = new Date(click.timestamp).toLocaleDateString();
      if (!dailyData[date]) dailyData[date] = { impressions: 0, clicks: 0 };
      dailyData[date].clicks++;
    });

    return Object.entries(dailyData).map(([date, values]) => ({
      date,
      ...values
    }));
  };

  const processDeviceData = (data: any) => {
    const deviceCounts: { [key: string]: number } = {};
    
    data.impressions?.forEach((imp: any) => {
      const device = imp.device_type || 'unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    return Object.entries(deviceCounts).map(([name, value]) => ({
      name,
      value
    }));
  };

  const processRegionData = (data: any) => {
    const regionCounts: { [key: string]: number } = {};
    
    data.impressions?.forEach((imp: any) => {
      const region = imp.region || 'unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    return Object.entries(regionCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  if (loading) {
    return <div className="text-center p-8">加载中...</div>;
  }

  if (!analytics) {
    return <div className="text-center p-8">暂无数据</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>总展示次数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalImpressions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>总点击次数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalClicks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>点击率 (CTR)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.ctr.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>时间趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="impressions" stroke="hsl(var(--chart-1))" name="展示" />
              <Line type="monotone" dataKey="clicks" stroke="hsl(var(--chart-2))" name="点击" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Device and Region Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>设备类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--chart-1))"
                  dataKey="value"
                >
                  {analytics.deviceData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>地区分布 (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.regionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdAnalyticsDashboard;
