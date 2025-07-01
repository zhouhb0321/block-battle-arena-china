
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
        {/* 玩家1游戏区域 */}
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

        {/* 玩家2游戏区域 */}
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

      {/* 倒计时覆盖层 */}
      {showCountdown && (
        <div className="fixed inset-0 z-50">
          <GameCountdown show={showCountdown} onCountdownEnd={onCountdownEnd} />
        </div>
      )}
    </div>
  );
};

export default MultiPlayerGameArea;
