import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import RankingSystem, { getRankByPoints } from '@/components/RankingSystem';
import { RankedDuelLayout } from '@/components/RankedDuelLayout';
import { Trophy, Users, Clock, Target, AlertTriangle, ArrowLeft } from 'lucide-react';

interface RankedMatchmakingSystemProps {
  onStartMatch: () => void;
  onBack: () => void;
}

// Mock match data for testing
const mockMatch = {
  id: 'match-123',
  player1_username: 'Player1',
  player2_username: 'Player2',
  player1_rating: 1250,
  player2_rating: 1180,
  best_of: 5,
  player1_wins: 2,
  player2_wins: 1,
  current_game: 4,
  status: 'playing'
};

const RankedMatchmakingSystem: React.FC<RankedMatchmakingSystemProps> = ({ onStartMatch, onBack }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [playerRating] = useState(1250);
  const [matchFound, setMatchFound] = useState(false);
  const [queueStats] = useState({
    playersInQueue: 31,
    playersInGame: 452
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const calculateEstimatedWaitTime = () => {
    // Calculate estimated wait based on queue size
    const baseWaitTime = Math.max(15, queueStats.playersInQueue * 2);
    return Math.min(baseWaitTime, 120); // Max 2 minutes
  };

  const handleStartSearch = () => {
    setIsSearching(true);
    setSearchTime(0);
    
    // Simulate finding a match
    const estimatedTime = calculateEstimatedWaitTime();
    const actualWaitTime = (estimatedTime + Math.random() * 10) * 1000;
    
    setTimeout(() => {
      setIsSearching(false);
      setSearchTime(0);
      setMatchFound(true);
    }, actualWaitTime);
  };

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchTime(0);
  };

  // Show ranked duel layout when match is found
  if (matchFound) {
    return (
      <RankedDuelLayout
        player1={{
          username: mockMatch.player1_username,
          rating: mockMatch.player1_rating,
          rank: 'B+',
          gameState: {
            board: Array(20).fill(null).map(() => Array(10).fill(0)),
            currentPiece: null,
            nextPieces: [],
            holdPiece: null,
            canHold: true
          },
          gameSettings: {},
          statistics: {
            score: 15420,
            lines: 32,
            level: 4,
            pps: 2.35,
            apm: 145,
            elapsedTime: 1234567
          }
        }}
        player2={{
          username: mockMatch.player2_username,
          rating: mockMatch.player2_rating,
          rank: 'A-',
          gameState: {
            board: Array(20).fill(null).map(() => Array(10).fill(0)),
            currentPiece: null,
            nextPieces: [],
            holdPiece: null,
            canHold: true
          },
          gameSettings: {},
          statistics: {
            score: 18750,
            lines: 38,
            level: 4,
            pps: 2.68,
            apm: 158,
            elapsedTime: 1234567
          }
        }}
        matchInfo={{
          bestOf: mockMatch.best_of,
          player1Wins: mockMatch.player1_wins,
          player2Wins: mockMatch.player2_wins,
          currentGame: mockMatch.current_game
        }}
        isGameActive={true}
        isGamePaused={false}
      />
    );
  }

  const currentRank = getRankByPoints(playerRating);
  const estimatedWaitTime = calculateEstimatedWaitTime();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={onBack} className="mr-4 text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-white mb-2">{t('ranked.title')}</h1>
            <p className="text-xl text-gray-300">{t('ranked.description')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Rank Info */}
          <div className="lg:col-span-1">
            <RankingSystem playerPoints={playerRating} className="mb-6" />
            
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Target className="w-5 h-5" />
                  {t('ranked.season_stats')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('ranked.games_played')}</span>
                  <span className="font-semibold text-white">127</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('ranked.win_rate')}</span>
                  <span className="font-semibold text-green-400">68%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('ranked.average_pps')}</span>
                  <span className="font-semibold text-white">2.3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('ranked.average_apm')}</span>
                  <span className="font-semibold text-white">89.5</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Matchmaking */}
          <div className="lg:col-span-2">
            {/* Penalty Warning */}
            <Alert className="mb-6 bg-red-900/20 border-red-500 text-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="font-semibold text-lg">
                {t('ranked.leaving_penalty')}
              </AlertDescription>
            </Alert>

            <Card className="mb-6 bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5" />
                  TETRA LEAGUE
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isSearching ? (
                  <div className="text-center py-8">
                    {/* Queue Statistics */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-400">{queueStats.playersInQueue}</div>
                        <div className="text-sm text-gray-400">{t('ranked.queue_info')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400">{queueStats.playersInGame}</div>
                        <div className="text-sm text-gray-400">{t('ranked.in_game')}</div>
                      </div>
                    </div>

                    {/* Estimated Wait Time */}
                    <div className="mb-6">
                      <div className="text-lg text-gray-300 mb-2">{t('ranked.estimated_time')}</div>
                      <div className="text-2xl font-bold text-white">{estimatedWaitTime}s</div>
                    </div>

                    {/* Rank Info */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                      <Badge className="bg-red-600 hover:bg-red-700 text-white text-lg px-4 py-2">
                        {currentRank.tier}
                      </Badge>
                      <span className="text-gray-400">±2 rank range</span>
                    </div>
                    
                    <Button 
                      onClick={handleStartSearch}
                      className="bg-red-600 hover:bg-red-700 text-white px-12 py-4 text-xl font-bold"
                      disabled={!user || user.isGuest}
                      size="lg"
                    >
                      {t('ranked.enter_matchmaking')}
                    </Button>
                    
                    {(!user || user.isGuest) && (
                      <p className="text-sm text-gray-500 mt-4">
                        {t('ranked.need_login')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-24 h-24 mx-auto mb-6 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                      <Clock className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white">{t('ranked.finding_match')}</h3>
                    
                    {/* Search Timer */}
                    <div className="mb-6">
                      <div className="text-4xl font-mono font-bold text-red-400 mb-2">
                        {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
                      </div>
                      <Progress 
                        value={(searchTime / estimatedWaitTime) * 100} 
                        className="mb-4 bg-gray-700"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleCancelSearch}
                      variant="outline"
                      className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                    >
                      {t('ranked.cancel_search')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Matches */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">{t('ranked.recent_matches')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { opponent: 'Player123', result: 'win', rating: '+15', time: '2h ago' },
                    { opponent: 'TetrisKing', result: 'loss', rating: '-12', time: '5h ago' },
                    { opponent: 'BlockMaster', result: 'win', rating: '+18', time: '1d ago' },
                  ].map((match, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={match.result === 'win' ? 'default' : 'destructive'}>
                          {match.result === 'win' ? t('ranked.win') : t('ranked.loss')}
                        </Badge>
                        <span className="font-medium text-white">{match.opponent}</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${match.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                          {match.rating}
                        </div>
                        <div className="text-sm text-gray-500">{match.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankedMatchmakingSystem;