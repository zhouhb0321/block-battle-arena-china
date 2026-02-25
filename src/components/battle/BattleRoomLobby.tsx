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
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // Check if all players are ready (score field: 1=ready, 0=not ready)
  useEffect(() => {
    if (!room || participants.length < 2) return;
    
    const allReady = participants.every(p => (p as any).score === 1);
    const isHost = room.created_by === user?.id;
    
    if (allReady && isHost && participants.length >= 2) {
      // Start countdown
      setCountdown(3);
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
            onStartGame();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Cancel countdown if any player un-readies
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
      }
    }
    
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
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
      toast.error(t('battle.load_failed'));
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
      toast.error(t('battle.update_failed'));
      return;
    }

    setIsReady(!isReady);
    
    // 发送系统消息
    await supabase.from('room_messages').insert({
      room_id: roomId,
      user_id: user.id,
      username: user.username || 'Player',
      message: newScore === 1 ? t('battle.ready_status') : t('battle.cancel_ready'),
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
      toast.success(t('battle.room_code_copied'));
    }
  };

  const handleLeave = async () => {
    if (!user) return;

    // Delete participant record
    await supabase
      .from('battle_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    // If creator is leaving, close the room
    if (room && room.created_by === user.id) {
      await supabase
        .from('battle_rooms')
        .update({ status: 'finished', current_players: 0 })
        .eq('id', roomId);
    } else if (room) {
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
      toast.error(t('battle.target_team_full'));
      return;
    }
    
    const { error } = await supabase
      .from('battle_participants')
      .update({ team: newTeam })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) {
      toast.error(t('battle.switch_team_failed'));
      return;
    }

    toast.success(`${t('battle.switched_to_team')} Team ${newTeam}`);
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
              {isHost ? t('battle.host') : isMe ? t('battle.you') : t('battle.teammate')}
            </p>
          </div>
        </div>
        {player.score === 1 ? (
          <Badge className="bg-green-500 text-xs">
            <Check className="h-3 w-3" />
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">{t('battle.waiting')}</Badge>
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
        <p className="text-muted-foreground mb-4">{t('battle.room_not_found')}</p>
        <Button onClick={onLeave}>{t('common.back')}</Button>
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
            <p className="text-2xl text-white mt-4">{t('battle.game_starting')}</p>
          </div>
        </div>
      )}

      {/* 房间头部 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">
                {room.mode === 'versus' ? t('battle.1v1') : 
                 room.mode === 'battle_royale' ? t('battle.battle_royale') : t('battle.league')}
              </CardTitle>
              <Badge variant="outline" className="text-lg px-3">
                #{room.room_code}
              </Badge>
              <Button size="icon" variant="ghost" onClick={copyRoomCode} title={t('battle.copy_room_code')}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setShowShareDialog(true)} title={t('battle.share_room')} className="text-primary">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={room.status === 'waiting' ? 'secondary' : 'default'}>
                {room.status === 'waiting' ? t('battle.room_status_waiting') : t('battle.room_status_playing')}
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
              {t('battle.player_list')}
              {isTeamMode && (
                <Badge variant="outline" className="ml-2">
                  {room.custom_settings?.team_size || 2}v{room.custom_settings?.team_size || 2} {t('battle.team_battle')}
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
                      {t('battle.waiting_join')}
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
                      {t('battle.waiting_join')}
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
                                {participant.user_id === room.created_by ? t('battle.host') : `${t('battle.player')} ${index + 1}`}
                              </p>
                            </div>
                          </div>
                          <div>
                            {participant.score === 1 ? (
                              <Badge className="bg-green-500">
                                <Check className="h-3 w-3 mr-1" />
                                {t('battle.ready_status')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {t('battle.waiting')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-14 text-muted-foreground">
                          <span>{t('battle.waiting_join')}</span>
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
                  {t('battle.switch_to_team')} {myParticipant.team === 'A' ? 'Team B' : 'Team A'}
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
              {t('battle.room_chat')}
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
                placeholder={t('battle.enter_message')}
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
              {t('battle.leave_room')}
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
                        {t('battle.cancel_ready')}
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {t('battle.ready')}
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
                      {t('battle.start_game')}
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
              {t('battle.spectating_hint')}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 分享对话框 */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        roomCode={room.room_code}
        roomMode={room.mode === 'versus' ? t('battle.1v1') : room.mode === 'battle_royale' ? t('battle.battle_royale') : t('battle.league')}
      />
    </div>
  );
};

export default BattleRoomLobby;
