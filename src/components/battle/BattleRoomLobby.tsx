import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ShareDialog from '@/components/ShareDialog';
import SpectatorModeToggle from './SpectatorModeToggle';
import { useSpectatorMode } from '@/hooks/useSpectatorMode';
import { 
  Users, Crown, Check, X, Copy, MessageSquare, 
  Play, ArrowLeft, Eye, Settings, Send, Share2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Participant {
  id: string;
  user_id: string;
  username: string;
  position: number;
  status: string;
  team?: string;
  score: number; // 0=未准备, 1=准备就绪
}

interface RoomMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  message_type: string;
}

interface BattleRoom {
  id: string;
  room_code: string;
  mode: string;
  status: string;
  max_players: number;
  current_players: number;
  created_by: string;
  custom_settings?: {
    team_mode?: boolean;
    team_size?: number;
    team_scoring?: 'individual' | 'combined';
    attack_strategy?: 'focus' | 'random' | 'even';
    [key: string]: any;
  };
  room_password?: string;
  allow_spectators?: boolean;
  spectator_count?: number;
  team_mode?: boolean;
  team_size?: number;
}

interface BattleRoomLobbyProps {
  roomId: string;
  onStartGame: () => void;
  onLeave: () => void;
  onSpectate?: () => void;
}

const BattleRoomLobby: React.FC<BattleRoomLobbyProps> = ({
  roomId,
  onStartGame,
  onLeave,
  onSpectate
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 观战模式 Hook
  const {
    isSpectating,
    spectatorCount,
    toggleSpectatorMode,
    loading: spectatorLoading
  } = useSpectatorMode(roomId);

  // 加载房间信息
  useEffect(() => {
    loadRoomData();
    
    // 订阅房间更新
    const roomChannel = supabase
      .channel(`room_${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_rooms',
        filter: `id=eq.${roomId}`
      }, () => {
        loadRoomData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_participants',
        filter: `room_id=eq.${roomId}`
      }, () => {
        loadParticipants();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as RoomMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 检查是否所有玩家都已准备 (使用 score 字段: 1=准备, 0=未准备)
  useEffect(() => {
    if (!room || participants.length < 2) return;
    
    // 使用 score 字段判断准备状态
    const allReady = participants.every(p => (p as any).score === 1);
    const isHost = room.created_by === user?.id;
    
    if (allReady && isHost && participants.length >= 2) {
      // 开始倒计时
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            onStartGame();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [participants, room, user?.id, onStartGame]);

  const loadRoomData = async () => {
    try {
      const { data: roomData, error } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      setRoom(roomData);
      await loadParticipants();
      await loadMessages();
    } catch (error) {
      console.error('Failed to load room:', error);
      toast.error('加载房间失败');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from('battle_participants')
      .select('*')
      .eq('room_id', roomId)
      .order('position');

    if (!error && data) {
      setParticipants(data);
      // 更新自己的准备状态 (使用 score 字段: 1=准备)
      const me = data.find(p => p.user_id === user?.id);
      if (me) {
        setIsReady(me.score === 1);
      }
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data);
    }
  };

  const toggleReady = async () => {
    if (!user) return;
    
    // 使用 score 字段标记准备状态: 1=准备, 0=未准备
    const newScore = isReady ? 0 : 1;
    
    const { error } = await supabase
      .from('battle_participants')
      .update({ score: newScore })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('更新状态失败');
      return;
    }

    setIsReady(!isReady);
    
    // 发送系统消息
    await supabase.from('room_messages').insert({
      room_id: roomId,
      user_id: user.id,
      username: user.username || 'Player',
      message: newScore === 1 ? '已准备' : '取消准备',
      message_type: 'system'
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from('room_messages').insert({
      room_id: roomId,
      user_id: user.id,
      username: user.username || 'Player',
      message: newMessage.trim(),
      message_type: 'chat'
    });

    if (!error) {
      setNewMessage('');
    }
  };

  const copyRoomCode = () => {
    if (room?.room_code) {
      navigator.clipboard.writeText(room.room_code);
      toast.success('房间号已复制');
    }
  };

  const handleLeave = async () => {
    if (!user) return;

    // 删除参与者记录
    await supabase
      .from('battle_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    // 更新房间人数
    if (room) {
      await supabase
        .from('battle_rooms')
        .update({ current_players: Math.max(0, room.current_players - 1) })
        .eq('id', roomId);
    }

    onLeave();
  };

  // 切换队伍
  const handleSwitchTeam = async () => {
    if (!user || !room) return;
    
    const myParticipant = participants.find(p => p.user_id === user.id);
    if (!myParticipant) return;

    const currentTeam = myParticipant.team || 'A';
    const newTeam = currentTeam === 'A' ? 'B' : 'A';
    
    // 检查目标队伍是否已满
    const teamSize = room.custom_settings?.team_size || 2;
    const targetTeamCount = participants.filter(p => p.team === newTeam).length;
    
    if (targetTeamCount >= teamSize) {
      toast.error('目标队伍已满');
      return;
    }
    
    const { error } = await supabase
      .from('battle_participants')
      .update({ team: newTeam })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('切换队伍失败');
      return;
    }

    toast.success(`已切换到 Team ${newTeam}`);
  };

  // 团队模式相关计算
  const isTeamMode = room?.custom_settings?.team_mode || room?.team_mode;
  const teamSize = room?.custom_settings?.team_size || room?.team_size || 2;
  const teamAPlayers = participants.filter(p => p.team === 'A');
  const teamBPlayers = participants.filter(p => p.team === 'B');
  const myParticipant = participants.find(p => p.user_id === user?.id);

  // 团队模式下的玩家卡片组件
  const TeamPlayerCard = ({ player, isHost, isMe }: { player: Participant; isHost: boolean; isMe: boolean }) => (
    <div className={`p-3 rounded-lg border-2 transition-all ${
      player.score === 1 ? 'border-green-500 bg-green-500/10' : 'border-border bg-card'
    } ${isMe ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            {isHost ? (
              <Crown className="h-4 w-4 text-yellow-500" />
            ) : (
              <Users className="h-4 w-4 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium text-sm">{player.username}</p>
            <p className="text-xs text-muted-foreground">
              {isHost ? '房主' : isMe ? '你' : '队友'}
            </p>
          </div>
        </div>
        {player.score === 1 ? (
          <Badge className="bg-green-500 text-xs">
            <Check className="h-3 w-3" />
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">等待</Badge>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground mb-4">房间不存在或已关闭</p>
        <Button onClick={onLeave}>返回</Button>
      </div>
    );
  }

  const isHost = room.created_by === user?.id;
  // 使用 score 字段判断准备状态
  const allReady = participants.length >= 2 && participants.every(p => p.score === 1);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* 倒计时覆盖层 */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-8xl font-bold text-primary animate-pulse">
              {countdown}
            </div>
            <p className="text-2xl text-white mt-4">游戏即将开始</p>
          </div>
        </div>
      )}

      {/* 房间头部 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">
                {room.mode === 'versus' ? '1v1 对战' : 
                 room.mode === 'battle_royale' ? '多人混战' : '方块联盟'}
              </CardTitle>
              <Badge variant="outline" className="text-lg px-3">
                #{room.room_code}
              </Badge>
              <Button size="icon" variant="ghost" onClick={copyRoomCode} title="复制房间号">
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setShowShareDialog(true)} title="分享房间" className="text-primary">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={room.status === 'waiting' ? 'secondary' : 'default'}>
                {room.status === 'waiting' ? '等待中' : '游戏中'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                <Users className="inline h-4 w-4 mr-1" />
                {participants.length}/{room.max_players}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 玩家列表 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              玩家列表
              {isTeamMode && (
                <Badge variant="outline" className="ml-2">
                  {room.custom_settings?.team_size || 2}v{room.custom_settings?.team_size || 2} 团队赛
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isTeamMode ? (
              // 团队模式布局
              <div className="grid grid-cols-2 gap-6">
                {/* Team A */}
                <div className="border-l-4 border-blue-500 pl-4 space-y-3">
                  <h3 className="font-bold text-blue-500 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team A
                  </h3>
                  {teamAPlayers.map((player) => (
                    <TeamPlayerCard 
                      key={player.id} 
                      player={player} 
                      isHost={player.user_id === room.created_by}
                      isMe={player.user_id === user?.id}
                    />
                  ))}
                  {/* 空位 */}
                  {Array(teamSize - teamAPlayers.length).fill(null).map((_, i) => (
                    <div key={`a-empty-${i}`} className="p-3 rounded-lg border-2 border-dashed border-muted bg-muted/10 text-center text-sm text-muted-foreground">
                      等待玩家加入...
                    </div>
                  ))}
                </div>
                
                {/* Team B */}
                <div className="border-l-4 border-red-500 pl-4 space-y-3">
                  <h3 className="font-bold text-red-500 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team B
                  </h3>
                  {teamBPlayers.map((player) => (
                    <TeamPlayerCard 
                      key={player.id} 
                      player={player} 
                      isHost={player.user_id === room.created_by}
                      isMe={player.user_id === user?.id}
                    />
                  ))}
                  {/* 空位 */}
                  {Array(teamSize - teamBPlayers.length).fill(null).map((_, i) => (
                    <div key={`b-empty-${i}`} className="p-3 rounded-lg border-2 border-dashed border-muted bg-muted/10 text-center text-sm text-muted-foreground">
                      等待玩家加入...
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // 普通模式布局
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: room.max_players }).map((_, index) => {
                  const participant = participants[index];
                  
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        participant 
                          ? participant.score === 1
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-border bg-card'
                          : 'border-dashed border-muted bg-muted/20'
                      }`}
                    >
                      {participant ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              {participant.user_id === room.created_by ? (
                                <Crown className="h-5 w-5 text-yellow-500" />
                              ) : (
                                <Users className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{participant.username}</p>
                              <p className="text-xs text-muted-foreground">
                                {participant.user_id === room.created_by ? '房主' : `玩家 ${index + 1}`}
                              </p>
                            </div>
                          </div>
                          <div>
                            {participant.score === 1 ? (
                              <Badge className="bg-green-500">
                                <Check className="h-3 w-3 mr-1" />
                                已准备
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                等待中
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-14 text-muted-foreground">
                          <span>等待玩家加入...</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 团队模式下的切换队伍按钮 */}
            {isTeamMode && myParticipant && (
              <div className="mt-4 pt-4 border-t flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleSwitchTeam}
                  disabled={countdown !== null}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  切换到 {myParticipant.team === 'A' ? 'Team B' : 'Team A'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 聊天区域 */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              房间聊天
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-3">
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-sm ${
                      msg.message_type === 'system' 
                        ? 'text-muted-foreground italic text-center' 
                        : ''
                    }`}
                  >
                    {msg.message_type === 'system' ? (
                      <span>*** {msg.username} {msg.message} ***</span>
                    ) : (
                      <>
                        <span className={`font-medium ${
                          msg.user_id === user?.id ? 'text-primary' : 'text-foreground'
                        }`}>
                          {msg.username}:
                        </span>
                        <span className="ml-2">{msg.message}</span>
                      </>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="输入消息..."
                className="flex-1"
              />
              <Button size="icon" onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleLeave}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              离开房间
            </Button>
            
            <div className="flex items-center gap-3">
              {/* 观战/参战切换按钮 */}
              {room.allow_spectators && (
                <SpectatorModeToggle
                  isSpectating={isSpectating}
                  spectatorCount={spectatorCount}
                  onToggle={async () => {
                    await toggleSpectatorMode();
                    if (!isSpectating && onSpectate) {
                      onSpectate();
                    }
                  }}
                  loading={spectatorLoading}
                  disabled={countdown !== null}
                />
              )}
              
              {/* 只有参战模式下才显示准备按钮 */}
              {!isSpectating && (
                <>
                  <Button
                    onClick={toggleReady}
                    variant={isReady ? 'outline' : 'default'}
                    className={isReady ? 'border-green-500 text-green-500' : ''}
                    disabled={countdown !== null}
                  >
                    {isReady ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        取消准备
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        准备
                      </>
                    )}
                  </Button>

                  {isHost && (
                    <Button
                      onClick={onStartGame}
                      disabled={!allReady || participants.length < 2}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      开始游戏
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* 观战提示 */}
          {isSpectating && (
            <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400">
              <Eye className="inline-block w-4 h-4 mr-2" />
              您正在观战模式。游戏开始后可以实时观看对战，点击上方按钮可切换回参战模式。
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 分享对话框 */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        roomCode={room.room_code}
        roomMode={room.mode === 'versus' ? '1v1对战' : room.mode === 'battle_royale' ? '多人混战' : '联盟赛'}
      />
    </div>
  );
};

export default BattleRoomLobby;
