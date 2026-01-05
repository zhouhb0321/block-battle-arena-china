/**
 * 对战结果统计面板
 * 显示双方详细的游戏数据对比
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, Trophy, Target, Zap, Timer, TrendingUp, 
  BarChart3, Award, ArrowLeft, RotateCcw, Share2, Play 
} from 'lucide-react';

export interface PlayerMatchStats {
  id: string;
  username: string;
  rank?: string;
  score: number;
  lines: number;
  level: number;
  pps: number;
  apm: number;
  attack: number;
  efficiency: number; // 攻击效率 (attack per piece)
  maxCombo: number;
  maxB2B: number;
  tSpins: number;
  tetrises: number;
  perfectClears: number;
  piecesPlaced: number;
  duration: number; // 秒
  isWinner: boolean;
}

export interface MatchResultData {
  matchId: string;
  mode: string;
  bestOf: number;
  player1Wins: number;
  player2Wins: number;
  totalDuration: number;
  player1: PlayerMatchStats;
  player2: PlayerMatchStats;
}

interface MatchResultsPanelProps {
  data: MatchResultData;
  replayId?: string;
  onRematch?: () => void;
  onBackToMenu?: () => void;
  onShare?: () => void;
  onWatchReplay?: (replayId: string) => void;
}

const MatchResultsPanel: React.FC<MatchResultsPanelProps> = ({
  data,
  replayId,
  onRematch,
  onBackToMenu,
  onShare,
  onWatchReplay
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算双方对比的百分比
  const getComparisonPercent = (val1: number, val2: number) => {
    const total = val1 + val2;
    if (total === 0) return { p1: 50, p2: 50 };
    return {
      p1: Math.round((val1 / total) * 100),
      p2: Math.round((val2 / total) * 100)
    };
  };

  // 统计项对比行
  const StatComparisonRow: React.FC<{
    label: string;
    icon: React.ReactNode;
    value1: number | string;
    value2: number | string;
    numValue1?: number;
    numValue2?: number;
    format?: 'number' | 'decimal' | 'time';
    higherIsBetter?: boolean;
  }> = ({ 
    label, 
    icon, 
    value1, 
    value2, 
    numValue1, 
    numValue2,
    higherIsBetter = true 
  }) => {
    const v1 = numValue1 ?? (typeof value1 === 'number' ? value1 : 0);
    const v2 = numValue2 ?? (typeof value2 === 'number' ? value2 : 0);
    const comparison = getComparisonPercent(v1, v2);
    
    const isP1Better = higherIsBetter ? v1 > v2 : v1 < v2;
    const isP2Better = higherIsBetter ? v2 > v1 : v2 < v1;
    const isTie = v1 === v2;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className={cn(
            "font-mono",
            isP1Better && !isTie && "text-primary font-bold",
            isTie && "text-muted-foreground"
          )}>
            {value1}
          </span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </div>
          <span className={cn(
            "font-mono",
            isP2Better && !isTie && "text-destructive font-bold",
            isTie && "text-muted-foreground"
          )}>
            {value2}
          </span>
        </div>
        
        {/* 对比条 */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
          <div 
            className={cn(
              "transition-all duration-500",
              isP1Better ? "bg-primary" : "bg-primary/50"
            )}
            style={{ width: `${comparison.p1}%` }}
          />
          <div 
            className={cn(
              "transition-all duration-500",
              isP2Better ? "bg-destructive" : "bg-destructive/50"
            )}
            style={{ width: `${comparison.p2}%` }}
          />
        </div>
      </div>
    );
  };

  const winner = data.player1.isWinner ? data.player1 : data.player2;
  const loser = data.player1.isWinner ? data.player2 : data.player1;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-background/95">
        <CardHeader className="text-center pb-2">
          {/* 比赛标题 */}
          <div className="flex justify-center mb-2">
            <Badge variant="outline" className="text-sm">
              {data.mode === '1v1' ? '1v1 对战' : data.mode} - BO{data.bestOf}
            </Badge>
          </div>
          
          {/* 胜利者展示 */}
          <div className="flex flex-col items-center gap-2">
            <Crown className="w-12 h-12 text-yellow-500 animate-bounce" />
            <CardTitle className="text-2xl font-bold">
              {winner.username} 获胜!
            </CardTitle>
            <div className="text-4xl font-black text-primary">
              {data.player1Wins} - {data.player2Wins}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 玩家标题栏 */}
          <div className="flex justify-between items-center px-4">
            <div className="text-center">
              <div className={cn(
                "font-bold text-lg",
                data.player1.isWinner && "text-primary"
              )}>
                {data.player1.username}
              </div>
              {data.player1.rank && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {data.player1.rank}
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground text-sm">VS</div>
            <div className="text-center">
              <div className={cn(
                "font-bold text-lg",
                data.player2.isWinner && "text-destructive"
              )}>
                {data.player2.username}
              </div>
              {data.player2.rank && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {data.player2.rank}
                </Badge>
              )}
            </div>
          </div>

          {/* 核心数据对比 */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-center mb-3 text-muted-foreground">核心数据</h3>
            
            <StatComparisonRow
              label="分数"
              icon={<Trophy className="w-4 h-4" />}
              value1={data.player1.score.toLocaleString()}
              value2={data.player2.score.toLocaleString()}
              numValue1={data.player1.score}
              numValue2={data.player2.score}
            />
            
            <StatComparisonRow
              label="PPS"
              icon={<TrendingUp className="w-4 h-4" />}
              value1={data.player1.pps.toFixed(2)}
              value2={data.player2.pps.toFixed(2)}
              numValue1={data.player1.pps}
              numValue2={data.player2.pps}
            />
            
            <StatComparisonRow
              label="APM"
              icon={<Zap className="w-4 h-4" />}
              value1={data.player1.apm.toFixed(1)}
              value2={data.player2.apm.toFixed(1)}
              numValue1={data.player1.apm}
              numValue2={data.player2.apm}
            />
            
            <StatComparisonRow
              label="攻击行数"
              icon={<Target className="w-4 h-4" />}
              value1={data.player1.attack}
              value2={data.player2.attack}
            />
            
            <StatComparisonRow
              label="消除行数"
              icon={<BarChart3 className="w-4 h-4" />}
              value1={data.player1.lines}
              value2={data.player2.lines}
            />
          </div>

          {/* 高级数据对比 */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-center mb-3 text-muted-foreground">高级数据</h3>
            
            <StatComparisonRow
              label="最大Combo"
              icon={<Zap className="w-4 h-4" />}
              value1={data.player1.maxCombo}
              value2={data.player2.maxCombo}
            />
            
            <StatComparisonRow
              label="最大B2B"
              icon={<Award className="w-4 h-4" />}
              value1={data.player1.maxB2B}
              value2={data.player2.maxB2B}
            />
            
            <StatComparisonRow
              label="T-Spin"
              icon={<RotateCcw className="w-4 h-4" />}
              value1={data.player1.tSpins}
              value2={data.player2.tSpins}
            />
            
            <StatComparisonRow
              label="Tetris"
              icon={<BarChart3 className="w-4 h-4" />}
              value1={data.player1.tetrises}
              value2={data.player2.tetrises}
            />
            
            <StatComparisonRow
              label="块数"
              icon={<Target className="w-4 h-4" />}
              value1={data.player1.piecesPlaced}
              value2={data.player2.piecesPlaced}
            />
            
            <StatComparisonRow
              label="用时"
              icon={<Timer className="w-4 h-4" />}
              value1={formatTime(data.player1.duration)}
              value2={formatTime(data.player2.duration)}
              numValue1={data.player1.duration}
              numValue2={data.player2.duration}
              higherIsBetter={false}
            />
          </div>

          {/* 总比赛时长 */}
          <div className="text-center text-sm text-muted-foreground">
            <Timer className="w-4 h-4 inline-block mr-1" />
            总用时: {formatTime(data.totalDuration)}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-2">
            {onBackToMenu && (
              <Button variant="outline" onClick={onBackToMenu} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回菜单
              </Button>
            )}
            {replayId && onWatchReplay && (
              <Button 
                variant="secondary" 
                onClick={() => onWatchReplay(replayId)} 
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                观看回放
              </Button>
            )}
            {onRematch && (
              <Button onClick={onRematch} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                再来一局
              </Button>
            )}
            {onShare && (
              <Button variant="secondary" onClick={onShare} size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchResultsPanel;
