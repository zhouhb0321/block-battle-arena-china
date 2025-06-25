
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Download, Share2, Clock, Trophy } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface GameReplay {
  id: string;
  playerName: string;
  gameMode: string;
  score: number;
  lines: number;
  level: number;
  duration: number;
  date: string;
  moves: any[];
  isPersonalBest?: boolean;
  isWorldRecord?: boolean;
}

interface ReplaySystemProps {
  replays: GameReplay[];
  onPlayReplay: (replay: GameReplay) => void;
}

const ReplaySystem: React.FC<ReplaySystemProps> = ({ replays, onPlayReplay }) => {
  const [selectedReplay, setSelectedReplay] = useState<GameReplay | null>(null);
  const [filter, setFilter] = useState<'all' | 'personal' | 'world'>('all');

  const filteredReplays = replays.filter(replay => {
    if (filter === 'personal') return !replay.isWorldRecord;
    if (filter === 'world') return replay.isWorldRecord;
    return true;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          全部回放
        </Button>
        <Button
          variant={filter === 'personal' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('personal')}
        >
          个人回放
        </Button>
        <Button
          variant={filter === 'world' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('world')}
        >
          世界前500
        </Button>
      </div>

      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {filteredReplays.map((replay) => (
          <Card key={replay.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {replay.playerName}
                  {replay.isPersonalBest && (
                    <Badge variant="secondary" className="text-xs">
                      <Trophy className="w-3 h-3 mr-1" />
                      PB
                    </Badge>
                  )}
                  {replay.isWorldRecord && (
                    <Badge className="bg-yellow-500 text-xs">
                      <Trophy className="w-3 h-3 mr-1" />
                      世界纪录
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPlayReplay(replay)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs">
                {replay.gameMode} • {formatDate(replay.date)}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">得分</div>
                  <div className="font-mono">{replay.score.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">行数</div>
                  <div className="font-mono">{replay.lines}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">等级</div>
                  <div className="font-mono">{replay.level}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">时长</div>
                  <div className="font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(replay.duration)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReplays.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-4xl mb-2">🎬</div>
          <div>暂无回放记录</div>
          <div className="text-sm">完成游戏后将自动保存回放</div>
        </div>
      )}
    </div>
  );
};

export default ReplaySystem;
