
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Download, Share2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { GameReplay } from '@/utils/gameTypes';

interface ReplaySystemProps {
  onReplaySelect: (replay: GameReplay) => void;
}

const ReplaySystem: React.FC<ReplaySystemProps> = ({ onReplaySelect }) => {
  const { user } = useAuth();
  const [replays, setReplays] = useState<GameReplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReplays();
  }, [user]);

  const fetchReplays = async () => {
    if (!user || user.isGuest) {
      setReplays([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('game_replays_new')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedReplays: GameReplay[] = data.map(replay => ({
        id: replay.id,
        matchId: replay.id, // Using replay id as match id for single player
        userId: replay.user_id,
        gameType: 'single',
        gameMode: replay.game_mode,
        score: replay.final_score,
        lines: replay.final_lines,
        level: replay.final_level,
        pps: replay.pps,
        apm: replay.apm,
        duration: replay.duration,
        startTime: new Date(replay.created_at).getTime(),
        endTime: new Date(replay.created_at).getTime() + (replay.duration * 1000),
        actions: [],
        finalBoard: [],
        date: replay.created_at,
        playerName: user.username || 'Player',
        isPersonalBest: replay.is_personal_best || false,
        metadata: {
          version: '1.0',
          settings: {
            das: 167,
            arr: 33,
            sdf: 20,
            controls: {
              moveLeft: 'ArrowLeft',
              moveRight: 'ArrowRight',
              softDrop: 'ArrowDown',
              hardDrop: 'Space',
              rotateClockwise: 'ArrowUp',
              rotateCounterclockwise: 'KeyZ',
              rotate180: 'KeyA',
              hold: 'KeyC',
              pause: 'Escape',
              backToMenu: 'KeyB'
            },
            enableGhost: true,
            enableSound: true,
            masterVolume: 50,
            backgroundMusic: '',
            musicVolume: 30,
            ghostOpacity: 50,
            enableWallpaper: true
          }
        }
      }));

      setReplays(formattedReplays);
    } catch (error) {
      console.error('Error fetching replays:', error);
      toast.error('Failed to load replays');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReplay = async (replayId: string) => {
    if (!confirm('Are you sure you want to delete this replay?')) return;

    try {
      const { error } = await supabase
        .from('game_replays_new')
        .delete()
        .eq('id', replayId);

      if (error) throw error;

      setReplays(prev => prev.filter(r => r.id !== replayId));
      toast.success('Replay deleted successfully');
    } catch (error) {
      console.error('Error deleting replay:', error);
      toast.error('Failed to delete replay');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Replays...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!user || user.isGuest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Replay System</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please sign in to view and manage your replays.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Replays ({replays.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {replays.length === 0 ? (
          <p className="text-muted-foreground">No replays found. Play some games to generate replays!</p>
        ) : (
          replays.map(replay => (
            <div key={replay.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{replay.gameMode}</h3>
                  {replay.isPersonalBest && (
                    <Badge variant="secondary">PB</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div>Score: {replay.score.toLocaleString()}</div>
                  <div>Lines: {replay.lines}</div>
                  <div>PPS: {replay.pps?.toFixed(2) || 0}</div>
                  <div>Time: {formatDuration(replay.duration)}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDate(replay.date || '')}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReplaySelect(replay)}
                >
                  <Play className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteReplay(replay.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ReplaySystem;
