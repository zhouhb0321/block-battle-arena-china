import React from 'react';
import UnifiedGameWindow from './UnifiedGameWindow';
import GameCountdownInArea from '../GameCountdownInArea';
import { GameMusicManager } from '../GameMusicManager';
import type { GameState, GameSettings } from '@/utils/gameTypes';

interface OneVsOneGameAreaProps {
  player1State: GameState;
  player1Username: string;
  player2State: GameState;
  player2Username: string;
  gameSettings: GameSettings;
  showCountdown?: boolean;
  onCountdownEnd?: () => void;
}

const OneVsOneGameArea: React.FC<OneVsOneGameAreaProps> = ({
  player1State,
  player1Username,
  player2State,
  player2Username,
  gameSettings,
  showCountdown = false,
  onCountdownEnd = () => {}
}) => {
  const formatTime = (startTime: number | undefined) => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <GameMusicManager 
        isGameActive={true}
        isGamePaused={player1State.paused || player2State.paused}
      />
      
      {/* 顶部比分栏 */}
      <div className="bg-card/80 backdrop-blur-sm p-4 border-b border-border">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="text-blue-400 font-bold text-lg">{player1Username}</div>
            <div className="text-foreground text-2xl font-bold">{player1State.score.toLocaleString()}</div>
          </div>
          
          <div className="text-center">
            <div className="text-yellow-400 text-2xl font-bold">VS</div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-foreground text-2xl font-bold">{player2State.score.toLocaleString()}</div>
            <div className="text-red-400 font-bold text-lg">{player2Username}</div>
          </div>
        </div>
      </div>

      {/* 主游戏区域 - 使用 UnifiedGameWindow */}
      <div className="flex-1 flex justify-center items-center p-4 gap-8">
        {/* 玩家1 */}
        <div className="relative">
          <UnifiedGameWindow
            board={player1State.board}
            currentPiece={player1State.currentPiece}
            ghostPiece={gameSettings.enableGhost ? player1State.ghostPiece : null}
            nextPieces={player1State.nextPieces}
            holdPiece={player1State.holdPiece}
            canHold={player1State.canHold}
            score={player1State.score}
            lines={player1State.lines}
            level={player1State.level}
            pps={player1State.pps}
            apm={player1State.apm || 0}
            time={formatTime(player1State.startTime)}
            username={player1Username}
            mode="play"
            cellSize={24}
            enableGhost={gameSettings.enableGhost}
            accentColor="blue"
            pieces={player1State.pieces}
            attack={player1State.attack}
          />
          
          {/* 倒计时只在玩家1区域显示 */}
          {showCountdown && (
            <GameCountdownInArea
              initialCount={3}
              onComplete={onCountdownEnd}
              isVisible={showCountdown}
            />
          )}
        </div>

        {/* 中央 VS 分隔 */}
        <div className="flex flex-col items-center justify-center px-4">
          <div className="w-px bg-border h-32" />
          <div className="py-4 text-2xl font-bold text-yellow-400">VS</div>
          <div className="w-px bg-border h-32" />
        </div>

        {/* 玩家2 */}
        <UnifiedGameWindow
          board={player2State.board}
          currentPiece={player2State.currentPiece}
          ghostPiece={gameSettings.enableGhost ? player2State.ghostPiece : null}
          nextPieces={player2State.nextPieces}
          holdPiece={player2State.holdPiece}
          canHold={player2State.canHold}
          score={player2State.score}
          lines={player2State.lines}
          level={player2State.level}
          pps={player2State.pps}
          apm={player2State.apm || 0}
          time={formatTime(player2State.startTime)}
          username={player2Username}
          mode="play"
          cellSize={24}
          enableGhost={gameSettings.enableGhost}
          accentColor="red"
          pieces={player2State.pieces}
          attack={player2State.attack}
        />
      </div>

      {/* 底部信息栏 */}
      <div className="bg-card/80 backdrop-blur-sm p-2 border-t border-border">
        <div className="flex justify-center">
          <div className="text-muted-foreground text-sm">1v1 Battle Mode</div>
        </div>
      </div>
    </div>
  );
};

export default OneVsOneGameArea;
