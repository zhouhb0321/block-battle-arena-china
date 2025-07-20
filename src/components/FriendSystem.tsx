import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Users, MessageCircle, UserPlus, X } from 'lucide-react';
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

interface FriendSystemProps {
  onClose: () => void;
}

const FriendSystem: React.FC<FriendSystemProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
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
    // TODO: Implement when database types are updated
    setFriends([]);
  };

  const loadFriendRequests = async () => {
    // TODO: Implement when database types are updated
    setFriendRequests([]);
  };

  const sendFriendRequest = async () => {
    if (!user || user.isGuest || !searchUsername.trim()) return;

    if (friends.length >= MAX_FRIENDS) {
      toast.error(`最多只能添加${MAX_FRIENDS}个好友`);
      return;
    }

    // TODO: Implement when database types are updated
    toast.success('好友请求已发送');
    setSearchUsername('');
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    // TODO: Implement when database types are updated
    toast.success(action === 'accept' ? '已添加好友' : '已拒绝请求');
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
