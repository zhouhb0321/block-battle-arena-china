/**
 * 回放一致性仪表板
 * 实时显示回放诊断信息和统计数据
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, AlertCircle, Info, Activity } from 'lucide-react';
import type { DiagnosticDifference } from '@/utils/replayV4/diagnostics';

interface ReplayConsistencyDashboardProps {
  enabled: boolean;
  isRecording: boolean;
  recordedCount: number;
  replayedCount: number;
  differences: DiagnosticDifference[];
  currentTime: number;
  totalDuration: number;
}

export const ReplayConsistencyDashboard: React.FC<ReplayConsistencyDashboardProps> = ({
  enabled,
  isRecording,
  recordedCount,
  replayedCount,
  differences,
  currentTime,
  totalDuration
}) => {
  if (!enabled) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          诊断模式未启用
        </CardContent>
      </Card>
    );
  }
  
  const critical = differences.filter(d => d.severity === 'critical');
  const warnings = differences.filter(d => d.severity === 'warning');
  const info = differences.filter(d => d.severity === 'info');
  
  const consistencyRate = replayedCount > 0
    ? ((replayedCount - differences.length) / replayedCount * 100).toFixed(1)
    : '100.0';
  
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  
  return (
    <div className="space-y-4">
      {/* 状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4" />
            实时状态
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">记录模式</span>
            <Badge variant={isRecording ? 'default' : 'outline'}>
              {isRecording ? '录制中' : '播放中'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">一致性</span>
            <div className="flex items-center gap-2">
              {parseFloat(consistencyRate) === 100 ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              <span className="font-medium">{consistencyRate}%</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>进度</span>
              <span>{Math.floor(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
      
      {/* 统计卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">诊断数据</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">已记录快照</span>
            <span className="font-medium">{recordedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">已回放快照</span>
            <span className="font-medium">{replayedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">总差异</span>
            <span className="font-medium">{differences.length}</span>
          </div>
          
          {differences.length > 0 && (
            <>
              <div className="border-t border-border pt-2 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-destructive">严重</span>
                  <Badge variant="destructive" className="h-5">{critical.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-500">警告</span>
                  <Badge variant="secondary" className="h-5">{warnings.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-500">信息</span>
                  <Badge variant="outline" className="h-5">{info.length}</Badge>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* 差异详情 */}
      {differences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">差异详情</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {critical.map((d, i) => (
                  <div key={`c-${i}`} className="p-2 bg-destructive/10 rounded text-xs">
                    <div className="font-medium text-destructive">
                      Lock #{d.lockIndex} @ {d.timestamp}ms
                    </div>
                    <div className="text-muted-foreground">{d.field}</div>
                  </div>
                ))}
                {warnings.map((d, i) => (
                  <div key={`w-${i}`} className="p-2 bg-yellow-500/10 rounded text-xs">
                    <div className="font-medium text-yellow-500">
                      Lock #{d.lockIndex}: {d.field}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
