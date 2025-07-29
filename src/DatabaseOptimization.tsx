import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DatabaseOptimization: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">数据库结构优化</h2>
      </div>

      <Tabs defaultValue="game-session" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="game-session">游戏会话记录</TabsTrigger>
          <TabsTrigger value="ad-structure">广告数据结构</TabsTrigger>
        </TabsList>

        <TabsContent value="game-session" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>游戏会话详细记录表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">game_session_details 表结构</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>字段名</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>约束</TableHead>
                        <TableHead>描述</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">id</TableCell>
                        <TableCell>UUID</TableCell>
                        <TableCell>PK, DEFAULT gen_random_uuid()</TableCell>
                        <TableCell>会话ID</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">user_id</TableCell>
                        <TableCell>UUID</TableCell>
                        <TableCell>NOT NULL</TableCell>
                        <TableCell>用户ID</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">session_start</TableCell>
                        <TableCell>TIMESTAMPTZ</TableCell>
                        <TableCell>NOT NULL</TableCell>
                        <TableCell>会话开始时间</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">session_end</TableCell>
                        <TableCell>TIMESTAMPTZ</TableCell>
                        <TableCell>NULL</TableCell>
                        <TableCell>会话结束时间</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">game_mode</TableCell>
                        <TableCell>TEXT</TableCell>
                        <TableCell>NOT NULL</TableCell>
                        <TableCell>游戏模式</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">events</TableCell>
                        <TableCell>JSONB</TableCell>
                        <TableCell>DEFAULT '[]'::jsonb</TableCell>
                        <TableCell>游戏中的关键事件记录</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">user_actions</TableCell>
                        <TableCell>JSONB</TableCell>
                        <TableCell>DEFAULT '{}'::jsonb</TableCell>
                        <TableCell>用户操作行为分析数据</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">score</TableCell>
                        <TableCell>INTEGER</TableCell>
                        <TableCell>DEFAULT 0</TableCell>
                        <TableCell>最终得分</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">level</TableCell>
                        <TableCell>INTEGER</TableCell>
                        <TableCell>DEFAULT 1</TableCell>
                        <TableCell>达到等级</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">lines_cleared</TableCell>
                        <TableCell>INTEGER</TableCell>
                        <TableCell>DEFAULT 0</TableCell>
                        <TableCell>清除行数</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">duration_seconds</TableCell>
                        <TableCell>INTEGER</TableCell>
                        <TableCell>DEFAULT 0</TableCell>
                        <TableCell>游戏时长(秒)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">pps</TableCell>
                        <TableCell>DECIMAL(5,2)</TableCell>
                        <TableCell>DEFAULT 0.00</TableCell>
                        <TableCell>每秒放置方块数</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">apm</TableCell>
                        <TableCell>DECIMAL(5,2)</TableCell>
                        <TableCell>DEFAULT 0.00</TableCell>
                        <TableCell>每分钟操作数</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">created_at</TableCell>
                        <TableCell>TIMESTAMPTZ</TableCell>
                        <TableCell>DEFAULT now()</TableCell>
                        <TableCell>记录创建时间</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">示例数据</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "session_start": "2023-06-01T10:00:00Z",
  "session_end": "2023-06-01T10:15:30Z",
  "game_mode": "sprint_40",
  "events": [
    {
      "time": "2023-06-01T10:02:15Z",
      "type": "level_up",
      "level": 2,
      "score": 500
    },
    {
      "time": "2023-06-01T10:05:30Z",
      "type": "line_cleared",
      "count": 4,
      "combo": 1,
      "score": 1200
    },
    {
      "time": "2023-06-01T10:10:45Z",
      "type": "perfect_clear",
      "level": 3,
      "score": 2000
    }
  ],
  "user_actions": {
    "total_moves": 1250,
    "rotations": 320,
    "drops": 480,
    "holds": 15,
    "soft_drops": 310,
    "hard_drops": 170
  },
  "score": 15000,
  "level": 5,
  "lines_cleared": 40,
  "duration_seconds": 93,
  "pps": 2.10,
  "apm": 120.50,
  "created_at": "2023-06-01T10:15:30Z"
}`}
                    </pre>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">优化优势</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• 完整记录游戏会话的开始和结束时间，便于分析用户游戏时长</li>
                    <li>• 通过JSONB字段存储关键事件和用户操作，提供灵活的数据结构</li>
                    <li>• 包含详细的游戏统计数据，便于后续分析和用户行为研究</li>
                    <li>• 支持实时数据分析和离线数据挖掘</li>
                    <li>• 为个性化推荐和智能匹配提供数据基础</li>
                    <li>• JSONB类型支持高效的索引和查询操作</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ad-structure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>广告数据结构优化</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">advertisements 表结构增强</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>字段名</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>约束</TableHead>
                        <TableHead>描述</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">id</TableCell>
                        <TableCell>UUID</TableCell>
                        <TableCell>PK, DEFAULT gen_random_uuid()</TableCell>
                        <TableCell>广告ID</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">title</TableCell>
                        <TableCell>TEXT</TableCell>
                        <TableCell>NOT NULL</TableCell>
                        <TableCell>广告标题</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">content</TableCell>
                        <TableCell>TEXT</TableCell>
                        <TableCell>NOT NULL</TableCell>
                        <TableCell>广告内容</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">start_date</TableCell>
                        <TableCell>TIMESTAMPTZ</TableCell>
                        <TableCell>NULL</TableCell>
                        <TableCell>开始展示时间</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">end_date</TableCell>
                        <TableCell>TIMESTAMPTZ</TableCell>
                        <TableCell>NULL</TableCell>
                        <TableCell>结束展示时间</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">position</TableCell>
                        <TableCell>TEXT</TableCell>
                        <TableCell>NOT NULL</TableCell>
                        <TableCell>广告位置</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">region</TableCell>
                        <TableCell>TEXT</TableCell>
                        <TableCell>NULL</TableCell>
                        <TableCell>目标地区</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">language</TableCell>
                        <TableCell>TEXT</TableCell>
                        <TableCell>NULL</TableCell>
                        <TableCell>语言代码</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">geolocation_data</TableCell>
                        <TableCell>JSONB</TableCell>
                        <TableCell>DEFAULT '{}'::jsonb</TableCell>
                        <TableCell>地理位置详细数据</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">ab_test_group</TableCell>
                        <TableCell>TEXT</TableCell>
                        <TableCell>NULL</TableCell>
                        <TableCell>A/B测试组标识</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">performance_metrics</TableCell>
                        <TableCell>JSONB</TableCell>
                        <TableCell>DEFAULT '{}'::jsonb</TableCell>
                        <TableCell>广告效果详细数据</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">target_audience</TableCell>
                        <TableCell>JSONB</TableCell>
                        <TableCell>DEFAULT '{}'::jsonb</TableCell>
                        <TableCell>目标受众配置</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">is_active</TableCell>
                        <TableCell>BOOLEAN</TableCell>
                        <TableCell>DEFAULT true</TableCell>
                        <TableCell>是否激活</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">impressions</TableCell>
                        <TableCell>INTEGER</TableCell>
                        <TableCell>DEFAULT 0</TableCell>
                        <TableCell>展示次数</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">clicks</TableCell>
                        <TableCell>INTEGER</TableCell>
                        <TableCell>DEFAULT 0</TableCell>
                        <TableCell>点击次数</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">created_at</TableCell>
                        <TableCell>TIMESTAMPTZ</TableCell>
                        <TableCell>DEFAULT now()</TableCell>
                        <TableCell>创建时间</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">updated_at</TableCell>
                        <TableCell>TIMESTAMPTZ</TableCell>
                        <TableCell>DEFAULT now()</TableCell>
                        <TableCell>更新时间</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">示例数据</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`{
  "id": "ad001",
  "title": "夏季特惠活动",
  "content": "限时优惠，升级VIP仅需¥99/月，享受更多游戏特权",
  "start_date": "2023-06-01T00:00:00Z",
  "end_date": "2023-06-30T23:59:59Z",
  "position": "header",
  "region": "Asia",
  "language": "zh",
  "geolocation_data": {
    "countries": ["CN", "TW", "HK"],
    "cities": ["北京", "上海", "广州", "深圳"],
    "timezone_ranges": ["UTC+8"]
  },
  "ab_test_group": "variant_A",
  "performance_metrics": {
    "daily_impressions": 5000,
    "daily_clicks": 150,
    "conversion_rate": 3.2,
    "cost_per_click": 0.5,
    "revenue_generated": 2400
  },
  "target_audience": {
    "age_range": [18, 35],
    "gaming_level": ["intermediate", "advanced"],
    "subscription_status": ["free", "basic"],
    "device_types": ["desktop", "mobile"]
  },
  "is_active": true,
  "impressions": 150000,
  "clicks": 4500,
  "created_at": "2023-05-30T10:30:00Z",
  "updated_at": "2023-06-15T14:22:45Z"
}`}
                    </pre>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">优化优势</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• 增强地理位置字段，支持更精确的地域定向功能</li>
                    <li>• 细化广告效果数据，支持更全面的效果分析和优化</li>
                    <li>• 添加A/B测试支持字段，便于进行广告优化实验</li>
                    <li>• 使用JSONB字段存储复杂数据结构，保持表结构的灵活性</li>
                    <li>• 增加时间戳字段，便于跟踪广告的创建和更新时间</li>
                    <li>• 支持精准的目标受众定位，提升广告投放效果</li>
                    <li>• 提供实时性能监控和数据分析能力</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseOptimization;