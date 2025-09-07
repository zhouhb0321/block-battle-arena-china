
import React from 'react';
import PlayerGameSection from './PlayerGameSection';
import GameControlsPanel from './GameControlsPanel';
import GameCountdown from '../GameCountdown';
import OneVsOneGameArea from './OneVsOneGameArea';
import TeamGameArea from './TeamGameArea';
import AdSpace from '../AdSpace';
import { GameMusicManager } from '../GameMusicManager';
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
  battleMode?: '1v1' | 'multi'; // 新增：指定对战模式
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
  onCountdownEnd = () => {},
  battleMode = 'multi'
}) => {
  const mainCellSize = 30;
  const gameStarted = !showCountdown && (gameState.score > 0 || gameState.lines > 0 || gameState.pieces !== undefined);

  // 如果是1v1模式，使用专门的1v1界面
  if (battleMode === '1v1') {
    return (
      <OneVsOneGameArea
        player1State={gameState}
        player1Username={username}
        player2State={opponentState}
        player2Username={opponentUsername}
        gameSettings={gameSettings}
        showCountdown={showCountdown}
        onCountdownEnd={onCountdownEnd}
      />
    );
  }

  // 原有的多人游戏界面
  return (
    <div className="flex gap-6 items-center justify-center w-full min-h-screen">
      <GameMusicManager 
        isGameActive={gameStarted}
        isGamePaused={gameState.paused}
      />
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
