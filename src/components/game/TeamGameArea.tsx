import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useBattleWebSocket } from '@/hooks/useBattleWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import GameStatusIndicators from '@/components/GameStatusIndicators';
import GameMusicManager from '@/components/GameMusicManager';
import AdSpace from '@/components/AdSpace';
import { addGarbageToBoard, calculateAttack } from '@/utils/garbageSystem';
import { 
  Users, 
  Sword, 
  Shield, 
  Crown, 
  Zap,
  Clock,
  Target,
  TrendingUp
} from 'lucide-react';
import type { GameMode } from '@/utils/gameTypes';

interface TeamGameAreaProps {
  roomId: string;
  roomData?: any;
  onGameEnd?: () => void;
  onBackToMenu?: () => void;
}

interface TeamMember {
  id: string;
  username: string;
  team: 'A' | 'B';
  position: number;
  gameState?: {
    score: number;
    lines: number;
    level: number;
    apm: number;
    stackHeight: number;
    alive: boolean;
  };
}

const TeamGameArea: React.FC<TeamGameAreaProps> = ({
  roomId,
  roomData,
  onGameEnd,
  onBackToMenu
}) => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [participants, setParticipants] = useState<TeamMember[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [matchWinner, setMatchWinner] = useState<'A' | 'B' | null>(null);
  const [incomingGarbage, setIncomingGarbage] = useState<number[]>([]);
  const [teamScore, setTeamScore] = useState({ A: 0, B: 0 });

  // Determine user's team
  const userTeam = participants.find(p => p.id === user?.id)?.team || 'A';
  const garbageStrategy = roomData?.settings?.garbageStrategy || 'focus';

  // Handle attack generation
  const handleAttack = useCallback((attackData: any) => {
    if (!gameStarted || !user) return;

    const attackLines = calculateAttack(
      attackData.linesCleared,
      attackData.isTSpin,
      attackData.isB2B,
      attackData.combo
    );

    if (attackLines > 0) {
      console.log('Team attack:', attackLines);
    }
  }, [gameStarted, user]);

  const gameLogic = useGameLogic({
    gameMode: { 
      id: 'team_battle', 
      name: 'Team Battle',
      displayName: 'Team Battle',
      description: 'Team vs Team',
      isTimeAttack: false
    } as GameMode
  });

  const { 
    sendMessage, 
    isConnected, 
    lastMessage 
  } = useBattleWebSocket(roomId, user?.id);
    if (!gameStarted || !user) return;

    const attackLines = calculateAttack(
      attackData.linesCleared,
      attackData.isTSpin,
      attackData.isB2B,
      attackData.combo
    );

    if (attackLines > 0) {
      sendMessage({
        type: 'team_attack',
        data: {
          lines: attackLines,
          fromTeam: userTeam,
          strategy: garbageStrategy,
          sourceId: user.id
        }
      });
    }
  }, [gameStarted, user, sendMessage, userTeam, garbageStrategy]);

  // Handle incoming garbage (simplified for now)
  useEffect(() => {
    if (incomingGarbage.length > 0) {
      setIncomingGarbage([]);
    }
  }, [incomingGarbage]);

  // WebSocket message handling
  useEffect(() => {
    if (!lastMessage) return;

    const message = JSON.parse(lastMessage.data);

    switch (message.type) {
      case 'participant_update':
        setParticipants(message.participants || []);
        break;

      case 'game_start':
        setGameStarted(true);
        gameLogic.startGame();
        break;

      case 'team_attack':
        if (message.data.fromTeam !== userTeam) {
          // Receive attack from opposing team
          setIncomingGarbage(prev => [...prev, ...new Array(message.data.lines).fill(1)]);
        }
        break;

      case 'team_state_update':
        setParticipants(prev => prev.map(p => 
          p.id === message.userId 
            ? { ...p, gameState: message.data }
            : p
        ));
        break;

      case 'team_member_eliminated':
        setParticipants(prev => prev.map(p =>
          p.id === message.userId
            ? { ...p, gameState: { ...p.gameState, alive: false } }
            : p
        ));
        break;

      case 'team_victory':
        setMatchWinner(message.winningTeam);
        setGameStarted(false);
        if (onGameEnd) {
          setTimeout(onGameEnd, 3000);
        }
        break;
    }
  }, [lastMessage, userTeam, gameLogic, onGameEnd]);

  // Send game state updates
  useEffect(() => {
    if (!gameStarted || !user) return;

    const gameState = {
      score: gameLogic.score,
      lines: gameLogic.lines,
      level: gameLogic.level,
      apm: gameLogic.apm,
      stackHeight: gameLogic.board.findIndex(row => row.some(cell => cell !== 0)),
      alive: !gameLogic.gameOver
    };

    sendMessage({
      type: 'team_state_update',
      data: gameState
    });
  }, [gameLogic.score, gameLogic.lines, gameLogic.level, gameLogic.apm, gameLogic.gameOver, gameStarted, user, sendMessage]);

  // Handle game over
  useEffect(() => {
    if (gameLogic.gameOver && gameStarted) {
      sendMessage({
        type: 'team_member_eliminated',
        userId: user?.id,
        data: {
          finalScore: gameLogic.score,
          finalLines: gameLogic.lines,
          duration: gameLogic.time
        }
      });
    }
  }, [gameLogic.gameOver, gameStarted, user?.id, sendMessage]);

  const getTeamMembers = (team: 'A' | 'B') => 
    participants.filter(p => p.team === team).sort((a, b) => a.position - b.position);

  const getTeamStats = (team: 'A' | 'B') => {
    const members = getTeamMembers(team);
    const alive = members.filter(m => m.gameState?.alive !== false).length;
    const totalScore = members.reduce((sum, m) => sum + (m.gameState?.score || 0), 0);
    const avgAPM = members.length > 0 
      ? members.reduce((sum, m) => sum + (m.gameState?.apm || 0), 0) / members.length 
      : 0;
    
    return { alive, total: members.length, totalScore, avgAPM };
  };

  const teamAStats = getTeamStats('A');
  const teamBStats = getTeamStats('B');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/90 to-primary/5">
      <GameMusicManager isGameActive={gameStarted} isGamePaused={false} />
      
      <div className="container mx-auto p-4 space-y-4">
        {/* Match Header */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Sword className="w-5 h-5 text-primary" />
                  <span className="font-bold">团战模式</span>
                </div>
                <Badge variant="outline">
                  {roomData?.team_size || 2}v{roomData?.team_size || 2}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Target className="w-4 h-4" />
                  {garbageStrategy === 'focus' && '集中打击'}
                  {garbageStrategy === 'random' && '随机分配'}
                  {garbageStrategy === 'even' && '平均分配'}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{teamAStats.alive}</div>
                  <div className="text-xs text-muted-foreground">Team A</div>
                </div>
                <div className="text-xl font-bold">VS</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{teamBStats.alive}</div>
                  <div className="text-xs text-muted-foreground">Team B</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Team A Panel */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Shield className="w-5 h-5" />
                  Team A
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getTeamMembers('A').map((member) => (
                  <div key={member.id} className={`p-3 rounded-lg border ${
                    member.id === user?.id ? 'bg-primary/10 border-primary' : 'bg-background'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{member.username}</span>
                      {member.gameState?.alive === false && (
                        <Badge variant="destructive" className="text-xs">OUT</Badge>
                      )}
                    </div>
                    {member.gameState && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>分数:</span>
                          <span>{member.gameState.score.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>APM:</span>
                          <span>{Math.round(member.gameState.apm)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>团队总分:</span>
                    <span className="font-mono">{teamAStats.totalScore.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>平均APM:</span>
                    <span className="font-mono">{Math.round(teamAStats.avgAPM)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Area */}
          <div className="lg:col-span-6 space-y-4">
            {/* User's Game Board */}
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-center gap-4">
                  <HoldPieceDisplay 
                    holdPiece={gameLogic.holdPiece}
                    canHold={gameLogic.canHold}
                  />
                  
                  <div className="flex flex-col items-center gap-2">
                    <GameStatusIndicators
                      score={gameLogic.score}
                      lines={gameLogic.lines}
                      level={gameLogic.level}
                      time={gameLogic.time}
                    />
                    
                    <EnhancedGameBoard
                      board={gameLogic.board}
                      currentPiece={gameLogic.currentPiece}
                      ghostPiece={gameLogic.ghostPiece}
                      cellSize={28}
                      showGrid={settings?.enable_grid}
                      showHiddenRows={false}
                    />
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>PPS: {gameLogic.pps.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        <span>APM: {Math.round(gameLogic.apm)}</span>
                      </div>
                    </div>
                  </div>

                  <NextPiecePreview 
                    nextPieces={gameLogic.nextPieces.slice(0, 5)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ad Space */}
            <AdSpace position="game_bottom" />
          </div>

          {/* Team B Panel */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Sword className="w-5 h-5" />
                  Team B
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getTeamMembers('B').map((member) => (
                  <div key={member.id} className={`p-3 rounded-lg border ${
                    member.id === user?.id ? 'bg-destructive/10 border-destructive' : 'bg-background'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{member.username}</span>
                      {member.gameState?.alive === false && (
                        <Badge variant="destructive" className="text-xs">OUT</Badge>
                      )}
                    </div>
                    {member.gameState && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>分数:</span>
                          <span>{member.gameState.score.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>APM:</span>
                          <span>{Math.round(member.gameState.apm)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>团队总分:</span>
                    <span className="font-mono">{teamBStats.totalScore.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>平均APM:</span>
                    <span className="font-mono">{Math.round(teamBStats.avgAPM)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Victory Screen */}
        {matchWinner && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <Card className="p-8 text-center space-y-4">
              <Crown className="w-16 h-16 mx-auto text-yellow-500" />
              <h2 className="text-3xl font-bold">
                Team {matchWinner} 获胜！
              </h2>
              <p className="text-muted-foreground">
                {matchWinner === userTeam ? '恭喜你的团队获得胜利！' : '你的团队失败了，下次加油！'}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamGameArea;