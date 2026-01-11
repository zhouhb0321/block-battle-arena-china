
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit, AlertTriangle } from 'lucide-react';

interface UsernameChangeDialogProps {
  trigger?: React.ReactNode;
}

const UsernameChangeDialog: React.FC<UsernameChangeDialogProps> = ({ trigger }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (isOpen && user && !user.isGuest) {
      loadUserProfile();
    }
  }, [isOpen, user]);

  const loadUserProfile = async () => {
    if (!user || user.isGuest) return;

    try {
      // Use maybeSingle() to avoid PGRST116 error when no data exists
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, username_changes_count, user_type, username_last_changed_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      if (data) {
        setUserProfile(data);
        setNewUsername(data.username || '');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const canChangeUsername = () => {
    if (!userProfile) return false;
    
    const userType = userProfile.user_type;
    const changesCount = userProfile.username_changes_count || 0;
    
    // 付费和捐赠用户可以无限修改
    if (userType === 'premium' || userType === 'donor' || userType === 'vip') {
      return true;
    }
    
    // 普通用户只能修改一次
    return changesCount === 0;
  };

  const handleUsernameChange = async () => {
    if (!user || user.isGuest || !newUsername.trim()) {
      toast.error('请输入有效的用户名');
      return;
    }

    const trimmedUsername = newUsername.trim();

    // Comprehensive username validation
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      toast.error('用户名长度必须在3-20个字符之间');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      toast.error('用户名只能包含字母、数字、下划线和连字符');
      return;
    }

    // Check for forbidden patterns
    const forbiddenPatterns = [
      /^admin/i, /^root/i, /^system/i, /^null$/i, /^undefined$/i,
      /^guest/i, /^test/i, /^demo/i, /fuck|shit|damn/i
    ];
    
    if (forbiddenPatterns.some(pattern => pattern.test(trimmedUsername))) {
      toast.error('用户名包含不允许的内容');
      return;
    }

    if (trimmedUsername === userProfile?.username) {
      toast.error('新用户名不能与当前用户名相同');
      return;
    }

    if (!canChangeUsername()) {
      toast.error('您已达到用户名修改次数限制');
      return;
    }

    setLoading(true);

    try {
      // 检查用户名是否已存在
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking username:', checkError);
        toast.error('检查用户名时出错');
        return;
      }

      if (existingUser) {
        toast.error('该用户名已被使用');
        return;
      }

      // 更新用户名
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          username: trimmedUsername,
          username_changes_count: (userProfile?.username_changes_count || 0) + 1,
          username_last_changed_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating username:', updateError);
        toast.error('更新用户名失败');
        return;
      }

      toast.success('用户名更新成功！');
      setIsOpen(false);
      
      // 重新加载用户配置
      loadUserProfile();
    } catch (error) {
      console.error('Error updating username:', error);
      toast.error('更新用户名时出错');
    } finally {
      setLoading(false);
    }
  };

  const getRemainingChanges = () => {
    if (!userProfile) return 0;
    
    const userType = userProfile.user_type;
    const changesCount = userProfile.username_changes_count || 0;
    
    if (userType === 'premium' || userType === 'donor' || userType === 'vip') {
      return '无限制';
    }
    
    return Math.max(0, 1 - changesCount);
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'premium': return '付费用户';
      case 'donor': return '捐赠用户';
      case 'vip': return 'VIP用户';
      default: return '普通用户';
    }
  };

  if (!user || user.isGuest) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            修改用户名
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>修改用户名</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {userProfile && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">当前用户名:</span>
                <span className="font-medium">{userProfile.username}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">用户类型:</span>
                <span className="font-medium">{getUserTypeLabel(userProfile.user_type)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">剩余修改次数:</span>
                <span className="font-medium">{getRemainingChanges()}</span>
              </div>
              {userProfile.username_last_changed_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">上次修改:</span>
                  <span className="font-medium">
                    {new Date(userProfile.username_last_changed_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="newUsername">新用户名</Label>
            <Input
              id="newUsername"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="输入新的用户名"
              disabled={loading}
            />
          </div>

          {!canChangeUsername() && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">修改次数已用完</p>
                <p>普通用户只能修改一次用户名。升级为付费用户可获得无限修改次数。</p>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={handleUsernameChange}
              disabled={loading || !canChangeUsername() || !newUsername.trim()}
              className="flex-1"
            >
              {loading ? '更新中...' : '确认修改'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              取消
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameChangeDialog;
