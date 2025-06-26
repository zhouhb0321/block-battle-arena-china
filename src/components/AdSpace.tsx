
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle } from 'lucide-react';

interface AdSpaceProps {
  position: 'left' | 'right';
  width?: number;
  height?: number;
}

interface AdContent {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  expiryDate: string;
  isActive: boolean;
}

const AdSpace: React.FC<AdSpaceProps> = ({ position, width = 240, height = 600 }) => {
  const { t } = useLanguage();
  const [adContent, setAdContent] = useState<AdContent | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    // 模拟从后台获取广告内容
    const mockAd: AdContent = {
      id: '1',
      title: '示例广告',
      imageUrl: '/placeholder.svg',
      linkUrl: 'https://example.com',
      expiryDate: '2024-12-31',
      isActive: true
    };
    
    // 检查广告是否过期
    const isExpired = new Date(mockAd.expiryDate) < new Date();
    if (!isExpired && mockAd.isActive) {
      setAdContent(mockAd);
    }
  }, []);

  const handleAdClick = () => {
    setShowDisclaimer(true);
    
    setTimeout(() => {
      if (adContent?.linkUrl) {
        window.open(adContent.linkUrl, '_blank', 'noopener,noreferrer');
      }
      setShowDisclaimer(false);
    }, 2000);
  };

  if (!adContent) {
    return (
      <div 
        className="bg-gray-200 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center rounded-lg"
        style={{ width, height }}
      >
        <span className="text-gray-500 text-sm text-center mb-2">
          {t('ad.placeholder')}
        </span>
        <Button variant="outline" size="sm">
          {t('ad.contact')}
        </Button>
      </div>
    );
  }

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      style={{ width, height }}
      onClick={handleAdClick}
    >
      <CardContent className="p-0 h-full flex flex-col">
        <div className="flex-1 relative">
          <img 
            src={adContent.imageUrl} 
            alt={adContent.title}
            className="w-full h-full object-cover"
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
    </Card>
  );
};

export default AdSpace;
