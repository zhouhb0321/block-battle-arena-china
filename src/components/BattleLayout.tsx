
import React from 'react';
import GameBoard from './GameBoard';
import PiecePreview from './PiecePreview';
import HoldPieceDisplay from './HoldPieceDisplay';
import type { GamePiece } from '@/utils/gameTypes';

interface BattleLayoutProps {
  // 玩家1数据
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
  
  // 玩家2数据
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
  
  // 游戏状态
  gameMode: '1v1' | 'alliance';
  isSpectator?: boolean;
}

const BattleLayout: React.FC<BattleLayoutProps> = ({
  player1Board,
  player1CurrentPiece,
  player1NextPieces,
  player1HoldPiece,
  player1Stats,
  player2Board,
  player2CurrentPiece,
  player2NextPieces,
  player2HoldPiece,
  player2Stats,
  gameMode,
  isSpectator = false
}) => {
  const cellSize = 20; // 适合对战界面的小尺寸

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 p-4">
      <div className="flex gap-8 items-start">
        {/* 玩家1区域 */}
        <div className="flex gap-4">
          {/* HOLD区域 - 左侧 */}
          <div className="flex flex-col gap-4">
            <HoldPieceDisplay 
              holdPiece={player1HoldPiece} 
              canHold={true}
            />
            
            {/* 玩家1统计 */}
            <div className="bg-gray-800 p-3 rounded text-white text-sm">
              <div className="space-y-1">
                <div>Score: {player1Stats.score.toLocaleString()}</div>
                <div>Lines: {player1Stats.lines}</div>
                <div>Level: {player1Stats.level}</div>
                <div>APM: {player1Stats.apm.toFixed(1)}</div>
                <div>PPS: {player1Stats.pps.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* 玩家1游戏板 */}
          <div>
            <h2 className="text-white text-lg font-bold mb-2 text-center">Player 1</h2>
            <GameBoard
              board={player1Board}
              currentPiece={player1CurrentPiece}
              cellSize={cellSize}
            />
          </div>

          {/* NEXT区域 - 右侧 */}
          <div className="bg-gray-800 p-3 rounded">
            <h3 className="text-white text-sm font-bold mb-2">NEXT</h3>
            <div className="space-y-2">
              {player1NextPieces.slice(0, 5).map((piece, index) => (
                <PiecePreview 
                  key={index}
                  piece={piece.type} 
                  cellSize={cellSize * 0.8}
                />
              ))}
            </div>
          </div>
        </div>

        {/* VS分隔符 */}
        <div className="flex items-center justify-center">
          <div className="text-4xl font-bold text-red-500 bg-gray-800 px-4 py-2 rounded">
            VS
          </div>
        </div>

        {/* 玩家2区域 */}
        <div className="flex gap-4">
          {/* HOLD区域 - 左侧 */}
          <div className="flex flex-col gap-4">
            <HoldPieceDisplay 
              holdPiece={player2HoldPiece} 
              canHold={true}
            />
            
            {/* 玩家2统计 */}
            <div className="bg-gray-800 p-3 rounded text-white text-sm">
              <div className="space-y-1">
                <div>Score: {player2Stats.score.toLocaleString()}</div>
                <div>Lines: {player2Stats.lines}</div>
                <div>Level: {player2Stats.level}</div>
                <div>APM: {player2Stats.apm.toFixed(1)}</div>
                <div>PPS: {player2Stats.pps.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* 玩家2游戏板 */}
          <div>
            <h2 className="text-white text-lg font-bold mb-2 text-center">Player 2</h2>
            <GameBoard
              board={player2Board}
              currentPiece={player2CurrentPiece}
              cellSize={cellSize}
            />
          </div>

          {/* NEXT区域 - 右侧 */}
          <div className="bg-gray-800 p-3 rounded">
            <h3 className="text-white text-sm font-bold mb-2">NEXT</h3>
            <div className="space-y-2">
              {player2NextPieces.slice(0, 5).map((piece, index) => (
                <PiecePreview 
                  key={index}
                  piece={piece.type} 
                  cellSize={cellSize * 0.8}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleLayout;
