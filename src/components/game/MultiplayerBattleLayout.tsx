import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import GameStatusIndicators from '@/components/GameStatusIndicators';
import AchievementDisplay from '@/components/AchievementDisplay';
import MiniPlayerView from './MiniPlayerView';
import GarbageQueueDisplay from './GarbageQueueDisplay';
import { 
  Shield, Sword, Target, Users, Clock, Zap, 
  ArrowLeft, Volume2, Settings 
} from 'lucide-react';
import type { GamePiece } from '@/utils/gameTypes';

export interface PlayerState {
  id: string;
  username: string;
  rank?: string;
  team?: 'A' | 'B';
  board: number[][];
  currentPiece: GamePiece | null;
  ghostPiece: GamePiece | null;
  holdPiece: GamePiece | null;
  nextPieces: GamePiece[];
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  pps: number;
  apm: number;
  combo: number;
  b2b: number;
  totalAttack: number;
  alive: boolean;
  garbageQueued: number;
}

interface MultiplayerBattleLayoutProps {
  // Main player (current user)
  mainPlayer: PlayerState;
  // Other players
  otherPlayers: PlayerState[];
  // Match info
  matchInfo?: {
    mode: 'versus' | 'team' | 'battle_royale';
    bestOf?: number;
    currentGame?: number;
    teamAScore?: number;
    teamBScore?: number;
    timeLimit?: number;
    elapsedTime?: number;
  };
  // Attack target
  attackTarget?: string | null;
  onTargetChange?: (targetId: string) => void;
  // Garbage system
  incomingGarbage: number;
  outgoingGarbage: number;
  // Callbacks
  onBack?: () => void;
  onSettings?: () => void;
  // Game state
  isGameActive: boolean;
  isPaused?: boolean;
  // Achievement system
  achievements?: Array<{ id: string; text: string; type: string; timestamp: number }>;
  onAchievementComplete?: (id: string) => void;
}

