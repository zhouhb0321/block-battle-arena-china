import React, { useState, useEffect, useCallback } from 'react';
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
import { 
  User, Settings, LogOut, Shield, Trophy, CreditCard, Users, Award,
  GraduationCap, History, Swords, Cog, Keyboard, X
} from 'lucide-react';
import UserProfileSettings from './UserProfileSettings';
import SubscriptionPlans from './SubscriptionPlans';
import FriendSystem from './FriendSystem';
import BadgeCollection from './BadgeCollection';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useModalClose } from '@/hooks/useModalClose';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

// Separate BadgeCollection modal component for proper close handling
const BadgeCollectionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { handleOverlayClick, handleContentClick } = useModalClose({
    isOpen: true,
    onClose,
    closeOnEscape: true,
    closeOnOverlayClick: true
  });

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={handleOverlayClick}
    >
      <div 
        className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-background rounded-lg relative"
        onClick={handleContentClick}
      >
        {/* Explicit close button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
        <BadgeCollection onClose={onClose} />
      </div>
    </div>
  );
};

interface UserMenuProps {
  onNavigate: (page: string) => void;
}

// 快捷键映射
const KEYBOARD_SHORTCUTS: Record<string, { action: string; label: string }> = {
  'p': { action: 'practice', label: 'P' },
  's': { action: 'settings', label: 'S' },
  'r': { action: 'replays', label: 'R' },
  'h': { action: 'battle-history', label: 'H' },
  'l': { action: 'leaderboard', label: 'L' },
};

const UserMenu: React.FC<UserMenuProps> = ({ onNavigate }) => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const gameRecording = useGameRecording();
  const { unreadCount } = useUnreadMessages();
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [showFriendSystem, setShowFriendSystem] = useState(false);
  const [showBadgeCollection, setShowBadgeCollection] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 键盘快捷键处理 - 游戏进行中禁用导航快捷键
  const handleKeyboardShortcut = useCallback((e: KeyboardEvent) => {
    // 游戏进行中或回放中，不处理导航快捷键（避免与游戏控制键冲突）
    if (gameRecording.isActive || gameRecording.isReplaying) {
      return;
    }

    // 忽略在输入框中的按键
    if (
      e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLTextAreaElement ||
      e.ctrlKey || e.metaKey || e.altKey
    ) {
      return;
    }

    const key = e.key.toLowerCase();
    const shortcut = KEYBOARD_SHORTCUTS[key];
    
    if (shortcut && user) {
      e.preventDefault();
      onNavigate(shortcut.action);
    }
  }, [onNavigate, user, gameRecording.isActive, gameRecording.isReplaying]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [handleKeyboardShortcut]);

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

  // 渲染带快捷键提示的菜单项
  const renderMenuItem = (
    icon: React.ReactNode, 
    label: string, 
    action: string, 
    shortcutKey?: string
  ) => (
    <DropdownMenuItem 
      onClick={() => onNavigate(action)}
      className="flex items-center justify-between"
    >
      <span className="flex items-center">
        {icon}
        <span className="ml-2">{label}</span>
      </span>
      {shortcutKey && (
        <kbd className="hidden sm:inline-flex ml-auto h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          {shortcutKey}
        </kbd>
      )}
    </DropdownMenuItem>
  );

  return (
    <>
      <TooltipProvider>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5 px-2 sm:px-3">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm max-w-[100px] truncate">
                    {user.username || user.email}
                  </span>
                  {user.isAdmin && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 hidden sm:inline-flex">
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
            </TooltipTrigger>
            <TooltipContent side="bottom" className="sm:hidden">
              <p>{user.username || user.email}</p>
            </TooltipContent>
          </Tooltip>
          
          <DropdownMenuContent 
            align="end" 
            className="w-56 sm:w-64 max-h-[80vh] overflow-y-auto"
            sideOffset={8}
          >
            <DropdownMenuLabel className="flex flex-col py-3">
              <span className="font-medium truncate">{user.username || user.email}</span>
              <span className="text-sm text-muted-foreground">
                {t('level')} {getUserLevel()}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* 游戏功能区 */}
            <div className="py-1">
              <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('game.title') || 'Game'}
              </p>
              {renderMenuItem(
                <GraduationCap className="w-4 h-4" />,
                t('nav.practice'),
                'practice',
                'P'
              )}
              {renderMenuItem(
                <History className="w-4 h-4" />,
                t('nav.replays'),
                'replays',
                'R'
              )}
              {renderMenuItem(
                <Swords className="w-4 h-4" />,
                t('battleHistory') || '对战历史',
                'battle-history',
                'H'
              )}
            </div>
            
            <DropdownMenuSeparator />
            
            {/* 设置与个人 */}
            <div className="py-1">
              <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('nav.settings') || 'Account'}
              </p>
              {renderMenuItem(
                <Cog className="w-4 h-4" />,
                t('nav.settings'),
                'settings',
                'S'
              )}
              
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
              
              {!user.isGuest && (
                <DropdownMenuItem onClick={() => setShowFriendSystem(true)} className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    {t('friends') || '好友'}
                  </span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center rounded-full ml-2">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
              )}
              
              {!user.isGuest && (
                <DropdownMenuItem onClick={() => setShowBadgeCollection(true)}>
                  <Award className="w-4 h-4 mr-2" />
                  {t('badges') || '徽章'}
                </DropdownMenuItem>
              )}
            </div>
            
            <DropdownMenuSeparator />
            
            {renderMenuItem(
              <Trophy className="w-4 h-4" />,
              t('leaderboard'),
              'leaderboard',
              'L'
            )}
            
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
            
            {/* 快捷键提示 */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-2 text-xs text-muted-foreground">
              <Keyboard className="w-3 h-3" />
              <span>{t('keyboardShortcuts') || 'Keyboard shortcuts available'}</span>
            </div>
            
            <DropdownMenuSeparator className="sm:hidden" />
            
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>

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

      {showFriendSystem && (
        <FriendSystem onClose={() => setShowFriendSystem(false)} />
      )}

      {showBadgeCollection && (
        <BadgeCollectionModal onClose={() => setShowBadgeCollection(false)} />
      )}
    </>
  );
};

export default UserMenu;
