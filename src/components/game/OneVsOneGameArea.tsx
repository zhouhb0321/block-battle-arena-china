import React from 'react';
import TetrioBattleLayout from './TetrioBattleLayout';
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
  matchNumber?: number;
  totalMatches?: number;
  player1MatchWins?: number;
  player2MatchWins?: number;
}

const OneVsOneGameArea: React.FC<OneVsOneGameAreaProps> = ({
  player1State,
  player1Username,
  player2State,
  player2Username,
  gameSettings,
  showCountdown = false,
  onCountdownEnd = () => {},
  matchNumber = 1,
  totalMatches = 5,
  player1MatchWins = 0,
  player2MatchWins = 0
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <GameMusicManager 
        isGameActive={true}
        isGamePaused={player1State.paused || player2State.paused}
      />
      
      {/* 主游戏区域 - 使用 TETR.IO 风格布局 */}
      <div className="flex-1 flex justify-center items-center p-4 relative">
        <TetrioBattleLayout
          player1={{
            state: player1State,
            username: player1Username,
            matchWins: player1MatchWins
          }}
          player2={{
            state: player2State,
            username: player2Username,
            matchWins: player2MatchWins
          }}
          matchNumber={matchNumber}
          totalMatches={totalMatches}
          cellSize={22}
          enableGhost={gameSettings.enableGhost}
        />
        
        {/* 倒计时覆盖层 */}
        {showCountdown && (
          <GameCountdownInArea
            initialCount={3}
            onComplete={onCountdownEnd}
            isVisible={showCountdown}
          />
        )}
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
