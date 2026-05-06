
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AdContent } from '@/utils/gameTypes';
import { trackAdImpression, trackAdClick, checkAdFrequency, recordAdView } from '@/utils/adAnalytics';
import { X } from 'lucide-react';

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
  const [isVisible, setIsVisible] = useState(true);
  const [hasTracked, setHasTracked] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);

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

  // 获取广告内容（优化版）
  useEffect(() => {
    const fetchAdContent = async () => {
      setLoading(true);
      try {
        const { region, language } = getUserLocale();
        
        const { data: rpcData, error } = await supabase
          .rpc('get_public_ads', { _position: position });
        const data = (rpcData || []).map((a: any) => ({ ...a, position: a.ad_position, is_active: true, clicks: 0, impressions: 0 }));

        if (error) {
          console.error('Error fetching ad:', error);
          return;
        }

        if (data && data.length > 0) {
          // 过滤匹配地区、语言和频次限制的广告
          const filteredAds = data.filter(ad => {
            const regionMatch = !ad.region || ad.region === region;
            const languageMatch = !ad.language || ad.language === language;
            const frequencyCheck = checkAdFrequency(ad.id, ad.frequency_cap);
            return regionMatch && languageMatch && frequencyCheck;
          });

          if (filteredAds.length > 0) {
            const ad = filteredAds[0];
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
          }
        }
      } catch (error) {
        console.error('Error loading ad:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdContent();
  }, [position]);

  // Intersection Observer 精确跟踪曝光
  useEffect(() => {
    if (!adContent || !adRef.current || hasTracked) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            trackAdImpression(adContent.id, user?.id);
            recordAdView(adContent.id);
            setHasTracked(true);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(adRef.current);

    return () => observer.disconnect();
  }, [adContent, user, hasTracked]);

  const handleAdClick = async () => {
    if (!adContent) return;

    try {
      await trackAdClick(adContent.id, adContent.targetUrl, user?.id);

      if (adContent.targetUrl) {
        window.open(adContent.targetUrl, '_blank');
      }
    } catch (error) {
      console.error('Error recording ad click:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  // 如果正在加载或用户关闭了广告
  if (loading || !isVisible) {
    return null;
  }

  // 如果没有广告内容
  if (!adContent) {
    // 只有管理员可以看到预留位置
    if (isAdmin) {
      return (
        <div 
          className="bg-muted/50 border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center p-4 rounded-lg"
          style={{ width, height }}
        >
          <span className="text-muted-foreground text-sm font-medium mb-2">广告位预留</span>
          <span className="text-muted-foreground/70 text-xs text-center">
            位置: {position}<br/>
            尺寸: {width}×{height}
          </span>
        </div>
      );
    }
    return null;
  }

  // 渲染广告（优化版）
  return (
    <div 
      ref={adRef}
      className="relative bg-card border border-border rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2"
      style={{ width, height }}
    >
      {/* 广告标识 */}
      <div className="absolute top-2 left-2 z-10">
        <span className="bg-muted/80 text-muted-foreground text-xs px-2 py-1 rounded">
          广告
        </span>
      </div>

      {/* 弹窗广告关闭按钮 */}
      {position === 'popup' && (
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background rounded-full p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* 广告内容 */}
      <div 
        className="p-3 h-full flex flex-col cursor-pointer"
        onClick={handleAdClick}
      >
        {adContent.imageUrl && (
          <img 
            src={adContent.imageUrl} 
            alt={adContent.title}
            className="w-full h-24 object-cover rounded mb-2 loading-lazy"
            loading="lazy"
          />
        )}
        <h4 className="font-semibold text-sm text-foreground mb-1 line-clamp-2">
          {adContent.title}
        </h4>
        <p className="text-xs text-muted-foreground flex-1 line-clamp-3">
          {adContent.description}
        </p>
        {isAdmin && (
          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
            点击: {adContent.clicks || 0} | 展示: {adContent.impressions || 0}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdSpace;
