import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useFriendPresence } from '@/hooks/useFriendPresence';
import FriendLeaderboard from './FriendLeaderboard';
import FriendActivity from './FriendActivity';
import { Users, MessageCircle, UserPlus, X, Check, UserX } from 'lucide-react';
import { toast } from 'sonner';

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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(false);

  const MAX_FRIENDS = user?.isGuest ? 0 : 50;

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
      // 收到的请求
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

      // 发出的请求
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
      toast.error(`最多只能添加${MAX_FRIENDS}个好友`);
      return;
    }

    try {
      // 1. 检查用户名是否存在
      const { data: targetUser, error: userError } = await supabase
        .from('user_profiles')
        .select('id, username')
        .eq('username', searchUsername.trim())
        .maybeSingle();

      if (userError || !targetUser) {
        toast.error('用户不存在');
        return;
      }

      if (targetUser.id === user.id) {
        toast.error('不能添加自己为好友');
        return;
      }

      // 2. 检查是否已经是好友
      const { data: existingFriend } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existingFriend) {
        toast.error('已经是好友');
        return;
      }

      // 3. 检查是否已发送过请求
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', user.id)
        .eq('receiver_id', targetUser.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        toast.error('已发送过好友请求');
        return;
      }

      // 4. 创建好友请求
      await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetUser.id,
          message: `来自 ${user.username} 的好友请求`
        });

      toast.success('好友请求已发送');
      setSearchUsername('');
      loadFriendRequests();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('发送好友请求失败');
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    if (!user || user.isGuest) return;

    try {
      if (action === 'accept') {
        // 1. 获取请求信息
        const { data: request } = await supabase
          .from('friend_requests')
          .select('sender_id, receiver_id')
          .eq('id', requestId)
          .single();

        if (!request) {
          toast.error('好友请求不存在');
          return;
        }

        // 2. 创建双向好友关系
        await supabase.from('friendships').insert([
          { user_id: request.sender_id, friend_id: request.receiver_id, status: 'accepted' },
          { user_id: request.receiver_id, friend_id: request.sender_id, status: 'accepted' }
        ]);

        // 3. 更新请求状态
        await supabase
          .from('friend_requests')
          .update({ status: 'accepted' })
          .eq('id', requestId);

        toast.success('已添加好友');
      } else {
        // 拒绝请求
        await supabase
          .from('friend_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId);

        toast.success('已拒绝请求');
      }

      // 重新加载数据
      loadFriends();
      loadFriendRequests();
    } catch (error) {
      console.error('Error handling friend request:', error);
      toast.error('操作失败');
    }
  };

  if (user?.isGuest) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>好友系统</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">游客用户无法使用好友功能</p>
            <p className="text-sm text-muted-foreground mt-2">请注册账户后使用此功能</p>
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
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-5xl h-[700px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>好友系统</span>
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
                好友 ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests">
                请求 ({friendRequests.length})
              </TabsTrigger>
              <TabsTrigger value="add">添加好友</TabsTrigger>
              <TabsTrigger value="leaderboard">排行榜</TabsTrigger>
              <TabsTrigger value="activity">动态</TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="flex-1 mt-4 overflow-y-auto">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : friendsWithOnlineStatus.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>还没有好友</p>
                    <p className="text-sm">去添加一些好友吧！</p>
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
                            {friend.status === 'online' ? '在线' : '离线'}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        聊天
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
                    <p>没有好友请求</p>
                  </div>
                ) : (
                  friendRequests.map(request => (
                    <div key={request.id} className="p-3 border rounded-lg bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {request.type === 'incoming' ? '来自' : '发送给'} {request.sender_username}
                          </p>
                          <p className="text-sm text-muted-foreground">{request.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(request.created_at).toLocaleDateString('zh-CN')}
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
                    placeholder="输入用户名..."
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendFriendRequest()}
                  />
                  <Button onClick={sendFriendRequest} disabled={!searchUsername.trim()}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    添加
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• 免费用户最多可添加 {MAX_FRIENDS} 个好友</p>
                  <p>• 付费用户可获得更多好友名额</p>
                  <p>• 向陌生人最多可发送2条消息</p>
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
  );
};

export default FriendSystem;
