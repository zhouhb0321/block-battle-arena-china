import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  [userId: string]: {
    online_at: string;
    username: string;
  }[];
}

export const useFriendPresence = (userId: string | undefined, friendIds: string[]) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId || friendIds.length === 0) return;

    // 创建 Presence 频道
    const presenceChannel = supabase.channel('friends_presence', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // 监听在线状态变化
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceState>();
        const online = new Set<string>();
        
        Object.keys(state).forEach((key) => {
          if (friendIds.includes(key)) {
            online.add(key);
          }
        });
        
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (friendIds.includes(key)) {
          setOnlineUsers(prev => new Set(prev).add(key));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // 上报自己的在线状态
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            username: userId,
          });
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [userId, friendIds.join(',')]);

  return { onlineUsers };
};
