
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface GameStatusIndicatorsProps {
  combo: number;
  b2b: number;
  totalAttack: number;
}

const GameStatusIndicators: React.FC<GameStatusIndicatorsProps> = ({
  combo,
  b2b,
  totalAttack
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-gray-800 rounded-lg p-3 text-white text-sm space-y-2">
      {combo >= 0 && (
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-2 rounded text-center font-bold">
          {combo + 1}x 连击
        </div>
      )}
      {b2b > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-pink-500 p-2 rounded text-center font-bold">
          B2B x{b2b}
        </div>
      )}
      <div className="text-center">
        <div className="text-xs text-gray-400">攻击力</div>
        <div className="text-lg font-bold text-red-400">{totalAttack}</div>
      </div>
    </div>
  );
};

export default GameStatusIndicators;
