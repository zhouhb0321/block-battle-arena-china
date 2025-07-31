// 1v1双屏显示组件

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import GameBoard from '@/components/GameBoard';
import PiecePreview from '@/components/PiecePreview';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import { Trophy, Target, Clock, Zap } from 'lucide-react';
import type { GamePiece } from '@/utils/gameTypes';

interface DualScreenReplayProps {
  player1Data: {
    board: number[][];
    currentPiece: GamePiece | null;
    nextPieces: GamePiece[];
    holdPiece: GamePiece | null;
    stats: {
      score: number;
      lines: number;
      level: number;
      pps: number;
      apm: number;
    };
    username: string;
    rating: number;
  };
  player2Data: {
    board: number[][];
    currentPiece: GamePiece | null;
    nextPieces: GamePiece[];
    holdPiece: GamePiece | null;
    stats: {
      score: number;
      lines: number;
      level: number;
      pps: number;
      apm: number;
    };
    username: string;
    rating: number;
  };
  currentTime: number;
  totalTime: number;
}

export const DualScreenReplay: React.FC<DualScreenReplayProps> = ({
  player1Data,
  player2Data,
  currentTime,
  totalTime
}) => {
  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const PlayerSection = ({ 
    data, 
    side, 
    isWinning 
  }: { 
    data: typeof player1Data; 
    side: 'left' | 'right';
    isWinning: boolean;
  }) => (
    <div className="space-y-4">
      {/* 玩家信息 */}
      <Card className={isWinning ? 'ring-2 ring-primary' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              {data.username}
            </div>
            <Badge variant="secondary">{data.rating}</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {/* Hold区域 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hold</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <HoldPieceDisplay piece={data.holdPiece} />
          </CardContent>
        </Card>

        {/* 游戏画面 */}
        <Card className="col-span-1">
          <CardContent className="p-2">
            <GameBoard
              board={data.board}
              currentPiece={data.currentPiece}
              ghostPiece={null}
              clearingLines={[]}
              cellSize={16}
            />
          </CardContent>
        </Card>

        {/* Next区域 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Next</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {data.nextPieces.slice(0, 6).map((piece, index) => (
              <PiecePreview key={index} piece={piece} size="small" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 统计信息 */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>分数:</span>
              </div>
              <span className="font-mono">{data.stats.score.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>行数:</span>
              <span className="font-mono">{data.stats.lines}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>PPS:</span>
              </div>
              <span className="font-mono">{data.stats.pps.toFixed(1)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>APM:</span>
              </div>
              <span className="font-mono">{Math.round(data.stats.apm)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const player1Winning = player1Data.stats.score > player2Data.stats.score;

  return (
    <div className="space-y-4">
      {/* 时间进度 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>{formatTime(currentTime)}</span>
            <span className="font-semibold">1v1 对战回放</span>
            <span>{formatTime(totalTime)}</span>
          </div>
          <Progress value={(currentTime / totalTime) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* 双屏游戏区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlayerSection 
          data={player1Data} 
          side="left"
          isWinning={player1Winning}
        />
        
        {/* VS 分隔符 */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="text-4xl font-bold text-muted-foreground rotate-90 lg:rotate-0">
            VS
          </div>
        </div>
        
        <PlayerSection 
          data={player2Data} 
          side="right"
          isWinning={!player1Winning}
        />
      </div>
    </div>
  );
};