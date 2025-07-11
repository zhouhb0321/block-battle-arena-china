
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface OutOfFocusOverlayProps {
  show: boolean;
  onResume?: () => void;
}

const OutOfFocusOverlay: React.FC<OutOfFocusOverlayProps> = ({ show, onResume }) => {
  useEffect(() => {
    if (!show || !onResume) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 任何按键都能恢复游戏
      event.preventDefault();
      onResume();
    };

    const handleClick = () => {
      onResume();
    };

    // 监听键盘和鼠标事件
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, [show, onResume]);

  if (!show) return null;

  const handleOverlayClick = () => {
    if (onResume) {
      onResume();
    }
  };

  return (
    <div 
      className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm cursor-pointer"
      onClick={handleOverlayClick}
    >
      <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-8 text-center shadow-2xl max-w-sm mx-4">
        <div className="text-red-400 text-3xl font-bold mb-4">
          <Play className="w-12 h-12 mx-auto mb-2" />
          游戏已暂停
        </div>
        <div className="text-white text-lg mb-4">
          Game Paused
        </div>
        <div className="text-gray-300 text-sm mb-6">
          点击任意位置或按任意键继续游戏
        </div>
        <Button 
          onClick={handleOverlayClick}
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2"
        >
          <Play className="w-4 h-4 mr-2" />
          继续游戏
        </Button>
        <div className="mt-4 text-xs text-gray-400">
          Click anywhere or press any key to resume
        </div>
      </div>
    </div>
  );
};

export default OutOfFocusOverlay;
