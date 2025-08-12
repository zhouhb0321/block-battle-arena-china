
import React from 'react';
import GameBoard from './GameBoard';
import PiecePreview from './PiecePreview';
import HoldPieceDisplay from './HoldPieceDisplay';
import AchievementDisplay from './AchievementDisplay'; // Import AchievementDisplay
import type { GamePiece, GameState } from '@/utils/gameTypes';

interface BattleLayoutProps {
  player1Board: number[][];
  player1CurrentPiece: GamePiece | null;
  player1NextPieces: GamePiece[];
  player1HoldPiece: GamePiece | null;
  player1Stats: {
    score: number;
    lines: number;
    level: number;
    apm: number;
    pps: number;
  };
  player1Achievements: GameState['achievements']; // Add achievements prop

  player2Board: number[][];
  player2CurrentPiece: GamePiece | null;
  player2NextPieces: GamePiece[];
  player2HoldPiece: GamePiece | null;
  player2Stats: {
    score: number;
    lines: number;
    level: number;
    apm: number;
    pps: number;
  };
  player2Achievements: GameState['achievements']; // Add achievements prop

  gameMode: '1v1' | 'alliance';
  isSpectator?: boolean;
}

const BattleLayout: React.FC<BattleLayoutProps> = ({
  player1Board,
  player1CurrentPiece,
  player1NextPieces,
  player1HoldPiece,
  player1Stats,
  player1Achievements,
  player2Board,
  player2CurrentPiece,
  player2NextPieces,
  player2HoldPiece,
  player2Stats,
  player2Achievements,
  gameMode,
  isSpectator = false,
}) => {
  const cellSize = 20;

  const PlayerSection = ({
    playerName,
    board,
    currentPiece,
    nextPieces,
    holdPiece,
    stats,
    achievements,
  }: {
    playerName: string;
    board: number[][];
    currentPiece: GamePiece | null;
    nextPieces: GamePiece[];
    holdPiece: GamePiece | null;
    stats: BattleLayoutProps['player1Stats'];
    achievements: GameState['achievements'];
  }) => (
    <div className="flex gap-4 items-start">
      {/* Left Panel */}
      <div className="w-40 flex flex-col gap-3">
        <HoldPieceDisplay holdPiece={holdPiece} canHold={true} />
        <div className="flex-grow">
          <AchievementDisplay achievements={achievements} onAchievementComplete={() => {}} />
        </div>
        <div className="bg-gray-800 p-3 rounded text-white text-sm">
          <div className="space-y-1">
            <div>Score: {stats.score.toLocaleString()}</div>
            <div>Lines: {stats.lines}</div>
            <div>Level: {stats.level}</div>
            <div>APM: {stats.apm.toFixed(1)}</div>
            <div>PPS: {stats.pps.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Game Board (Center) */}
      <div>
        <h2 className="text-white text-lg font-bold mb-2 text-center">{playerName}</h2>
        <GameBoard board={board} currentPiece={currentPiece} cellSize={cellSize} />
      </div>

      {/* Right Panel (Next Pieces) */}
      <div className="w-40">
        <div className="bg-gray-800 p-3 rounded">
          <h3 className="text-white text-sm font-bold mb-2">NEXT</h3>
          <div className="space-y-2">
            {nextPieces.slice(0, 5).map((piece, index) => (
              <PiecePreview key={index} piece={piece.type} title="" cellSize={cellSize * 0.8} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 p-4">
      <div className="flex gap-8 items-start">
        <PlayerSection
          playerName="Player 1"
          board={player1Board}
          currentPiece={player1CurrentPiece}
          nextPieces={player1NextPieces}
          holdPiece={player1HoldPiece}
          stats={player1Stats}
          achievements={player1Achievements}
        />

        <div className="flex items-center justify-center self-center">
          <div className="text-4xl font-bold text-red-500 bg-gray-800 px-4 py-2 rounded">VS</div>
        </div>

        <PlayerSection
          playerName="Player 2"
          board={player2Board}
          currentPiece={player2CurrentPiece}
          nextPieces={player2NextPieces}
          holdPiece={player2HoldPiece}
          stats={player2Stats}
          achievements={player2Achievements}
        />
      </div>
    </div>
  );
};

export default BattleLayout;
