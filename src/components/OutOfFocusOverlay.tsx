
import React from 'react';

interface OutOfFocusOverlayProps {
  show: boolean;
}

const OutOfFocusOverlay: React.FC<OutOfFocusOverlayProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-8 text-center shadow-2xl">
        <div className="text-red-400 text-4xl font-bold mb-4">
          Out of Focus
        </div>
        <div className="text-white text-lg mb-2">
          游戏已暂停
        </div>
        <div className="text-gray-300 text-sm">
          点击或切换回此窗口以继续游戏
        </div>
        <div className="mt-4 text-xs text-gray-400">
          Game paused - Click to resume
        </div>
      </div>
    </div>
  );
};

export default OutOfFocusOverlay;
