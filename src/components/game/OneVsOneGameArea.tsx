
import React from 'react';
import GameBoard from '../GameBoard';
import NextPiecePreview from '../NextPiecePreview';
import HoldPieceDisplay from '../HoldPieceDisplay';
import GameCountdownInArea from '../GameCountdownInArea';
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
  const cellSize = 24;

  const formatTime = (startTime: number | undefined) => {
    if (!startTime) return '00:00';
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* 顶部玩家信息栏 */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="text-blue-400 font-bold text-lg">{player1Username}</div>
            <div className="text-white text-2xl font-bold">{player1State.score.toLocaleString()}</div>
          </div>
          
          <div className="text-center">
            <div className="text-yellow-400 text-xl font-bold">VS</div>
            <div className="text-gray-400 text-sm">SCORE</div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-white text-2xl font-bold">{player2State.score.toLocaleString()}</div>
            <div className="text-red-400 font-bold text-lg">{player2Username}</div>
          </div>
        </div>
      </div>

      {/* 主游戏区域 */}
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="flex gap-8 items-start">
          {/* 玩家1区域 */}
          <div className="flex gap-4">
            {/* 玩家1统计面板 */}
            <div className="flex flex-col gap-3 w-32">
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-blue-400 text-xs font-bold mb-1">PIECES</div>
                <div className="text-white text-lg font-bold">{player1State.pieces || 0}</div>
              </div>
              
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-blue-400 text-xs font-bold mb-1">ATTACK</div>
                <div className="text-white text-lg font-bold">{player1State.attack || 0}</div>
              </div>
              
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-blue-400 text-xs font-bold mb-1">TIME</div>
                <div className="text-white text-sm font-mono">{formatTime(player1State.startTime)}</div>
              </div>
              
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-blue-400 text-xs font-bold mb-1">PPS</div>
                <div className="text-white text-sm">{player1State.pps.toFixed(2)}</div>
              </div>
            </div>

            {/* 玩家1 Hold区域 */}
            <HoldPieceDisplay 
              holdPiece={player1State.holdPiece}
              canHold={player1State.canHold}
            />

            {/* 玩家1游戏板 */}
            <div className="relative">
              <GameBoard
                board={player1State.board}
                currentPiece={player1State.currentPiece}
                ghostPiece={gameSettings.enableGhost ? player1State.ghostPiece : null}
                enableGhost={gameSettings.enableGhost}
                cellSize={cellSize}
              />
              
              {/* 倒计时只在玩家1区域显示 */}
              {showCountdown && (
                <GameCountdownInArea show={showCountdown} onCountdownEnd={onCountdownEnd} />
              )}
            </div>

            {/* 玩家1 Next区域 */}
            <NextPiecePreview 
              nextPieces={player1State.nextPieces} 
              compact={true}
            />
          </div>

          {/* 中央分隔线 */}
          <div className="w-px bg-gray-600 h-96"></div>

          {/* 玩家2区域 */}
          <div className="flex gap-4">
            {/* 玩家2 Next区域 */}
            <NextPiecePreview 
              nextPieces={player2State.nextPieces} 
              compact={true}
            />

            {/* 玩家2游戏板 */}
            <div className="relative">
              <GameBoard
                board={player2State.board}
                currentPiece={player2State.currentPiece}
                ghostPiece={gameSettings.enableGhost ? player2State.ghostPiece : null}
                enableGhost={gameSettings.enableGhost}
                cellSize={cellSize}
              />
            </div>

            {/* 玩家2 Hold区域 */}
            <HoldPieceDisplay 
              holdPiece={player2State.holdPiece}
              canHold={player2State.canHold}
            />

            {/* 玩家2统计面板 */}
            <div className="flex flex-col gap-3 w-32">
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-red-400 text-xs font-bold mb-1">PIECES</div>
                <div className="text-white text-lg font-bold">{player2State.pieces || 0}</div>
              </div>
              
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-red-400 text-xs font-bold mb-1">ATTACK</div>
                <div className="text-white text-lg font-bold">{player2State.attack || 0}</div>
              </div>
              
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-red-400 text-xs font-bold mb-1">TIME</div>
                <div className="text-white text-sm font-mono">{formatTime(player2State.startTime)}</div>
              </div>
              
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-red-400 text-xs font-bold mb-1">PPS</div>
                <div className="text-white text-sm">{player2State.pps.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部信息栏（可选） */}
      <div className="bg-gray-800 p-2 border-t border-gray-700">
        <div className="flex justify-center">
          <div className="text-gray-400 text-sm">1v1 Battle Mode</div>
        </div>
      </div>
    </div>
  );
};

export default OneVsOneGameArea;
