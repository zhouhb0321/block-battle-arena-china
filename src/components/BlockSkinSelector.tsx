
import React from 'react';
import { BLOCK_SKINS, getCurrentSkin } from '@/utils/blockSkins';
import { useUserSettings } from '@/hooks/useUserSettings';

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
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
            }`}
            onClick={() => handleSkinChange(skin.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{skin.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{skin.description}</p>
                {skin.id === 'hui' && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    ✨ 中式美学设计，实心"回"字造型
                  </p>
                )}
              </div>
              
              {/* 皮肤预览 */}
              <div className="flex gap-1">
                {['#4a9d9c', '#c4a661', '#8b6bb1'].map((color, index) => (
                  <div
                    key={index}
                    className={`w-6 h-6 ${skin.id === 'hui' ? 'hui-preview' : ''}`}
                    style={skin.getBlockStyle(color, false)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        .hui-preview {
          position: relative;
        }
        
        .hui-preview::after {
          content: '';
          position: absolute;
          top: 25%;
          left: 25%;
          width: 50%;
          height: 50%;
          background: currentColor;
          filter: brightness(0.6) saturate(1.2);
          border: 1px solid rgba(0, 0, 0, 0.3);
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};

export default BlockSkinSelector;
