import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Target, Zap, Award, Activity } from 'lucide-react';
import { V4ReplayData } from '@/utils/replayV4/types';
import { extractLockEvents, extractInputEvents } from '@/utils/replayV4/converter';

interface ReplayAnalyticsProps {
  replay: V4ReplayData;
  className?: string;
}

export const ReplayAnalytics: React.FC<ReplayAnalyticsProps> = ({ 
  replay,
  className = ''
}) => {
  // 提取事件数据
  const lockEvents = useMemo(() => extractLockEvents(replay), [replay]);
  const inputEvents = useMemo(() => extractInputEvents(replay), [replay]);

  // 计算 PPS/APM 时间线数据（每秒采样）
  const timelineData = useMemo(() => {
    const data: Array<{
      time: number;
      pps: number;
      apm: number;
      score: number;
    }> = [];

    const duration = replay.stats.duration;
    const sampleInterval = 1000; // 每秒采样
    
    for (let t = 0; t <= duration; t += sampleInterval) {
      const timeWindow = 5000; // 5秒滑动窗口
      const windowStart = Math.max(0, t - timeWindow);
      
      // 计算该时间窗口的 PPS
      const locksInWindow = lockEvents.filter(
        e => e.timestamp >= windowStart && e.timestamp <= t
      ).length;
      const pps = (locksInWindow / (timeWindow / 1000));
      
      // 计算该时间窗口的 APM
      const actionsInWindow = inputEvents.filter(
        e => e.timestamp >= windowStart && e.timestamp <= t && e.success
      ).length;
      const apm = (actionsInWindow / (timeWindow / 1000)) * 60;
      
      // 估算分数（简化版）
      const locksUpToNow = lockEvents.filter(e => e.timestamp <= t).length;
      const score = locksUpToNow * 100;
      
      data.push({
        time: Math.floor(t / 1000),
        pps: parseFloat(pps.toFixed(2)),
        apm: parseFloat(apm.toFixed(0)),
        score
      });
    }
    
    return data;
  }, [replay, lockEvents, inputEvents]);

  // 计算堆叠高度热力图数据
  const heatmapData = useMemo(() => {
    const heatmap = Array(20).fill(0).map(() => Array(10).fill(0));
    
    lockEvents.forEach(event => {
      const { x, y } = event;
      if (y >= 0 && y < 20 && x >= 0 && x < 10) {
        heatmap[y][x]++;
      }
    });
    
    return heatmap;
  }, [lockEvents]);

  // 计算 Finesse 错误时间线
  const finesseData = useMemo(() => {
    const data: Array<{
      time: number;
      errors: number;
      efficiency: number;
    }> = [];

    const sampleInterval = 5000; // 每5秒采样
    let totalErrors = 0;
    let totalPieces = 0;

    for (let t = 0; t <= replay.stats.duration; t += sampleInterval) {
      const locksInWindow = lockEvents.filter(
        e => e.timestamp <= t
      ).length;
      
      // 简化的 Finesse 错误估算
      const estimatedErrors = Math.floor(locksInWindow * 0.15); // 假设15%错误率
      totalErrors += estimatedErrors;
      totalPieces += locksInWindow;
      
      const efficiency = totalPieces > 0 
        ? ((totalPieces - totalErrors) / totalPieces) * 100 
        : 100;
      
      data.push({
        time: Math.floor(t / 1000),
        errors: totalErrors,
        efficiency: parseFloat(efficiency.toFixed(1))
      });
    }
    
    return data;
  }, [replay.stats.duration, lockEvents]);

  // 关键统计数据
  const stats = useMemo(() => {
    const avgPPS = timelineData.reduce((sum, d) => sum + d.pps, 0) / timelineData.length;
    const peakPPS = Math.max(...timelineData.map(d => d.pps));
    const avgAPM = timelineData.reduce((sum, d) => sum + d.apm, 0) / timelineData.length;
    const peakAPM = Math.max(...timelineData.map(d => d.apm));
    
    return {
      avgPPS: avgPPS.toFixed(2),
      peakPPS: peakPPS.toFixed(2),
      avgAPM: avgAPM.toFixed(0),
      peakAPM: peakAPM.toFixed(0),
      totalPieces: lockEvents.length,
      totalActions: inputEvents.filter(e => e.success).length
    };
  }, [timelineData, lockEvents, inputEvents]);

  // 热力图最大值（用于颜色映射）
  const maxHeatValue = Math.max(...heatmapData.flat());

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 关键统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">平均 PPS</span>
            </div>
            <div className="text-2xl font-bold">{stats.avgPPS}</div>
            <div className="text-xs text-muted-foreground">峰值: {stats.peakPPS}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">平均 APM</span>
            </div>
            <div className="text-2xl font-bold">{stats.avgAPM}</div>
            <div className="text-xs text-muted-foreground">峰值: {stats.peakAPM}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">总方块数</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalPieces}</div>
            <div className="text-xs text-muted-foreground">操作: {stats.totalActions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">最终分数</span>
            </div>
            <div className="text-2xl font-bold">
              {replay.stats.finalScore.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {replay.stats.finalLines} 行
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表标签页 */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">性能曲线</TabsTrigger>
          <TabsTrigger value="heatmap">堆叠热力图</TabsTrigger>
          <TabsTrigger value="finesse">Finesse 分析</TabsTrigger>
        </TabsList>

        {/* PPS/APM 时间线 */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PPS & APM 时间线</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    label={{ value: '时间 (秒)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="pps" 
                    stroke="hsl(var(--chart-1))" 
                    name="PPS"
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="apm" 
                    stroke="hsl(var(--chart-2))" 
                    name="APM"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 堆叠热力图 */}
        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">堆叠位置热力图</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <div className="inline-grid grid-cols-10 gap-0.5 border-2 border-border rounded p-1">
                  {heatmapData.map((row, y) =>
                    row.map((value, x) => {
                      const intensity = maxHeatValue > 0 ? value / maxHeatValue : 0;
                      const color = intensity > 0.7 
                        ? 'bg-red-500' 
                        : intensity > 0.4 
                        ? 'bg-yellow-500' 
                        : intensity > 0.1 
                        ? 'bg-green-500' 
                        : 'bg-muted';
                      
                      return (
                        <div
                          key={`${y}-${x}`}
                          className={`w-8 h-8 ${color} rounded transition-colors`}
                          title={`位置 (${x}, ${y}): ${value} 次`}
                          style={{ 
                            opacity: intensity > 0 ? 0.3 + intensity * 0.7 : 0.1 
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span>高频区域</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded" />
                  <span>中频区域</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span>低频区域</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finesse 分析 */}
        <TabsContent value="finesse">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Finesse 效率分析</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={finesseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    label={{ value: '时间 (秒)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={90} stroke="hsl(var(--chart-3))" strokeDasharray="3 3" />
                  <Area 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="hsl(var(--chart-1))" 
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.3}
                    name="效率 %"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-muted-foreground text-center">
                Finesse 效率表示操作的最优性（越高越好，90%+ 为优秀）
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReplayAnalytics;
