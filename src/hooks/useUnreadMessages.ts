import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UnreadCounts {
  total: number;
  byFriend: Record<string, number>;
}

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ total: 0, byFriend: {} });

  const fetchUnreadCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('private_messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      const byFriend: Record<string, number> = {};
      (data || []).forEach(msg => {
        byFriend[msg.sender_id] = (byFriend[msg.sender_id] || 0) + 1;
      });

      setUnreadCounts({
        total: data?.length || 0,
        byFriend,
      });
    } catch (err) {
      console.error('Failed to fetch unread counts:', err);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`unread_messages_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as { sender_id: string; is_read: boolean };
          if (!newMsg.is_read) {
            setUnreadCounts(prev => ({
              total: prev.total + 1,
              byFriend: {
                ...prev.byFriend,
                [newMsg.sender_id]: (prev.byFriend[newMsg.sender_id] || 0) + 1,
              },
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Re-fetch on updates (mark as read)
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUnreadCounts]);

  const markAsRead = useCallback(async (friendId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('private_messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', friendId)
        .eq('is_read', false);

      // Optimistically update local state
      setUnreadCounts(prev => {
        const friendCount = prev.byFriend[friendId] || 0;
        const newByFriend = { ...prev.byFriend };
        delete newByFriend[friendId];
        return {
          total: Math.max(0, prev.total - friendCount),
          byFriend: newByFriend,
        };
      });
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, [user?.id]);

  return {
    unreadCount: unreadCounts.total,
    unreadByFriend: unreadCounts.byFriend,
    markAsRead,
    refetch: fetchUnreadCounts,
  };
};