const MultiplayerBattleLayout: React.FC<MultiplayerBattleLayoutProps> = ({
  mainPlayer,
  otherPlayers,
  matchInfo,
  attackTarget,
  onTargetChange,
  incomingGarbage,
  outgoingGarbage,
  onBack,
  onSettings,
  isGameActive,
  isPaused,
  achievements = [],
  onAchievementComplete
}) => {
  // Separate players by team if in team mode
  const teamAPlayers = otherPlayers.filter(p => p.team === 'A');
  const teamBPlayers = otherPlayers.filter(p => p.team === 'B');
  const mainPlayerTeam = mainPlayer.team;

  // Get teammates and opponents
  const teammates = mainPlayerTeam 
    ? otherPlayers.filter(p => p.team === mainPlayerTeam)
    : [];
  const opponents = mainPlayerTeam 
    ? otherPlayers.filter(p => p.team !== mainPlayerTeam)
    : otherPlayers;

  // Team stats
  const getTeamStats = (team: 'A' | 'B') => {
    const players = [mainPlayer, ...otherPlayers].filter(p => p.team === team);
    const alive = players.filter(p => p.alive).length;
    const totalScore = players.reduce((sum, p) => sum + p.score, 0);
    const avgApm = players.length > 0 
      ? players.reduce((sum, p) => sum + p.apm, 0) / players.length 
      : 0;
    return { alive, total: players.length, totalScore, avgApm };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/90 to-primary/5 p-2 md:p-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Badge variant="outline" className="text-sm">
            {matchInfo?.mode === 'team' && '团队战'}
            {matchInfo?.mode === 'versus' && '对战'}
            {matchInfo?.mode === 'battle_royale' && '大逃杀'}
          </Badge>
          {matchInfo?.bestOf && (
            <span className="text-sm text-muted-foreground">
              BO{matchInfo.bestOf} - 第{matchInfo.currentGame || 1}局
            </span>
          )}
        </div>

        {/* Team scores for team mode */}
        {matchInfo?.mode === 'team' && (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-primary">
                {getTeamStats('A').alive}/{getTeamStats('A').total}
              </div>
              <div className="text-xs text-muted-foreground">Team A</div>
            </div>
            <div className="text-lg font-bold">VS</div>
            <div className="text-center">
              <div className="text-xl font-bold text-destructive">
                {getTeamStats('B').alive}/{getTeamStats('B').total}
              </div>
              <div className="text-xs text-muted-foreground">Team B</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {matchInfo?.elapsedTime !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="w-4 h-4" />
              <span className="font-mono">
                {Math.floor(matchInfo.elapsedTime / 60)}:
                {(matchInfo.elapsedTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
          {onSettings && (
            <Button variant="ghost" size="sm" onClick={onSettings}>
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-2 md:gap-4 justify-center">
        {/* Left: Teammates or Team A (in team mode) */}
        {matchInfo?.mode === 'team' && teammates.length > 0 && (
          <div className="hidden lg:flex flex-col gap-2 w-[140px]">
            <div className="flex items-center gap-1 text-sm font-medium text-primary mb-1">
              <Shield className="w-4 h-4" />
              <span>队友</span>
            </div>
            {teammates.map(player => (
              <MiniPlayerView
                key={player.id}
                username={player.username}
                board={player.board}
                score={player.score}
                lines={player.lines}
                apm={player.apm}
                alive={player.alive}
                team={player.team}
                rank={player.rank}
                garbageQueued={player.garbageQueued}
                isUnderAttack={attackTarget === player.id}
              />
            ))}
          </div>
        )}

        {/* Main Player Area */}
        <div className="flex gap-2 md:gap-4">
          {/* Garbage Queue */}
          <div className="flex flex-col items-center justify-center">
            <GarbageQueueDisplay
              incomingGarbage={incomingGarbage}
              outgoingGarbage={outgoingGarbage}
              maxDisplay={20}
            />
          </div>

          {/* Hold Piece */}
          <div className="flex flex-col gap-2">
            <HoldPieceDisplay
              holdPiece={mainPlayer.holdPiece}
              canHold={mainPlayer.canHold}
            />
            <GameStatusIndicators
              combo={mainPlayer.combo}
              b2b={mainPlayer.b2b}
              totalAttack={mainPlayer.totalAttack}
            />
            {onAchievementComplete && (
              <AchievementDisplay 
                achievements={achievements as any}
                onAchievementComplete={onAchievementComplete}
              />
            )}
          </div>

          {/* Main Game Board */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-center mb-1">
              <div className="text-2xl font-bold">{mainPlayer.score.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                L{mainPlayer.level} | {mainPlayer.lines}行
              </div>
            </div>

            <EnhancedGameBoard
              board={mainPlayer.board}
              currentPiece={mainPlayer.currentPiece}
              ghostPiece={mainPlayer.ghostPiece}
              cellSize={24}
              showGrid={true}
              showHiddenRows={false}
            />

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">PPS:</span>
                <span className="font-mono">{mainPlayer.pps.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="font-mono">{Math.round(mainPlayer.apm)}</span>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              {mainPlayer.username}
              {mainPlayer.rank && (
                <Badge variant="outline" className="ml-1 text-[10px]">
                  {mainPlayer.rank}
                </Badge>
              )}
            </div>
          </div>

          {/* Next Pieces */}
          <div>
            <NextPiecePreview nextPieces={mainPlayer.nextPieces.slice(0, 5)} />
          </div>
        </div>

        {/* Right: Opponents */}
        <div className="flex flex-col gap-2 w-[140px] md:w-[280px]">
          <div className="flex items-center gap-1 text-sm font-medium text-destructive mb-1">
            <Sword className="w-4 h-4" />
            <span>对手</span>
            {matchInfo?.mode !== 'team' && (
              <span className="text-xs text-muted-foreground ml-1">
                ({opponents.filter(p => p.alive).length}/{opponents.length} 存活)
              </span>
            )}
          </div>

          {/* Attack target selector */}
          {opponents.length > 1 && onTargetChange && (
            <div className="flex flex-wrap gap-1 mb-2">
              {['random', 'badge', 'ko'].map(strategy => (
                <Button
                  key={strategy}
                  variant={attackTarget === strategy ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => onTargetChange(strategy)}
                >
                  {strategy === 'random' && '随机'}
                  {strategy === 'badge' && '徽章'}
                  {strategy === 'ko' && 'KO'}
                </Button>
              ))}
            </div>
          )}

          {/* Opponent mini views - grid layout for many players */}
          <div className={cn(
            "grid gap-2",
            opponents.length <= 2 && "grid-cols-1",
            opponents.length > 2 && opponents.length <= 4 && "grid-cols-2",
            opponents.length > 4 && "grid-cols-2 md:grid-cols-3"
          )}>
            {opponents.map(player => (
              <MiniPlayerView
                key={player.id}
                username={player.username}
                board={player.board}
                score={player.score}
                lines={player.lines}
                apm={player.apm}
                alive={player.alive}
                team={player.team}
                rank={player.rank}
                garbageQueued={player.garbageQueued}
                isUnderAttack={attackTarget === player.id}
                onClick={() => onTargetChange?.(player.id)}
              />
            ))}
          </div>

          {/* Team stats for team mode */}
          {matchInfo?.mode === 'team' && (
            <Card className="mt-2 bg-destructive/5 border-destructive/20">
              <CardContent className="p-2 text-xs">
                <div className="flex justify-between">
                  <span>团队总分:</span>
                  <span className="font-mono">
                    {getTeamStats(mainPlayerTeam === 'A' ? 'B' : 'A').totalScore.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>平均APM:</span>
                  <span className="font-mono">
                    {Math.round(getTeamStats(mainPlayerTeam === 'A' ? 'B' : 'A').avgApm)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">游戏暂停</h2>
            <p className="text-muted-foreground">按ESC继续</p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MultiplayerBattleLayout;
