
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AdContent } from '@/utils/gameTypes';

interface AdSpaceProps {
  position: 'left' | 'right' | 'top' | 'bottom' | 'popup';
  width: number;
  height: number;
  gameContext?: boolean;
}

const AdSpace: React.FC<AdSpaceProps> = ({ position, width, height, gameContext = false }) => {
  const { user } = useAuth();
  const [adContent, setAdContent] = useState<AdContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 获取用户地区和语言信息
  const getUserLocale = () => {
    const locale = navigator.language || 'zh-CN';
    const region = locale.split('-')[1] || 'CN';
    const language = locale.split('-')[0] || 'zh';
    return { region, language };
  };

  // 检查是否为管理员
  useEffect(() => {
    const checkAdminStatus = () => {
      if (user?.email === 'admin@tetris.com') {
        setIsAdmin(true);
      }
    };
    checkAdminStatus();
  }, [user]);

  // 获取广告内容
  useEffect(() => {
    const fetchAdContent = async () => {
      setLoading(true);
      try {
        const { region, language } = getUserLocale();
        
        const { data, error } = await supabase
          .from('advertisements')
          .select('*')
          .eq('position', position)
          .eq('is_active', true)
          .or(`region.is.null,region.eq.${region}`)
          .or(`language.is.null,language.eq.${language}`)
          .gte('end_date', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching ad:', error);
          return;
        }

        if (data && data.length > 0) {
          const ad = data[0];
          setAdContent({
            id: ad.id,
            title: ad.title,
            description: ad.content,
            imageUrl: ad.image_url || '',
            clickUrl: ad.target_url || '',
            targetUrl: ad.target_url || '',
            isActive: ad.is_active,
            region: region,
            language: language,
            startDate: ad.start_date,
            endDate: ad.end_date,
            clicks: ad.clicks,
            impressions: ad.impressions
          });

          // 更新展示次数
          await supabase
            .from('advertisements')
            .update({ impressions: (ad.impressions || 0) + 1 })
            .eq('id', ad.id);
        }
      } catch (error) {
        console.error('Error loading ad:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdContent();
  }, [position]);

  const handleAdClick = async () => {
    if (!adContent) return;

    try {
      // 更新点击次数
      await supabase
        .from('advertisements')
        .update({ clicks: (adContent.clicks || 0) + 1 })
        .eq('id', adContent.id);

      // 打开广告链接
      if (adContent.targetUrl) {
        window.open(adContent.targetUrl, '_blank');
      }
    } catch (error) {
      console.error('Error recording ad click:', error);
    }
  };

  // 如果正在加载，不显示任何内容
  if (loading) {
    return null;
  }

  // 如果没有广告内容
  if (!adContent) {
    // 只有管理员可以看到预留位置
    if (isAdmin) {
      return (
        <div 
          className="bg-yellow-50 border-2 border-dashed border-yellow-300 flex flex-col items-center justify-center p-4"
          style={{ width, height }}
        >
          <span className="text-yellow-700 text-sm font-medium mb-2">广告位预留</span>
          <span className="text-yellow-600 text-xs text-center">
            位置: {position}<br/>
            尺寸: {width}×{height}
          </span>
        </div>
      );
    }
    // 普通用户看不到空的广告位
    return null;
  }

  // 所有用户都能看到有内容的广告
  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      style={{ width, height }}
      onClick={handleAdClick}
    >
      <div className="p-3 h-full flex flex-col">
        {adContent.imageUrl && (
          <img 
            src={adContent.imageUrl} 
            alt={adContent.title}
            className="w-full h-24 object-cover rounded mb-2"
          />
        )}
        <h4 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2">
          {adContent.title}
        </h4>
        <p className="text-xs text-gray-600 flex-1 line-clamp-3">
          {adContent.description}
        </p>
        {isAdmin && (
          <div className="mt-2 text-xs text-gray-400">
            点击: {adContent.clicks || 0} | 展示: {adContent.impressions || 0}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdSpace;
