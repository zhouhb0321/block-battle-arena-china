
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, RotateCw, RotateCcw, RefreshCw, Package, Pause } from 'lucide-react';

interface MobileControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onRotateClockwise: () => void;
  onRotateCounterclockwise: () => void;
  onRotate180: () => void;
  onHold: () => void;
  onPause: () => void;
}

const MobileControls: React.FC<MobileControlsProps> = ({
  onMoveLeft,
  onMoveRight,
  onSoftDrop,
  onHardDrop,
  onRotateClockwise,
  onRotateCounterclockwise,
  onRotate180,
  onHold,
  onPause
}) => {
  return (
    <div className="bg-gray-800 p-3">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {/* 左侧控制区 */}
        <div className="flex flex-col gap-2">
          {/* 方向控制 */}
          <div className="grid grid-cols-3 gap-1">
            <div></div>
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-600 text-white border-blue-500 hover:bg-blue-700 w-12 h-12 p-0"
              onTouchStart={(e) => { e.preventDefault(); onHardDrop(); }}
              onClick={onHardDrop}
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <div></div>
            
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-600 text-white border-blue-500 hover:bg-blue-700 w-12 h-12 p-0"
              onTouchStart={(e) => { e.preventDefault(); onMoveLeft(); }}
              onClick={onMoveLeft}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-600 text-white border-blue-500 hover:bg-blue-700 w-12 h-12 p-0"
              onTouchStart={(e) => { e.preventDefault(); onSoftDrop(); }}
              onClick={onSoftDrop}
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-600 text-white border-blue-500 hover:bg-blue-700 w-12 h-12 p-0"
              onTouchStart={(e) => { e.preventDefault(); onMoveRight(); }}
              onClick={onMoveRight}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 中间暂停按钮 */}
        <Button
          variant="outline"
          size="sm"
          className="bg-yellow-600 text-white border-yellow-500 hover:bg-yellow-700 w-12 h-12 p-0"
          onTouchStart={(e) => { e.preventDefault(); onPause(); }}
          onClick={onPause}
        >
          <Pause className="w-4 h-4" />
        </Button>

        {/* 右侧功能区 */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-green-600 text-white border-green-500 hover:bg-green-700 w-12 h-12 p-0"
            onTouchStart={(e) => { e.preventDefault(); onRotateCounterclockwise(); }}
            onClick={onRotateCounterclockwise}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-green-600 text-white border-green-500 hover:bg-green-700 w-12 h-12 p-0"
            onTouchStart={(e) => { e.preventDefault(); onRotateClockwise(); }}
            onClick={onRotateClockwise}
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="bg-purple-600 text-white border-purple-500 hover:bg-purple-700 w-12 h-12 p-0"
            onTouchStart={(e) => { e.preventDefault(); onRotate180(); }}
            onClick={onRotate180}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-orange-600 text-white border-orange-500 hover:bg-orange-700 w-12 h-12 p-0"
            onTouchStart={(e) => { e.preventDefault(); onHold(); }}
            onClick={onHold}
          >
            <Package className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileControls;
