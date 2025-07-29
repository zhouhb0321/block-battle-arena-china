
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BLOCK_SKINS, getCurrentSkin } from '@/utils/blockSkins';
import type { UserSettings } from '@/hooks/useUserSettings';

interface BlockSkinTabProps {
  settings: UserSettings;
  onSettingChange: (key: keyof UserSettings, value: any) => void;
}

const BlockSkinTab: React.FC<BlockSkinTabProps> = ({
  settings,
  onSettingChange
}) => {
  const currentSkin = getCurrentSkin(settings.blockSkin || 'wood');

  const handleSkinChange = (skinId: string) => {
    onSettingChange('blockSkin', skinId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>方块皮肤选择</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            选择您喜欢的方块视觉效果，不同皮肤会改变方块的外观和质感。
          </p>
          
          <div className="grid grid-cols-1 gap-4">
            {BLOCK_SKINS.map((skin) => (
              <div
                key={skin.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                  currentSkin.id === skin.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
                onClick={() => handleSkinChange(skin.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{skin.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{skin.description}</p>
                  </div>
                  
                  {/* 皮肤预览 */}
                  <div className="flex gap-2 ml-4">
                    {['#00f0f0', '#f0f000', '#a000f0', '#00f000'].map((color, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 border border-gray-300 rounded"
                        style={skin.getBlockStyle(color, false)}
                      />
                    ))}
                  </div>
                </div>
                
                {currentSkin.id === skin.id && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      当前选中
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h5 className="font-medium text-foreground mb-2">当前皮肤：{currentSkin.name}</h5>
            <p className="text-sm text-muted-foreground">
              {currentSkin.description}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlockSkinTab;
