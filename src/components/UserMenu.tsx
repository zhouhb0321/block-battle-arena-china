
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameRecording } from '@/contexts/GameRecordingContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { User, Settings, LogOut, Shield, Trophy, CreditCard } from 'lucide-react';
import UserProfileSettings from './UserProfileSettings';
import SubscriptionPlans from './SubscriptionPlans';

interface UserMenuProps {
  onNavigate: (page: string) => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onNavigate }) => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const gameRecording = useGameRecording();
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      console.log('开始登出...', { 
        gameActive: gameRecording.isActive,
        isRecording: gameRecording.isRecording 
      });
      
      // 检查是否有进行中的游戏
      if (gameRecording.isActive || gameRecording.isRecording) {
        const confirmMessage = t('saveReplayBeforeLogout') || '游戏进行中，是否保存录像后退出？\n\n选择"确定"保存录像，选择"取消"直接退出（不保存录像）';
        const shouldSave = window.confirm(confirmMessage);
        
        if (shouldSave) {
          console.log('用户选择保存录像');
          const saved = await gameRecording.saveAndQuit();
          
          if (!saved) {
            const forceQuit = window.confirm(
              t('replaySaveFailed') || '录像保存失败，是否仍要退出？'
            );
            if (!forceQuit) {
              console.log('用户取消退出');
              return;
            }
          }
        } else {
          console.log('用户选择不保存录像，直接退出');
        }
      }
      
      // 执行注销
      await signOut(true);
      console.log('登出成功');
    } catch (error) {
      console.warn('登出时发生错误，但本地状态已清理:', error);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('登出详细错误信息:', error);
      }
    }
  };

  const getUserLevel = () => {
    // 模拟用户等级计算
    return Math.floor(Math.random() * 50) + 1;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">
              {user.username || user.email}
            </span>
            {user.isAdmin && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                {t('admin')}
              </Badge>
            )}
            {user.isGuest && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                Guest
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="font-medium">{user.username || user.email}</span>
            <span className="text-sm text-muted-foreground">
              {t('level')} {getUserLevel()}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowProfileSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />
            {t('userProfile')}
          </DropdownMenuItem>
          
          {!user.isGuest && (
            <DropdownMenuItem onClick={() => setShowSubscriptionPlans(true)}>
              <CreditCard className="w-4 h-4 mr-2" />
              {t('premium')}
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={() => onNavigate('leaderboard')}>
            <Trophy className="w-4 h-4 mr-2" />
            {t('leaderboard')}
          </DropdownMenuItem>
          
          {user.isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate('admin')}>
                <Shield className="w-4 h-4 mr-2" />
                {t('adminPanel')}
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            {t('signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showProfileSettings && (
        <UserProfileSettings 
          onClose={() => setShowProfileSettings(false)} 
        />
      )}

      {showSubscriptionPlans && (
        <SubscriptionPlans 
          onClose={() => setShowSubscriptionPlans(false)} 
        />
      )}
    </>
  );
};

export default UserMenu;
