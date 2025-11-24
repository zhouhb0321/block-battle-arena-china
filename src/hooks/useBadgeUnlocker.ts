import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { processUnlockedBadges } from '@/utils/badgeSystem';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';

export const useBadgeUnlocker = () => {
  const { user } = useAuth();

  const checkUnlocks = useCallback(async () => {
    if (!user || user.isGuest) return;

    try {
      const newBadges = await processUnlockedBadges(user.id);
      
      // 显示解锁通知
      newBadges.forEach(badge => {
        toast.success(
          `🎉 新徽章解锁！\n${badge.badge_name}\n${badge.badge_description}`,
          { duration: 6000 }
        );
      });

      return newBadges;
    } catch (error) {
      console.error('Error checking badge unlocks:', error);
      return [];
    }
  }, [user]);

  // 定期检查（可选）
  useEffect(() => {
    if (!user || user.isGuest) return;
    
    // 立即检查一次
    checkUnlocks();
    
    // 每3分钟检查一次
    const interval = setInterval(checkUnlocks, 180000);
    
    return () => clearInterval(interval);
  }, [user, checkUnlocks]);

  return { checkUnlocks };
};
