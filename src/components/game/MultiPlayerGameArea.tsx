import React from 'react';
import PlayerGameSection from './PlayerGameSection';
import GameControlsPanel from './GameControlsPanel';
import GameCountdown from '../GameCountdown';
import AdSpace from '../AdSpace';
import type { GameState, GameSettings } from '@/utils/gameTypes';

interface MultiPlayerGameAreaProps {
  gameState: GameState;
  gameSettings: GameSettings;
  username: string;
  opponentState: GameState;
  opponentUsername: string;
  onPause: () => void;
  onShare: () => void;
  onReset: () => void;
  onBackToMenu: () => void;
  showCountdown?: boolean;
  onCountdownEnd?: () => void;
}

const MultiPlayerGameArea: React.FC<MultiPlayerGameAreaProps> = ({
  gameState,
  gameSettings,
  username,
  opponentState,
  opponentUsername,
  onPause,
  onShare,
  onReset,
  onBackToMenu,
  showCountdown = false,
  onCountdownEnd = () => {}
}) => {
  const mainCellSize = 30; // 主游戏板的方块大小
  
  // 判断游戏是否已开始
  const gameStarted = !showCountdown && (gameState.score > 0 || gameState.lines > 0 || gameState.pieces !== undefined);

  return (
    <div className="flex gap-6 items-center justify-center w-full min-h-screen">
      {/* 左侧广告位 */}
      <div className="hidden xl:block">
        <AdSpace position="left" width={240} height={600} />
      </div>

      <div className="flex gap-8 items-start">
        {/* 主玩家游戏区域（加 relative 以便倒计时 absolute 定位） */}
        <div className="relative">
        <PlayerGameSection
          gameState={gameState}
          gameSettings={gameSettings}
          username={username}
          onPause={onPause}
          onShare={onShare}
          onReset={onReset}
          onBackToMenu={onBackToMenu}
          gameStarted={gameStarted}
          cellSize={mainCellSize}
          showOverlay={true}
        />
          {/* 只在主玩家区显示倒计时 */}
          {showCountdown && (
            <GameCountdown show={showCountdown} onCountdownEnd={onCountdownEnd} />
          )}
        </div>

        {/* 对手游戏区域 */}
        <PlayerGameSection
          gameState={opponentState}
          gameSettings={gameSettings}
          username={opponentUsername}
          onPause={() => {}}
          onShare={() => {}}
          gameStarted={gameStarted}
          cellSize={mainCellSize}
          showOverlay={false}
        />
      </div>

      {/* 右侧广告位 */}
      <div className="hidden xl:block">
        <AdSpace position="right" width={240} height={600} />
      </div>

      {/* 控制按钮 */}
      <GameControlsPanel onBackToMenu={onBackToMenu} />
    </div>
  );
};

export default MultiPlayerGameArea;
