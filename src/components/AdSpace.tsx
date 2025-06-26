
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdSpaceProps {
  position: 'left' | 'right';
  width?: number;
  height?: number;
  gameContext?: boolean;
}

interface AdContent {
  id: string;
  title: string;
  content: string;
  image_url: string;
  target_url: string;
  is_active: boolean;
  position: string;
  region?: string;
  language?: string;
  clicks?: number;
  impressions?: number;
}

const AdSpace: React.FC<AdSpaceProps> = ({ position, width = 240, height = 600, gameContext = false }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [adContent, setAdContent] = useState<AdContent | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [shouldShow, setShouldShow] = useState(!gameContext);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadAdContent();
    
    if (gameContext) {
      // 游戏中随机显示广告，30%概率每10秒显示一次
      const interval = setInterval(() => {
        if (Math.random() < 0.3) {
          setShouldShow(true);
          setTimeout(() => setShouldShow(false), 5000); // 显示5秒后隐藏
        }
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [gameContext, user]);

  const checkAdminStatus = async () => {
    if (user && !user.isGuest) {
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        
        setIsAdmin(!!data);
      } catch (error) {
        setIsAdmin(false);
      }
    }
  };

  const getUserRegion = () => {
    // 简单的地区检测，可以基于用户设置或IP
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('Asia/Shanghai') || timezone.includes('Asia/Beijing')) {
      return 'CN';
    } else if (timezone.includes('America')) {
      return 'US';
    } else if (timezone.includes('Europe')) {
      return 'EU';
    }
    return 'Global';
  };

  const getUserLanguage = () => {
    return navigator.language.split('-')[0] || 'en';
  };

  const loadAdContent = async () => {
    try {
      const userRegion = getUserRegion();
      const userLanguage = getUserLanguage();
      
      let query = supabase
        .from('advertisements')
        .select('*')
        .eq('position', position)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      // 优先显示匹配地区和语言的广告
      const { data: regionalAds } = await query
        .eq('region', userRegion)
        .eq('language', userLanguage)
        .limit(1)
        .single();

      if (regionalAds) {
        setAdContent(regionalAds);
        return;
      }

      // 如果没有完全匹配的，显示匹配地区的
      const { data: regionAds } = await query
        .eq('region', userRegion)
        .limit(1)
        .single();

      if (regionAds) {
        setAdContent(regionAds);
        return;
      }

      // 最后显示全球广告
      const { data: globalAds } = await query
        .or('region.is.null,region.eq.Global')
        .limit(1)
        .single();

      if (globalAds) {
        setAdContent(globalAds);
      }
    } catch (error) {
      console.error('Error loading ad content:', error);
    }
  };

  const handleAdClick = async () => {
    if (!adContent) return;

    // 记录点击数据
    try {
      await supabase
        .from('advertisements')
        .update({ 
          clicks: (adContent.clicks || 0) + 1,
          impressions: (adContent.impressions || 0) + 1 
        })
        .eq('id', adContent.id);
    } catch (error) {
      console.error('Error updating ad stats:', error);
    }

    setShowDisclaimer(true);
    
    setTimeout(() => {
      if (adContent.target_url) {
        window.open(adContent.target_url, '_blank', 'noopener,noreferrer');
      }
      setShowDisclaimer(false);
    }, 2000);
  };

  // 如果在游戏中且不应该显示，返回null
  if (gameContext && !shouldShow) {
    return null;
  }

  // 如果没有广告内容且不是管理员，不显示任何内容
  if (!adContent && !isAdmin) {
    return null;
  }

  // 如果没有广告内容但是管理员，显示招租信息
  if (!adContent && isAdmin) {
    return (
      <div 
        className="bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center rounded-lg opacity-50"
        style={{ width, height }}
      >
        <span className="text-gray-400 text-xs text-center mb-2">
          广告位预留
        </span>
        <Button variant="outline" size="sm" className="text-xs">
          管理广告
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
        style={{ width, height }}
        onClick={handleAdClick}
      >
        <CardContent className="p-0 h-full flex flex-col">
          <div className="flex-1 relative">
            <img 
              src={adContent.image_url} 
              alt={adContent.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder.svg';
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-white text-xs">{adContent.title}</p>
            </div>
          </div>
          
          <div className="p-2 bg-gray-100 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
              <ExternalLink className="w-3 h-3" />
              <span>点击访问</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">即将离开网站</h3>
              <p className="text-sm text-gray-600 mb-4">
                您即将访问第三方网站。请注意：
              </p>
              <ul className="text-xs text-gray-500 text-left mb-4">
                <li>• 广告内容与本网站无关</li>
                <li>• 请谨慎提供个人信息</li>
                <li>• 本站不对外链内容负责</li>
              </ul>
              <p className="text-xs text-gray-400">
                2秒后自动跳转...
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default AdSpace;
