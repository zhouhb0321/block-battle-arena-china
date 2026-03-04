/**
 * TETR.IO 风格双人对战布局
 * 参考 TETR.IO 截图设计
 */
import React from 'react';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import AchievementDisplay from '@/components/AchievementDisplay';
import type { GamePiece, GameState } from '@/utils/gameTypes';

interface PlayerSideProps {
  board: number[][];
  currentPiece: GamePiece | null;
  ghostPiece: GamePiece | null;
  nextPieces: GamePiece[];
  holdPiece: GamePiece | null;
  canHold?: boolean;
  username: string;
  score: number;
  lines: number;
  level: number;
  pps: number;
  apm: number;
  time: number;
  pieces: number;
  attack: number;
  combo: number;
  b2b: number;
  accentColor: 'blue' | 'red' | 'green' | 'yellow';
  isLeft?: boolean;
  achievements?: any[];
  onAchievementComplete?: (id: string) => void;
  cellSize?: number;
  enableGhost?: boolean;
}

// 单个玩家区域
const PlayerSide: React.FC<PlayerSideProps> = ({
  board,
  currentPiece,
  ghostPiece,
  nextPieces,
  holdPiece,
  canHold = true,
  username,
  score,
  lines,
  level,
  pps,
  apm,
  time,
  pieces,
  attack,
  combo,
  b2b,
  accentColor,
  isLeft = true,
  achievements = [],
  onAchievementComplete,
  cellSize = 22,
  enableGhost = true
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const accentColors = {
    blue: 'border-blue-500/50 text-blue-400',
    red: 'border-red-500/50 text-red-400',
    green: 'border-green-500/50 text-green-400',
    yellow: 'border-yellow-500/50 text-yellow-400'
  };

  const bgColors = {
    blue: 'bg-blue-500/10',
    red: 'bg-red-500/10',
    green: 'bg-green-500/10',
    yellow: 'bg-yellow-500/10'
  };

  // Left player: [HOLD+Stats] [Board] [NEXT]
  // Right player (mirrored): [NEXT] [Board] [HOLD+Stats]
  const HoldPanel = () => (
    <div className="flex flex-col gap-2 w-24">
      {/* HOLD */}
      <div className={`${bgColors[accentColor]} border ${accentColors[accentColor]} rounded-lg p-2`}>
        <div className="text-[10px] text-white/60 mb-1 text-center font-bold tracking-wider">HOLD</div>
        <HoldPieceDisplay holdPiece={holdPiece} canHold={canHold} />
      </div>
      
      {/* B2B */}
      {b2b > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-yellow-500 font-bold">B2B</div>
          <div className="text-lg font-bold text-yellow-400">×{b2b}</div>
        </div>
      )}
      
      {/* Stats */}
      <div className={`${bgColors[accentColor]} border ${accentColors[accentColor]} rounded-lg p-2 space-y-1`}>
        <StatRow label="PIECES" value={pieces.toString()} />
        <StatRow label="PPS" value={pps.toFixed(2)} />
        <StatRow label="ATTACK" value={attack.toString()} />
        <StatRow label="APM" value={apm.toFixed(1)} />
        <StatRow label="TIME" value={formatTime(time)} />
      </div>
      
      {/* Achievements */}
      <div className="min-h-[100px]">
        <AchievementDisplay 
          achievements={achievements}
          onAchievementComplete={onAchievementComplete || (() => {})}
        />
      </div>
    </div>
  );

  const NextPanel = () => (
    <div className="flex flex-col gap-2 w-24">
      {/* NEXT queue */}
      <div className={`${bgColors[accentColor]} border ${accentColors[accentColor]} rounded-lg p-2`}>
        <div className="text-[10px] text-white/60 mb-1 text-center font-bold tracking-wider">NEXT</div>
        <NextPiecePreview nextPieces={nextPieces.slice(0, 5)} compact={true} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2">
        <HoldPanel />
        
        {/* 游戏棋盘 */}
        <div className={`border-2 ${accentColors[accentColor]} rounded-lg p-1 ${bgColors[accentColor]}`}>
          <EnhancedGameBoard
            board={board}
            currentPiece={currentPiece}
            ghostPiece={enableGhost ? ghostPiece : null}
            cellSize={cellSize}
            showGrid={true}
          />
        </div>
        
        <NextPanel />
      </div>
      
      {/* 玩家名称 */}
      <div className={`mt-2 text-center font-bold ${accentColors[accentColor]} text-lg uppercase tracking-wider`}>
        {username}
      </div>
    </div>
  );
};

// 统计行组件
const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between text-[10px]">
    <span className="text-white/50 font-medium">{label}</span>
    <span className="text-white font-mono">{value}</span>
  </div>
);

// 中央区域 - VS + COMBO + 比分
interface CenterAreaProps {
  player1Score: number;
  player2Score: number;
  player1MatchWins: number;
  player2MatchWins: number;
  combo1: number;
  combo2: number;
  matchNumber: number;
  totalMatches: number;
}

