import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageCircle, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  user_id: string;
  username: string;
  message: string;
  message_type: 'chat' | 'system' | 'join' | 'leave';
  created_at: string;
}

interface RoomChatProps {
  roomId: string;
  className?: string;
}

export const RoomChat: React.FC<RoomChatProps> = ({ roomId, className = '' }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 加载历史消息
  useEffect(() => {
    loadMessages();
  }, [roomId]);

  // 订阅实时消息
  useEffect(() => {
    const channel = supabase
      .channel(`room_${roomId}_chat`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // ✅ 避免重复添加（乐观更新已添加的消息）
          setMessages(prev => {
            // 检查是否已存在（通过 ID 或临时 ID 匹配）
            const exists = prev.some(msg => 
              msg.id === newMsg.id || 
              (msg.user_id === newMsg.user_id && 
               msg.message === newMsg.message && 
               msg.id.startsWith('temp-'))
            );
            if (exists) return prev;
            return [...prev, newMsg];
          });
          
          // 自动滚动到底部
          setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
      
      // 滚动到底部
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // ✅ 乐观更新：立即添加到本地消息列表
    const optimisticMessage: Message = {
      id: tempId,
      user_id: user.id,
      username: user.username || 'Player',
      message: messageText,
      message_type: 'chat',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    
    // 滚动到底部
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          username: user.username || 'Player',
          message: messageText,
          message_type: 'chat'
        })
        .select()
        .single();

      if (error) throw error;
      
      // ✅ 用真实数据替换乐观消息（避免重复）
      if (data) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...data, message_type: data.message_type as Message['message_type'] } : msg
        ));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('发送消息失败');
      // ✅ 发送失败时移除乐观消息
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageText); // 恢复输入内容
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (msg: Message) => {
    // 系统消息
    if (msg.message_type === 'system' || msg.message_type === 'join' || msg.message_type === 'leave') {
      return (
        <div key={msg.id} className="flex items-center justify-center py-2">
          <Badge variant="secondary" className="text-xs gap-1">
            {msg.message_type === 'join' && <UserPlus className="w-3 h-3" />}
            {msg.message_type === 'leave' && <UserMinus className="w-3 h-3" />}
            {msg.message}
          </Badge>
        </div>
      );
    }

    // 用户消息
    const isOwnMessage = msg.user_id === user?.id;
    
    return (
      <div
        key={msg.id}
        className={`flex flex-col gap-1 py-2 px-3 rounded-lg ${
          isOwnMessage 
            ? 'bg-primary/10 ml-8' 
            : 'bg-muted mr-8'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-semibold ${
            isOwnMessage ? 'text-primary' : 'text-foreground'
          }`}>
            {msg.username}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(msg.created_at)}
          </span>
        </div>
        <p className="text-sm break-words">{msg.message}</p>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="w-4 h-4" />
          房间聊天
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-4">
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                暂无消息
              </div>
            ) : (
              messages.map(renderMessage)
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* 输入框 */}
        <form onSubmit={sendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="输入消息..."
              maxLength={200}
              disabled={isLoading || !user}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!newMessage.trim() || isLoading || !user}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RoomChat;
