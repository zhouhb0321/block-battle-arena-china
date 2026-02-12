import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useFriendPresence } from '@/hooks/useFriendPresence';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import FriendLeaderboard from './FriendLeaderboard';
import FriendActivity from './FriendActivity';
import PrivateChatDialog from './PrivateChatDialog';
import { Users, MessageCircle, UserPlus, X, Check, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useModalClose } from '@/hooks/useModalClose';

interface Friend {
  id: string;
  username: string;
  status: 'online' | 'offline';
  avatar_url?: string;
}

interface FriendRequest {
  id: string;
  sender_username: string;
  sender_id: string;
  message?: string;
  created_at: string;
  type: 'incoming' | 'outgoing';
}

interface FriendSystemProps {
  onClose: () => void;
}

const FriendSystem: React.FC<FriendSystemProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(false);
  
  // Chat dialog state
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  const MAX_FRIENDS = user?.isGuest ? 0 : 50;
  const { unreadByFriend, markAsRead } = useUnreadMessages();

  // Use unified modal close hook
  const { handleOverlayClick, handleContentClick } = useModalClose({
    isOpen: true,
    onClose,
    closeOnEscape: true,
    closeOnOverlayClick: true
  });

  const { onlineUsers } = useFriendPresence(
    user?.id, 
    friends.map(f => f.id)
  );

  useEffect(() => {
    if (user && !user.isGuest) {
      loadFriends();
      loadFriendRequests();
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user || user.isGuest) return;
    
    setLoading(true);
    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          user_profiles!friendships_friend_id_fkey (
            id,
            username,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;

      const friendList = (friendships || []).map(f => ({
        id: f.friend_id,
        username: (f as any).user_profiles?.username || 'Unknown',
        avatar_url: (f as any).user_profiles?.avatar_url,
        status: 'offline' as 'online' | 'offline'
      }));

      setFriends(friendList);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    if (!user || user.isGuest) return;

    try {
      const { data: incoming } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          message,
          created_at,
          user_profiles!friend_requests_sender_id_fkey (
            username
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      const { data: outgoing } = await supabase
        .from('friend_requests')
        .select(`
          id,
          receiver_id,
          message,
          created_at,
          user_profiles!friend_requests_receiver_id_fkey (
            username
          )
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      const requests = [
        ...(incoming || []).map(r => ({
          id: r.id,
          sender_id: r.sender_id,
          sender_username: (r as any).user_profiles?.username || 'Unknown',
          message: r.message,
          created_at: r.created_at,
          type: 'incoming' as const
        })),
        ...(outgoing || []).map(r => ({
          id: r.id,
          sender_id: (r as any).receiver_id,
          sender_username: (r as any).user_profiles?.username || 'Unknown',
          message: r.message,
          created_at: r.created_at,
          type: 'outgoing' as const
        }))
      ];

      setFriendRequests(requests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!user || user.isGuest || !searchUsername.trim()) return;

    if (friends.length >= MAX_FRIENDS) {
      toast.error(t('friend.maxFriendsReached'));
      return;
    }

    try {
      const { data: targetUser, error: userError } = await supabase
        .from('user_profiles')
        .select('id, username')
        .eq('username', searchUsername.trim())
        .maybeSingle();

      if (userError || !targetUser) {
        toast.error(t('friend.userNotFound'));
        return;
      }

      if (targetUser.id === user.id) {
        toast.error(t('friend.cannotAddSelf'));
        return;
      }

      const { data: existingFriend } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existingFriend) {
        toast.error(t('friend.alreadyFriends'));
        return;
      }

      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', user.id)
        .eq('receiver_id', targetUser.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        toast.error(t('friend.requestAlreadySent'));
        return;
      }

      await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetUser.id,
          message: t('friend.requestMessage').replace('{username}', user.username || '')
        });

      toast.success(t('friend.requestSent'));
      setSearchUsername('');
      loadFriendRequests();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error(t('friend.requestFailed'));
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    if (!user || user.isGuest) return;

    try {
      if (action === 'accept') {
        const { data: request } = await supabase
          .from('friend_requests')
          .select('sender_id, receiver_id')
          .eq('id', requestId)
          .single();

        if (!request) {
          toast.error(t('friend.requestNotFound'));
          return;
        }

        await supabase.from('friendships').insert([
          { user_id: request.sender_id, friend_id: request.receiver_id, status: 'accepted' },
          { user_id: request.receiver_id, friend_id: request.sender_id, status: 'accepted' }
        ]);

        await supabase
          .from('friend_requests')
          .update({ status: 'accepted' })
          .eq('id', requestId);

        toast.success(t('friend.friendAdded'));
      } else {
        await supabase
          .from('friend_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId);

        toast.success(t('friend.requestRejected'));
      }

      loadFriends();
      loadFriendRequests();
    } catch (error) {
      console.error('Error handling friend request:', error);
      toast.error(t('common.failed'));
    }
  };

  const openChat = (friend: Friend) => {
    setSelectedFriend(friend);
    setChatOpen(true);
    markAsRead(friend.id);
  };

  const getLocale = () => {
    const locales: Record<string, string> = {
      'zh': 'zh-CN',
      'zh-TW': 'zh-TW',
      'en': 'en-US',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'es': 'es-ES'
    };
    return locales[language] || 'en-US';
  };

  if (user?.isGuest) {
    return (
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={handleOverlayClick}
      >
        <Card className="w-full max-w-md" onClick={handleContentClick}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('friend.system')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('friend.guestRestricted')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('friend.registerToUse')}</p>
            <Button onClick={onClose} className="mt-4">
              {t('common.close')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const friendsWithOnlineStatus = friends.map(friend => ({
    ...friend,
    status: onlineUsers.has(friend.id) ? 'online' as const : 'offline' as const
  }));

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={handleOverlayClick}
      >
        <Card 
          className="w-full max-w-5xl h-[700px] flex flex-col"
          onClick={handleContentClick}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>{t('friend.system')}</span>
                <Badge variant="secondary">
                  {friends.length}/{MAX_FRIENDS}
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="friends">
                  {t('friend.friends')} ({friends.length})
                </TabsTrigger>
                <TabsTrigger value="requests">
                  {t('friend.requests')} ({friendRequests.length})
                </TabsTrigger>
                <TabsTrigger value="add">{t('friend.addFriend')}</TabsTrigger>
                <TabsTrigger value="leaderboard">{t('friend.leaderboard')}</TabsTrigger>
                <TabsTrigger value="activity">{t('friend.activity')}</TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="flex-1 mt-4 overflow-y-auto">
                <div className="space-y-2">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
                  ) : friendsWithOnlineStatus.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{t('friend.noFriends')}</p>
                      <p className="text-sm">{t('friend.addSomeFriends')}</p>
                    </div>
                  ) : (
                    friendsWithOnlineStatus.map(friend => (
                      <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                              {friend.username.charAt(0).toUpperCase()}
                            </div>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                              friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{friend.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {friend.status === 'online' ? t('friend.online') : t('friend.offline')}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openChat(friend)} className="relative">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {t('friend.chat')}
                          {(unreadByFriend[friend.id] || 0) > 0 && (
                            <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full">
                              {unreadByFriend[friend.id]}
                            </Badge>
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="requests" className="flex-1 mt-4 overflow-y-auto">
                <div className="space-y-2">
                  {friendRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{t('friend.noRequests')}</p>
                    </div>
                  ) : (
                    friendRequests.map(request => (
                      <div key={request.id} className="p-3 border rounded-lg bg-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {request.type === 'incoming' ? t('friend.from') : t('friend.to')} {request.sender_username}
                            </p>
                            <p className="text-sm text-muted-foreground">{request.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(request.created_at).toLocaleDateString(getLocale())}
                            </p>
                          </div>
                          {request.type === 'incoming' && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleFriendRequest(request.id, 'accept')}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFriendRequest(request.id, 'reject')}
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="add" className="flex-1 mt-4">
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder={t('friend.searchPlaceholder')}
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendFriendRequest()}
                    />
                    <Button onClick={sendFriendRequest} disabled={!searchUsername.trim()}>
                      <UserPlus className="w-4 h-4 mr-1" />
                      {t('friend.add')}
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• {t('friend.freeUserLimit').replace('{limit}', String(MAX_FRIENDS))}</p>
                    <p>• {t('friend.paidUserMore')}</p>
                    <p>• {t('friend.strangerLimit')}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="leaderboard" className="flex-1 mt-4 overflow-y-auto">
                <FriendLeaderboard 
                  userId={user?.id || ''} 
                  friendIds={friends.map(f => f.id)} 
                />
              </TabsContent>

              <TabsContent value="activity" className="flex-1 mt-4 overflow-y-auto">
                <FriendActivity friendIds={friends.map(f => f.id)} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Private Chat Dialog */}
      {selectedFriend && (
        <PrivateChatDialog
          friendId={selectedFriend.id}
          friendUsername={selectedFriend.username}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
};

export default FriendSystem;
