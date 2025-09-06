import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Clock, Target } from 'lucide-react';
import GameBoard from '@/components/GameBoard';
import NextPiecePreview from '@/components/NextPiecePreview';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import { GameMusicManager } from '@/components/GameMusicManager';

interface RankedDuelLayoutProps {
  player1: {
    username: string;
    rating: number;
    rank: string;
    gameState: any;
    gameSettings: any;
    statistics: {
      score: number;
      lines: number;
      level: number;
      pps: number;
      apm: number;
      elapsedTime: number;
    };
  };
  player2: {
    username: string;
    rating: number;
    rank: string;
    gameState: any;
    gameSettings: any;
    statistics: {
      score: number;
      lines: number;
      level: number;
      pps: number;
      apm: number;
      elapsedTime: number;
    };
  };
  matchInfo: {
    bestOf: number;
    player1Wins: number;
    player2Wins: number;
    currentGame: number;
  };
  isGameActive: boolean;
  isGamePaused: boolean;
}

export const RankedDuelLayout: React.FC<RankedDuelLayoutProps> = ({
  player1,
  player2,
  matchInfo,
  isGameActive,
  isGamePaused
}) => {
  const getRankColor = (rank: string) => {
    if (rank.startsWith('S')) return 'from-yellow-400 to-yellow-600';
    if (rank.startsWith('A')) return 'from-purple-400 to-purple-600';
    if (rank.startsWith('B')) return 'from-blue-400 to-blue-600';
    return 'from-gray-400 to-gray-600';
  };

  const PlayerInfo = ({ player, side }: { player: typeof player1; side: 'left' | 'right' }) => (
    <div className={`flex items-center gap-3 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
      <div className={`flex flex-col ${side === 'right' ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{player.username}</span>
          <Badge className={`bg-gradient-to-r ${getRankColor(player.rank)} text-white`}>
            {player.rank}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Trophy className="h-3 w-3" />
          <span>{player.rating}</span>
        </div>
      </div>
    </div>
  );

  const GameStats = ({ stats, side }: { stats: typeof player1.statistics; side: 'left' | 'right' }) => (
    <div className={`grid grid-cols-2 gap-2 text-sm ${side === 'right' ? 'text-right' : ''}`}>
      <div>
        <div className="text-muted-foreground">得分</div>
        <div className="font-bold">{stats.score.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-muted-foreground">消行</div>
        <div className="font-bold">{stats.lines}</div>
      </div>
      <div>
        <div className="text-muted-foreground">PPS</div>
        <div className="font-bold">{stats.pps.toFixed(2)}</div>
      </div>
      <div>
        <div className="text-muted-foreground">APM</div>
        <div className="font-bold">{stats.apm.toFixed(0)}</div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background/95 to-secondary/10">
      <GameMusicManager 
        isGameActive={isGameActive}
        isGamePaused={isGamePaused}
      />
      
      {/* Top Bar - Match Info */}
      <div className="flex-none p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <PlayerInfo player={player1} side="left" />
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                BO{matchInfo.bestOf}
              </Badge>
              <div className="flex items-center gap-2 text-xl font-bold">
                <span className={matchInfo.player1Wins > matchInfo.player2Wins ? 'text-primary' : ''}>
                  {matchInfo.player1Wins}
                </span>
                <span className="text-muted-foreground">-</span>
                <span className={matchInfo.player2Wins > matchInfo.player1Wins ? 'text-primary' : ''}>
                  {matchInfo.player2Wins}
                </span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              第 {matchInfo.currentGame} 局
            </div>
          </div>
          
          <PlayerInfo player={player2} side="right" />
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Player 1 Game Board */}
        <div className="flex-1 flex gap-4">
          <div className="flex flex-col gap-4 w-24">
            <Card className="p-3">
              <HoldPieceDisplay 
                holdPiece={player1.gameState?.holdPiece}
                canHold={player1.gameState?.canHold ?? true}
              />
            </Card>
            <Card className="p-3">
              <GameStats stats={player1.statistics} side="left" />
            </Card>
          </div>
          
          <div className="flex-1 max-w-md">
            <Card className="h-full flex items-center justify-center bg-gradient-to-b from-card to-card/80">
              <GameBoard
                board={player1.gameState?.board || Array(20).fill(null).map(() => Array(10).fill(0))}
                currentPiece={player1.gameState?.currentPiece}
                ghostPiece={player1.gameState?.ghostPiece}
                enableGhost={true}
                cellSize={24}
              />
            </Card>
          </div>
          
          <div className="w-24">
            <Card className="p-3">
              <NextPiecePreview 
                nextPieces={player1.gameState?.nextPieces || []}
                compact={true}
              />
            </Card>
          </div>
        </div>

        {/* Center Divider */}
        <div className="flex-none w-px bg-border"></div>

        {/* Player 2 Game Board */}
        <div className="flex-1 flex gap-4">
          <div className="w-24">
            <Card className="p-3">
              <NextPiecePreview 
                nextPieces={player2.gameState?.nextPieces || []}
                compact={true}
              />
            </Card>
          </div>
          
          <div className="flex-1 max-w-md">
            <Card className="h-full flex items-center justify-center bg-gradient-to-b from-card to-card/80">
              <GameBoard
                board={player2.gameState?.board || Array(20).fill(null).map(() => Array(10).fill(0))}
                currentPiece={player2.gameState?.currentPiece}
                ghostPiece={player2.gameState?.ghostPiece}
                enableGhost={true}
                cellSize={24}
              />
            </Card>
          </div>
          
          <div className="flex flex-col gap-4 w-24">
            <Card className="p-3">
              <HoldPieceDisplay 
                holdPiece={player2.gameState?.holdPiece}
                canHold={player2.gameState?.canHold ?? true}
              />
            </Card>
            <Card className="p-3">
              <GameStats stats={player2.statistics} side="right" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};