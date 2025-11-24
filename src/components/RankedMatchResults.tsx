import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';
import { getRankByPoints } from './RankingSystem';

interface MatchResultsProps {
  oldRating: number;
  newRating: number;
  ratingChange: number;
  expectedWinRate: number;
  actualResult: 'win' | 'loss';
  opponentInfo: {
    username: string;
    rating: number;
    rank: string;
  };
  gameStats: {
    score: number;
    lines: number;
    pps: number;
    apm: number;
    finesse: number;
  };
}

export const RankedMatchResults: React.FC<MatchResultsProps> = ({
  oldRating,
  newRating,
  ratingChange,
  expectedWinRate,
  actualResult,
  opponentInfo,
  gameStats
}) => {
  const oldRank = getRankByPoints(oldRating);
  const newRank = getRankByPoints(newRating);
  const rankChanged = oldRank.tier !== newRank.tier;
  const isWin = actualResult === 'win';

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{isWin ? '胜利' : '失败'}</span>
          <Badge variant={isWin ? 'default' : 'destructive'} className="text-lg">
            {isWin ? '+' : ''}{ratingChange} TR
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Rating Change */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {ratingChange > 0 ? (
              <TrendingUp className="w-6 h-6 text-green-500" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-500" />
            )}
            <div>
              <div className="text-2xl font-bold">
                {oldRating} → {newRating}
              </div>
              <div className="text-sm text-muted-foreground">
                预期胜率: {(expectedWinRate * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {rankChanged && (
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <div>
                <div className={`text-sm ${newRank.color}`}>
                  {oldRank.tier} → {newRank.tier}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ratingChange > 0 ? '晋级!' : '降级'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress to Next Rank */}
        {!rankChanged && newRank.maxPoints !== Infinity && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">距离下一段位</span>
              <span className="font-medium">
                {getRankByPoints(newRank.maxPoints + 1).tier}
              </span>
            </div>
            <Progress 
              value={((newRating - newRank.minPoints) / (newRank.maxPoints - newRank.minPoints)) * 100} 
            />
            <div className="text-xs text-muted-foreground text-center">
              还需 {newRank.maxPoints - newRating + 1} TR
            </div>
          </div>
        )}

        {/* Opponent Info */}
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground mb-2">对手信息</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{opponentInfo.username}</div>
              <div className="text-sm text-muted-foreground">
                {opponentInfo.rating} TR
              </div>
            </div>
            <Badge className={getRankByPoints(opponentInfo.rating).color}>
              {opponentInfo.rank}
            </Badge>
          </div>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">得分</div>
            <div className="text-xl font-bold">{gameStats.score.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">消行</div>
            <div className="text-xl font-bold">{gameStats.lines}</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">PPS</div>
            <div className="text-xl font-bold">{gameStats.pps.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">APM</div>
            <div className="text-xl font-bold">{gameStats.apm.toFixed(0)}</div>
          </div>
        </div>

        {/* Finesse */}
        <div className="p-4 border rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Finesse 效率</span>
            <span className={`text-lg font-bold ${
              gameStats.finesse >= 95 ? 'text-green-500' : 
              gameStats.finesse >= 90 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {gameStats.finesse.toFixed(1)}%
            </span>
          </div>
          <Progress value={gameStats.finesse} className="mt-2" />
        </div>
      </CardContent>
    </Card>
  );
};
