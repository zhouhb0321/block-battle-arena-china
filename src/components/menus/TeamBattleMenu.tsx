import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  Sword, 
  Shield, 
  Target, 
  Shuffle, 
  ArrowRight, 
  Crown,
  Zap,
  Coffee
} from 'lucide-react';

interface TeamBattleMenuProps {
  onRoomJoin: (roomId: string) => void;
  onBack: () => void;
}

interface TeamRoom {
  id: string;
  room_code: string;
  team_size: number;
  current_players: number;
  max_players: number;
  status: string;
  created_at: string;
  participants: Array<{
    username: string;
    team: string;
    position: number;
  }>;
}

const TeamBattleMenu: React.FC<TeamBattleMenuProps> = ({ onRoomJoin, onBack }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeRooms, setActiveRooms] = useState<TeamRoom[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  
  // Create room settings
  const [teamSize, setTeamSize] = useState<number>(2);
  const [garbageStrategy, setGarbageStrategy] = useState<'focus' | 'random' | 'even'>('focus');

  const loadActiveRooms = useCallback(async () => {
    if (!user) return;

    try {
      const { data: rooms, error } = await supabase
        .from('battle_rooms')
        .select(`
          id,
          room_code,
          team_size,
          current_players,
          max_players,
          status,
          created_at,
          battle_participants (
            username,
            team,
            position
          )
        `)
        .eq('team_mode', true)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActiveRooms((rooms?.map(room => ({
        ...room,
        participants: room.battle_participants || []
      })) as TeamRoom[]) || []);
    } catch (error) {
      console.error('Failed to load team battle rooms:', error);
    }
  }, [user]);

  const createTeamRoom = useCallback(async () => {
    if (!user) {
      toast.error('需要登录才能创建房间');
      return;
    }

    setIsLoading(true);
    try {
      const maxPlayers = teamSize * 2;
      const roomCode = Math.floor(1000 + Math.random() * 9000).toString();

      const { data: room, error } = await supabase
        .from('battle_rooms')
        .insert({
          room_code: roomCode,
          mode: 'team_battle',
          team_mode: true,
          team_size: teamSize,
          max_players: maxPlayers,
          current_players: 0,
          created_by: user.id,
          status: 'waiting',
          settings: {
            garbageStrategy,
            teamSize
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`团战房间创建成功！房间码: ${roomCode}`);
      setIsCreateDialogOpen(false);
      onRoomJoin(room.id);
    } catch (error) {
      console.error('Failed to create team room:', error);
      toast.error('创建房间失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [user, teamSize, garbageStrategy, onRoomJoin]);

  const joinRoomByCode = useCallback(async () => {
    if (!user || !roomCode.trim()) {
      toast.error('请输入房间码');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('join_room_by_code', {
        room_code_input: roomCode.trim()
      });

      if (error) throw error;

      if (data.success) {
        toast.success('成功加入团战房间！');
        onRoomJoin(data.room_id);
      } else {
        toast.error(data.error || '加入房间失败');
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      toast.error('加入房间失败，请检查房间码');
    } finally {
      setIsLoading(false);
      setRoomCode('');
    }
  }, [user, roomCode, onRoomJoin]);

  React.useEffect(() => {
    loadActiveRooms();
    const interval = setInterval(loadActiveRooms, 5000);
    return () => clearInterval(interval);
  }, [loadActiveRooms]);

  const getGarbageStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'focus': return <Target className="w-4 h-4" />;
      case 'random': return <Shuffle className="w-4 h-4" />;
      case 'even': return <Shield className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getGarbageStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'focus': return '集中打击 - 垃圾行发送给对方APM最高的玩家';
      case 'random': return '随机分配 - 垃圾行随机发送给对方任意玩家';
      case 'even': return '平均分配 - 垃圾行平均分配给对方所有玩家';
      default: return '未知策略';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sword className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">团战模式</h2>
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <p className="text-muted-foreground">2v2, 3v3, 4v4 团队对战</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setIsCreateDialogOpen(true)}>
          <CardContent className="p-6 text-center space-y-2">
            <Users className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">创建团战房间</h3>
            <p className="text-sm text-muted-foreground">设置团队规模和垃圾行策略</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <Crown className="w-8 h-8 mx-auto text-primary mb-2" />
              <h3 className="font-semibold">加入房间</h3>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="输入4位房间码"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                maxLength={4}
                className="text-center"
              />
              <Button 
                onClick={joinRoomByCode} 
                disabled={isLoading || !roomCode.trim()}
              >
                加入
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Rooms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="w-5 h-5" />
            活跃房间
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无活跃的团战房间
            </div>
          ) : (
            activeRooms.map((room) => (
              <div key={room.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{room.room_code}</Badge>
                    <Badge>{room.team_size}v{room.team_size}</Badge>
                    <div className="flex items-center gap-1">
                      {getGarbageStrategyIcon('focus')}
                      <span className="text-sm text-muted-foreground">
                        focus
                      </span>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => onRoomJoin(room.id)}
                    disabled={room.current_players >= room.max_players}
                  >
                    <ArrowRight className="w-4 h-4 mr-1" />
                    加入 ({room.current_players}/{room.max_players})
                  </Button>
                </div>
                
                {room.participants && room.participants.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <h4 className="text-sm font-medium text-primary mb-1">Team A</h4>
                      <div className="space-y-1">
                        {room.participants
                          .filter(p => p.team === 'A')
                          .map((participant, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground">
                              {participant.username}
                            </div>
                          ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-destructive mb-1">Team B</h4>
                      <div className="space-y-1">
                        {room.participants
                          .filter(p => p.team === 'B')
                          .map((participant, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground">
                              {participant.username}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create Room Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建团战房间</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>团队规模</Label>
              <Select value={teamSize.toString()} onValueChange={(value) => setTeamSize(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2v2 (4人对战)</SelectItem>
                  <SelectItem value="3">3v3 (6人对战)</SelectItem>
                  <SelectItem value="4">4v4 (8人对战)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>垃圾行分配策略</Label>
              <Select value={garbageStrategy} onValueChange={(value: any) => setGarbageStrategy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="focus">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      集中打击
                    </div>
                  </SelectItem>
                  <SelectItem value="random">
                    <div className="flex items-center gap-2">
                      <Shuffle className="w-4 h-4" />
                      随机分配
                    </div>
                  </SelectItem>
                  <SelectItem value="even">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      平均分配
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {getGarbageStrategyDescription(garbageStrategy)}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={createTeamRoom} disabled={isLoading}>
                {isLoading ? '创建中...' : '创建房间'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Back Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={onBack}>
          返回主菜单
        </Button>
      </div>
    </div>
  );
};

export default TeamBattleMenu;