
import React from 'react';
import { BLOCK_SKINS, getCurrentSkin } from '@/utils/blockSkins';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Button } from '@/components/ui/button';

const BlockSkinSelector: React.FC = () => {
  const { settings, updateSettings } = useUserSettings();
  const currentSkin = getCurrentSkin(settings.blockSkin || 'wood');

  const handleSkinChange = (skinId: string) => {
    updateSettings({ blockSkin: skinId });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">方块皮肤</h3>
      <p className="text-sm text-gray-600">选择您喜欢的方块视觉效果</p>
      
      <div className="grid grid-cols-1 gap-3">
        {BLOCK_SKINS.map((skin) => (
          <div
            key={skin.id}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${
              currentSkin.id === skin.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSkinChange(skin.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{skin.name}</h4>
                <p className="text-sm text-gray-500">{skin.description}</p>
              </div>
              
              {/* 皮肤预览 */}
              <div className="flex gap-1">
                {['#00f0f0', '#f0f000', '#a000f0'].map((color, index) => (
                  <div
                    key={index}
                    className="w-6 h-6"
                    style={skin.getBlockStyle(color, false)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlockSkinSelector;
