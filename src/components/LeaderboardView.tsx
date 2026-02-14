import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Play, Trophy, Clock, Target, Medal, AlertCircle, ArrowLeft, Share2, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { ReplayPreparationDialog } from './ReplayPreparationDialog';
import { ReplayPlayerV4Unified } from './ReplayPlayerV4Unified';

interface LeaderboardEntry {
  id: string;
  username: string;
  final_score: number;
  final_lines: number;
  duration_seconds: number;
  pps: number;
  apm: number;
  created_at: string;
  game_mode: string;
  is_personal_best: boolean;
  actions_count?: number;
  version?: string;
}

interface LeaderboardViewProps {
  onBack?: () => void;
}

const LOCALE_MAP: Record<string, string> = {
  zh: 'zh-CN',
  'zh-TW': 'zh-TW',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  es: 'es-ES',
};

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onBack }) => {
  const { t, language } = useLanguage();
  const [sprint40Leaderboard, setSprint40Leaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeAttack2Leaderboard, setTimeAttack2Leaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryForPreparation, setSelectedEntryForPreparation] = useState<LeaderboardEntry | null>(null);
  const [isPreparationDialogOpen, setIsPreparationDialogOpen] = useState(false);
  const [playerReplayData, setPlayerReplayData] = useState<any>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      const { data: sprint40Data, error: sprint40Error } = await supabase
        .from('compressed_replays')
        .select('id, username, game_mode, final_score, final_lines, duration_seconds, pps, apm, is_personal_best, created_at, actions_count, version')
        .eq('game_mode', 'sprint40')
        .gte('version', '3.0')
        .order('duration_seconds', { ascending: true })
        .limit(500);

      if (!sprint40Error && sprint40Data) {
        setSprint40Leaderboard(sprint40Data);
      }

      const { data: timeAttack2Data, error: timeAttack2Error } = await supabase
        .from('compressed_replays')
        .select('id, username, game_mode, final_score, final_lines, duration_seconds, pps, apm, is_personal_best, created_at, actions_count, version')
        .in('game_mode', ['timeAttack2', 'ultra2min'])
        .gte('version', '3.0')
        .order('final_score', { ascending: false })
        .limit(500);

      if (!timeAttack2Error && timeAttack2Data) {
        setTimeAttack2Leaderboard(timeAttack2Data);
      }
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSprint40 = useMemo(() => {
    if (!searchQuery.trim()) return sprint40Leaderboard;
    const q = searchQuery.toLowerCase();
    return sprint40Leaderboard.filter(e => e.username.toLowerCase().includes(q));
  }, [sprint40Leaderboard, searchQuery]);

  const filteredTimeAttack2 = useMemo(() => {
    if (!searchQuery.trim()) return timeAttack2Leaderboard;
    const q = searchQuery.toLowerCase();
    return timeAttack2Leaderboard.filter(e => e.username.toLowerCase().includes(q));
  }, [timeAttack2Leaderboard, searchQuery]);

  const handleViewReplay = (entry: LeaderboardEntry) => {
    setSelectedEntryForPreparation(entry);
    setIsPreparationDialogOpen(true);
  };

  const handleShareReplay = (entry: LeaderboardEntry) => {
    const url = `${window.location.origin}/replay/${entry.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t('leaderboard.linkCopied'));
    });
  };

  const handlePlayReady = (replayData: any) => {
    setPlayerReplayData(replayData);
    setIsPlayerOpen(true);
    setIsPreparationDialogOpen(false);
  };

  const isV4Replay = (data: any): boolean => {
    return data && (data.format === 'v4' || (data.version === '4.0' && data.v4Data));
  };

  const getV4Data = (data: any): any | null => {
    return data?.v4Data || null;
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
  };

  const formatScore = (score: number) => score.toLocaleString();

  const formatDate = (dateStr: string) => {
    const locale = LOCALE_MAP[language] || 'en-US';
    return new Date(dateStr).toLocaleDateString(locale, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">#{rank}</span>;
  };

  const isPlayable = (entry: LeaderboardEntry) =>
    !!(entry.actions_count && entry.actions_count > 0 && entry.version && parseFloat(entry.version) >= 3.0);

  const LeaderboardTable = ({ data, type }: { data: LeaderboardEntry[]; type: 'sprint40' | 'timeAttack2' }) => (
    <div className="space-y-2">
      {data.map((entry, index) => (
        <Card key={entry.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getRankIcon(index + 1)}
                  <span className="font-bold text-lg">#{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{entry.username}</h3>
                    {entry.is_personal_best && (
                      <Badge className="bg-yellow-500 text-black">
                        <Trophy className="w-3 h-3 mr-1" />PB
                      </Badge>
                    )}
                    {isPlayable(entry) ? (
                      <Badge variant="default" className="bg-green-500 text-white">
                        <Play className="w-3 h-3 mr-1" />{t('leaderboard.playable')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">
                        <AlertCircle className="w-3 h-3 mr-1" />{t('leaderboard.incomplete')}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {type === 'sprint40' ? (
                      <>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-green-500" />
                          <span className="font-bold">{formatTime(entry.duration_seconds)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span>{t('leaderboard.score')}: {formatScore(entry.final_score)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span className="font-bold">{formatScore(entry.final_score)} {t('leaderboard.points')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{t('leaderboard.lines')}: {entry.final_lines}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-1">
                      <span>PPS: {entry.pps.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>APM: {entry.apm.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatDate(entry.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  onClick={() => handleShareReplay(entry)}
                  variant="outline"
                  size="sm"
                  title={t('leaderboard.shareReplay')}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleViewReplay(entry)}
                  size="sm"
                  disabled={!isPlayable(entry)}
                >
                  {isPlayable(entry) ? (
                    <><Play className="w-4 h-4 mr-1" />{t('leaderboard.watchReplay')}</>
                  ) : (
                    <><AlertCircle className="w-4 h-4 mr-1" />{t('leaderboard.cantPlay')}</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('leaderboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button onClick={onBack} variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-2xl font-bold">{t('leaderboard.title')}</h2>
        </div>
        <Button onClick={loadLeaderboards} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" />
          {t('leaderboard.refresh')}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('leaderboard.searchPlayer')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="sprint40" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sprint40">{t('leaderboard.sprint40Tab')}</TabsTrigger>
          <TabsTrigger value="timeAttack2">{t('leaderboard.timeAttack2Tab')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sprint40" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t('leaderboard.sprint40Title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSprint40.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('leaderboard.noData')}</p>
                </div>
              ) : (
                <LeaderboardTable data={filteredSprint40} type="sprint40" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeAttack2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {t('leaderboard.timeAttack2Title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTimeAttack2.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('leaderboard.noData')}</p>
                </div>
              ) : (
                <LeaderboardTable data={filteredTimeAttack2} type="timeAttack2" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedEntryForPreparation && (
        <ReplayPreparationDialog
          isOpen={isPreparationDialogOpen}
          onClose={() => {
            setIsPreparationDialogOpen(false);
            setSelectedEntryForPreparation(null);
          }}
          replayId={selectedEntryForPreparation.id}
          replayInfo={{
            username: selectedEntryForPreparation.username,
            gameMode: selectedEntryForPreparation.game_mode,
            finalScore: selectedEntryForPreparation.final_score,
            finalLines: selectedEntryForPreparation.final_lines,
            durationSeconds: selectedEntryForPreparation.duration_seconds,
            pps: selectedEntryForPreparation.pps,
            apm: selectedEntryForPreparation.apm,
            isPersonalBest: selectedEntryForPreparation.is_personal_best,
            createdAt: selectedEntryForPreparation.created_at
          }}
          onPlayReady={handlePlayReady}
        />
      )}

      {playerReplayData && isPlayerOpen && isV4Replay(playerReplayData) && (
        <ReplayPlayerV4Unified
          key={playerReplayData?.id || playerReplayData?.v4Data?.metadata?.seed || 'replay'}
          replay={getV4Data(playerReplayData)}
          onClose={() => {
            setIsPlayerOpen(false);
            setPlayerReplayData(null);
          }}
          autoPlay={true}
        />
      )}
    </div>
  );
};

export default LeaderboardView;
