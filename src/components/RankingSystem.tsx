
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface PlayerRank {
  tier: string;
  points: number;
  minPoints: number;
  maxPoints: number;
  color: string;
}

const rankTiers = [
  { tier: 'C-', minPoints: 0, maxPoints: 99, color: 'bg-gray-500' },
  { tier: 'C', minPoints: 100, maxPoints: 199, color: 'bg-gray-400' },
  { tier: 'C+', minPoints: 200, maxPoints: 349, color: 'bg-gray-300' },
  { tier: 'B-', minPoints: 350, maxPoints: 549, color: 'bg-green-600' },
  { tier: 'B', minPoints: 550, maxPoints: 799, color: 'bg-green-500' },
  { tier: 'B+', minPoints: 800, maxPoints: 1099, color: 'bg-green-400' },
  { tier: 'A-', minPoints: 1100, maxPoints: 1499, color: 'bg-blue-600' },
  { tier: 'A', minPoints: 1500, maxPoints: 1999, color: 'bg-blue-500' },
  { tier: 'A+', minPoints: 2000, maxPoints: 2699, color: 'bg-blue-400' },
  { tier: 'S-', minPoints: 2700, maxPoints: 3499, color: 'bg-purple-600' },
  { tier: 'S', minPoints: 3500, maxPoints: 4499, color: 'bg-purple-500' },
  { tier: 'S+', minPoints: 4500, maxPoints: 5999, color: 'bg-purple-400' },
  { tier: 'SS-', minPoints: 6000, maxPoints: Infinity, color: 'bg-yellow-500' }
];

export const getRankByPoints = (points: number): PlayerRank => {
  const rank = rankTiers.find(tier => points >= tier.minPoints && points <= tier.maxPoints);
  return {
    tier: rank?.tier || 'C-',
    points,
    minPoints: rank?.minPoints || 0,
    maxPoints: rank?.maxPoints || 99,
    color: rank?.color || 'bg-gray-500'
  };
};

interface RankingSystemProps {
  playerPoints: number;
  className?: string;
}

const RankingSystem: React.FC<RankingSystemProps> = ({ playerPoints, className }) => {
  const currentRank = getRankByPoints(playerPoints);
  const nextRank = rankTiers.find(tier => tier.minPoints > playerPoints);
  
  const progressPercent = nextRank 
    ? ((playerPoints - currentRank.minPoints) / (nextRank.minPoints - currentRank.minPoints)) * 100
    : 100;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge className={`${currentRank.color} text-white`}>
            {currentRank.tier}
          </Badge>
          排位系统
        </CardTitle>
        <CardDescription>
          当前积分: {playerPoints}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>当前段位: {currentRank.tier}</span>
            {nextRank && <span>下一段位: {nextRank.tier}</span>}
          </div>
          
          {nextRank && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <div className="text-xs text-center text-muted-foreground">
                还需 {nextRank.minPoints - playerPoints} 积分晋级
              </div>
            </>
          )}
          
          <div className="grid grid-cols-4 gap-1 text-xs">
            {rankTiers.slice(0, 8).map((tier) => (
              <div 
                key={tier.tier}
                className={`p-1 rounded text-center ${
                  playerPoints >= tier.minPoints && playerPoints <= tier.maxPoints
                    ? `${tier.color} text-white font-bold`
                    : playerPoints > tier.maxPoints
                    ? `${tier.color} text-white opacity-50`
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {tier.tier}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RankingSystem;