const CenterArea: React.FC<CenterAreaProps> = ({
  player1Score,
  player2Score,
  player1MatchWins,
  player2MatchWins,
  combo1,
  combo2,
  matchNumber,
  totalMatches
}) => (
  <div className="flex flex-col items-center justify-center px-4 py-8 min-w-[120px]">
    {/* 比赛进度 */}
    <div className="text-xs text-muted-foreground mb-2">
      MATCH {matchNumber}/{totalMatches}
    </div>
    
    {/* 局数比分 */}
    <div className="flex items-center gap-3 mb-4">
      <span className="text-2xl font-bold text-blue-400">{player1MatchWins}</span>
      <span className="text-lg text-muted-foreground">-</span>
      <span className="text-2xl font-bold text-red-400">{player2MatchWins}</span>
    </div>
    
    {/* VS */}
    <div className="relative my-4">
      <div className="text-4xl font-black text-yellow-500 drop-shadow-lg">VS</div>
      <div className="absolute inset-0 text-4xl font-black text-yellow-400 blur-sm -z-10">VS</div>
    </div>
    
    {/* 当前局分数对比 */}
    <div className="mt-4 text-center space-y-1">
      <div className="text-[10px] text-muted-foreground">SCORE</div>
      <div className="flex gap-2 items-center">
        <span className="text-sm font-mono text-blue-300">{player1Score.toLocaleString()}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="text-sm font-mono text-red-300">{player2Score.toLocaleString()}</span>
      </div>
    </div>
    
    {/* COMBO 显示 */}
    {(combo1 > 0 || combo2 > 0) && (
      <div className="mt-4 flex gap-4">
        {combo1 > 0 && (
          <div className="text-center">
            <div className="text-[10px] text-blue-400">COMBO</div>
            <div className="text-lg font-bold text-blue-300">{combo1}</div>
          </div>
        )}
        {combo2 > 0 && (
          <div className="text-center">
            <div className="text-[10px] text-red-400">COMBO</div>
            <div className="text-lg font-bold text-red-300">{combo2}</div>
          </div>
        )}
      </div>
    )}
  </div>
);

// 主布局组件
interface TetrioBattleLayoutProps {
  player1: {
    state: GameState;
    username: string;
    matchWins: number;
  };
  player2: {
    state: GameState;
    username: string;
    matchWins: number;
  };
  matchNumber: number;
  totalMatches: number;
  cellSize?: number;
  enableGhost?: boolean;
}

const TetrioBattleLayout: React.FC<TetrioBattleLayoutProps> = ({
  player1,
  player2,
  matchNumber,
  totalMatches,
  cellSize = 22,
  enableGhost = true
}) => {
  return (
    <div className="flex justify-center items-center gap-4 p-4">
      {/* 玩家1 (左侧) */}
      <PlayerSide
        board={player1.state.board}
        currentPiece={player1.state.currentPiece}
        ghostPiece={player1.state.ghostPiece}
        nextPieces={player1.state.nextPieces}
        holdPiece={player1.state.holdPiece}
        canHold={player1.state.canHold}
        username={player1.username}
        score={player1.state.score}
        lines={player1.state.lines}
        level={player1.state.level}
        pps={player1.state.pps}
        apm={player1.state.apm || 0}
        time={player1.state.startTime ? Math.floor((Date.now() - player1.state.startTime) / 1000) : 0}
        pieces={player1.state.pieces}
        attack={player1.state.attack}
        combo={player1.state.combo}
        b2b={player1.state.b2b}
        accentColor="blue"
        isLeft={true}
        achievements={player1.state.achievements}
        cellSize={cellSize}
        enableGhost={enableGhost}
      />
      
      {/* 中央区域 */}
      <CenterArea
        player1Score={player1.state.score}
        player2Score={player2.state.score}
        player1MatchWins={player1.matchWins}
        player2MatchWins={player2.matchWins}
        combo1={player1.state.combo}
        combo2={player2.state.combo}
        matchNumber={matchNumber}
        totalMatches={totalMatches}
      />
      
      {/* 玩家2 (右侧) */}
      <PlayerSide
        board={player2.state.board}
        currentPiece={player2.state.currentPiece}
        ghostPiece={player2.state.ghostPiece}
        nextPieces={player2.state.nextPieces}
        holdPiece={player2.state.holdPiece}
        canHold={player2.state.canHold}
        username={player2.username}
        score={player2.state.score}
        lines={player2.state.lines}
        level={player2.state.level}
        pps={player2.state.pps}
        apm={player2.state.apm || 0}
        time={player2.state.startTime ? Math.floor((Date.now() - player2.state.startTime) / 1000) : 0}
        pieces={player2.state.pieces}
        attack={player2.state.attack}
        combo={player2.state.combo}
        b2b={player2.state.b2b}
        accentColor="red"
        isLeft={false}
        achievements={player2.state.achievements}
        cellSize={cellSize}
        enableGhost={enableGhost}
      />
    </div>
  );
};

export default TetrioBattleLayout;
