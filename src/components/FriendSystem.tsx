
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, MessageCircle, UserPlus, Send, X } from 'lucide-react';
import { toast } from 'sonner';

interface Friend {
  id: string;
  username: string;
  status: 'online' | 'offline';
  last_seen?: string;
}

interface FriendRequest {
  id: string;
  sender_username: string;
  sender_id: string;
  message?: string;
  created_at: string;
  type: 'incoming' | 'outgoing';
}

interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
}

interface FriendSystemProps {
  onClose: () => void;
}

const FriendSystem: React.FC<FriendSystemProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [activeTab, setActiveTab] = useState('friends');

  const MAX_FRIENDS = user?.isGuest ? 0 : 50; // 游客不能添加好友，普通用户50个

  useEffect(() => {
    if (user && !user.isGuest) {
      loadFriends();
      loadFriendRequests();
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user || user.isGuest) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:user_profiles!friendships_friend_id_fkey(username, id)
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;

      const friendList = data?.map(friendship => ({
        id: friendship.friend.id,
        username: friendship.friend.username,
        status: 'offline' as const, // 简化实现，不做实时在线状态
      })) || [];

      setFriends(friendList);
    } catch (error) {
      console.error('加载好友列表失败:', error);
    }
  };

  const loadFriendRequests = async () => {
    if (!user || user.isGuest) return;

    try {
      // 加载收到的好友请求
      const { data: incoming, error: incomingError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:user_profiles!friend_requests_sender_id_fkey(username)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (incomingError) throw incomingError;

      // 加载发出的好友请求
      const { data: outgoing, error: outgoingError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          receiver:user_profiles!friend_requests_receiver_id_fkey(username)
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (outgoingError) throw outgoingError;

      const requests: FriendRequest[] = [
        ...(incoming?.map(req => ({
          id: req.id,
          sender_username: req.sender.username,
          sender_id: req.sender_id,
          message: req.message,
          created_at: req.created_at,
          type: 'incoming' as const
        })) || []),
        ...(outgoing?.map(req => ({
          id: req.id,
          sender_username: req.receiver.username,
          sender_id: req.receiver_id,
          message: req.message,
          created_at: req.created_at,
          type: 'outgoing' as const
        })) || [])
      ];

      setFriendRequests(requests);
    } catch (error) {
      console.error('加载好友请求失败:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!user || user.isGuest || !searchUsername.trim()) return;

    if (friends.length >= MAX_FRIENDS) {
      toast.error(`最多只能添加${MAX_FRIENDS}个好友`);
      return;
    }

    try {
      // 查找用户
      const { data: targetUser, error: userError } = await supabase
        .from('user_profiles')
        .select('id, username')
        .eq('username', searchUsername.trim())
        .single();

      if (userError || !targetUser) {
        toast.error('用户不存在');
        return;
      }

      if (targetUser.id === user.id) {
        toast.error('不能添加自己为好友');
        return;
      }

      // 检查是否已经是好友
      const { data: existingFriend } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
        .single();

      if (existingFriend) {
        toast.error('已经是好友了');
        return;
      }

      // 检查是否已发送请求
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', user.id)
        .eq('receiver_id', targetUser.id)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        toast.error('已发送好友请求，请等待对方回应');
        return;
      }

      // 发送好友请求
      const { error: requestError } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetUser.id,
          message: `${user.username} 想要添加您为好友`
        });

      if (requestError) throw requestError;

      toast.success('好友请求已发送');
      setSearchUsername('');
      loadFriendRequests();
    } catch (error) {
      console.error('发送好友请求失败:', error);
      toast.error('发送好友请求失败');
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    if (!user) return;

    try {
      // 更新请求状态
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      if (action === 'accept') {
        // 获取请求详情
        const request = friendRequests.find(r => r.id === requestId);
        if (request && request.type === 'incoming') {
          // 创建友谊关系
          const { error: friendshipError } = await supabase
            .from('friendships')
            .insert([
              { user_id: user.id, friend_id: request.sender_id },
              { user_id: request.sender_id, friend_id: user.id }
            ]);

          if (friendshipError) throw friendshipError;
          
          toast.success('已添加好友');
          loadFriends();
        }
      }

      loadFriendRequests();
    } catch (error) {
      console.error('处理好友请求失败:', error);
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
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">游客用户无法使用好友功能</p>
            <p className="text-sm text-gray-500 mt-2">请注册账户后使用此功能</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-[600px] flex flex-col">
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="friends">
                好友列表 ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests">
                好友请求 ({friendRequests.length})
              </TabsTrigger>
              <TabsTrigger value="add">添加好友</TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="flex-1 mt-4">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {friends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{friend.username}</p>
                        <p className="text-sm text-gray-500">{friend.status}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedFriend(friend)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      聊天
                    </Button>
                  </div>
                ))}
                {friends.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>还没有好友</p>
                    <p className="text-sm">去添加一些好友吧！</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="requests" className="flex-1 mt-4">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {friendRequests.map(request => (
                  <div key={request.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {request.type === 'incoming' ? '收到来自' : '发送给'} {request.sender_username}
                        </p>
                        <p className="text-sm text-gray-500">{request.message}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {request.type === 'incoming' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleFriendRequest(request.id, 'accept')}
                          >
                            接受
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFriendRequest(request.id, 'reject')}
                          >
                            拒绝
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {friendRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <UserPlus className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>没有好友请求</p>
                  </div>
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
                <div className="text-sm text-gray-500">
                  <p>• 免费用户最多可添加 {MAX_FRIENDS} 个好友</p>
                  <p>• 付费用户可获得更多好友名额</p>
                  <p>• 向陌生人最多可发送2条消息</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FriendSystem;
