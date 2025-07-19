
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Settings, Trophy, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UserMenuProps {
  onSettingsClick: () => void;
  onProfileClick?: () => void;
  onAdminPanelClick?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onSettingsClick, onProfileClick, onAdminPanelClick }) => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      toast.success('已成功退出登录');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('退出登录失败');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} alt={user.username} />
            <AvatarFallback className="bg-blue-500 text-white">
              {getUserInitials(user.username || 'User')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium text-sm">{user.username}</p>
            {!user.isGuest && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>等级 {user.rating}</span>
              {user.isPremium && (
                <span className="bg-gold text-white px-1 rounded text-xs">VIP</span>
              )}
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {onProfileClick && (
          <DropdownMenuItem onClick={onProfileClick}>
            <User className="mr-2 h-4 w-4" />
            个人资料
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={onSettingsClick}>
          <Settings className="mr-2 h-4 w-4" />
          设置
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <Trophy className="mr-2 h-4 w-4" />
          排行榜
        </DropdownMenuItem>
        
        {user.isAdmin && onAdminPanelClick && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                console.log('用户菜单管理面板按钮点击', { 
                  isAdmin: user.isAdmin, 
                  hasCallback: !!onAdminPanelClick,
                  email: user.email,
                  isPremium: user.isPremium
                });
                onAdminPanelClick?.();
              }}
              className="text-purple-600 focus:text-purple-600"
            >
              <Shield className="mr-2 h-4 w-4" />
              管理面板
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? '退出中...' : '退出登录'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
