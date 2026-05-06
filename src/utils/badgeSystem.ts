import { supabase } from '@/integrations/supabase/client';

export interface BadgeDefinition {
  badge_id: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  category: 'beginner' | 'advanced' | 'master' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon_url?: string;
  unlock_condition: {
    type: string;
    threshold?: number;
    game_mode?: string;
  };
}

// 段位比较函数
const RANK_ORDER = ['D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S-', 'S', 'S+'];

const compareRanks = (rank1: string, rank2: string): number => {
  const index1 = RANK_ORDER.indexOf(rank1);
  const index2 = RANK_ORDER.indexOf(rank2);
  if (index1 === -1 || index2 === -1) return 0;
  return index1 - index2;
};

// 检查徽章解锁条件
export const checkBadgeUnlock = (
  badge: BadgeDefinition,
  userStats: any
): boolean => {
  const { type, threshold, game_mode } = badge.unlock_condition;
  
  switch (type) {
    case 'games_won':
      return userStats.games_won >= (threshold || 0);
    
    case 'games_played':
      return userStats.games_played >= (threshold || 0);
    
    case 'sprint_time':
      // 需要从 user_best_records 中获取
      return false; // 由调用方传入具体的最佳时间
    
    case 'finesse_high':
      // 需要从游戏记录中获取最高精细度
      return false; // 由调用方传入
    
    case 'finesse_perfect':
      return false; // 由调用方传入
    
    case 'rank_achieved':
      return compareRanks(userStats.rank, String(threshold || '')) >= 0;
    
    case 'login_count':
      return true; // 如果用户能看到这个，说明已经登录过了
    
    case 'friend_count':
      return (userStats.friend_count || 0) >= (threshold || 0);
    
    case 'registration_year':
      const registrationYear = new Date(userStats.created_at).getFullYear();
      return registrationYear <= (threshold || 9999);
    
    default:
      return false;
  }
};

// 批量检查并解锁徽章
export const processUnlockedBadges = async (userId: string) => {
  try {
    // 1. 获取用户统计数据
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!userProfile) return [];
    
    // 2. 获取好友数量
    const { count: friendCount } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'accepted');
    
    // 3. 获取最佳记录
    const { data: bestRecords } = await supabase
      .from('user_best_records')
      .select('*')
      .eq('user_id', userId);
    
    // 4. 获取所有徽章定义
    const { data: allBadges } = await supabase
      .from('badges')
      .select('*');
    
    if (!allBadges) return [];
    
    // 5. 获取已解锁的徽章
    const { data: unlockedBadges } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);
    
    const unlockedIds = new Set((unlockedBadges || []).map(b => b.badge_id));
    
    // 6. 扩展用户统计数据
    const extendedStats = {
      ...userProfile,
      friend_count: friendCount || 0,
      best_records: bestRecords || []
    };
    
    // 7. 检查未解锁的徽章
    const newlyUnlocked = [];
    for (const badge of allBadges) {
      if (unlockedIds.has(badge.badge_id)) continue;
      
      let shouldUnlock = false;
      
      // 特殊处理需要查询额外数据的徽章类型
      if (badge.unlock_condition.type === 'sprint_time') {
        const gameMode = badge.unlock_condition.game_mode;
        const bestRecord = bestRecords?.find(r => r.game_mode === gameMode);
        if (bestRecord && bestRecord.best_time && bestRecord.best_time <= (badge.unlock_condition.threshold || Infinity)) {
          shouldUnlock = true;
        }
      } else {
        shouldUnlock = checkBadgeUnlock(badge, extendedStats);
      }
      
      if (shouldUnlock) {
        newlyUnlocked.push({
          user_id: userId,
          badge_id: badge.badge_id,
          badge_name: badge.name_zh,
          badge_description: badge.description_zh,
          rarity: badge.rarity
        });
      }
    }
    
    // 8. Award via secure server-side function (validates badge exists)
    if (newlyUnlocked.length > 0) {
      for (const b of newlyUnlocked) {
        await supabase.rpc('award_user_badge', { _badge_id: b.badge_id });
      }
    }
    
    return newlyUnlocked;
  } catch (error) {
    console.error('Error processing badges:', error);
    return [];
  }
};

// 获取用户所有徽章
export const getUserBadges = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_badges')
    .select(`
      *,
      badges (*)
    `)
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
  
  return data || [];
};

// 设置精选徽章
export const setFeaturedBadges = async (userId: string, badgeIds: string[]) => {
  try {
    // 先取消所有精选
    await supabase
      .from('user_badges')
      .update({ is_featured: false })
      .eq('user_id', userId);
    
    // 设置新的精选徽章（最多5个）
    if (badgeIds.length > 0) {
      await supabase
        .from('user_badges')
        .update({ is_featured: true })
        .eq('user_id', userId)
        .in('badge_id', badgeIds.slice(0, 5));
    }
    
    return true;
  } catch (error) {
    console.error('Error setting featured badges:', error);
    return false;
  }
};
