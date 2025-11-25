import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import OneVsOneGameArea from './OneVsOneGameArea';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useAuth } from '@/contexts/AuthContext';
import type { GameSettings, GameMode } from '@/utils/gameTypes';

interface AIBattleGameProps {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  onBack: () => void;
}

// AI决策函数 - 根据难度返回最佳移动
const makeAIMove = (
  board: number[][],
  currentPiece: any,
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
): 'moveLeft' | 'moveRight' | 'rotate' | 'hardDrop' | 'hold' | null => {
  if (!currentPiece) return null;

  // 根据难度调整反应速度和策略复杂度
  const reactionDelay = {
    easy: 500,
    medium: 300,
    hard: 150,
    expert: 50
  }[difficulty];

  // 简单的AI逻辑：寻找最佳列位置
  const findBestColumn = (): number => {
    let bestColumn = currentPiece.x;
    let bestScore = -Infinity;

    // 扫描所有可能的列
    for (let col = 0; col < 10; col++) {
      // 计算此列的得分（基于高度和孔洞数）
      let columnHeight = 0;
      let holes = 0;

      for (let row = 0; row < board.length; row++) {
        if (board[row][col] !== 0) {
          columnHeight = board.length - row;
          break;
        }
      }

      // 计算孔洞
      for (let row = 0; row < board.length; row++) {
        if (board[row][col] === 0) {
          let hasBlockAbove = false;
          for (let r = row - 1; r >= 0; r--) {
            if (board[r][col] !== 0) {
              hasBlockAbove = true;
              break;
            }
          }
          if (hasBlockAbove) holes++;
        }
      }

      // 得分：较低高度得分更高，孔洞越少得分越高
      const score = (20 - columnHeight) - holes * 5;

      if (score > bestScore) {
        bestScore = score;
        bestColumn = col;
      }
    }

    return bestColumn;
  };

  // 根据难度执行不同策略
  const targetColumn = findBestColumn();

  if (currentPiece.x < targetColumn) {
    return 'moveRight';
  } else if (currentPiece.x > targetColumn) {
    return 'moveLeft';
  } else if (Math.random() > 0.7) {
    // 30%概率旋转（增加变化）
    return 'rotate';
  } else {
    return 'hardDrop';
  }
};

export const AIBattleGame: React.FC<AIBattleGameProps> = ({ difficulty, onBack }) => {
  const { user } = useAuth();
  const [gameStarted, setGameStarted] = useState(false);

  // 默认游戏设置
  const defaultSettings: GameSettings = {
    das: 167,
    arr: 33,
    sdf: 41,
    dcd: 0,
    controls: {
      moveLeft: 'ArrowLeft',
      moveRight: 'ArrowRight',
      softDrop: 'ArrowDown',
      hardDrop: 'Space',
      rotateClockwise: 'ArrowUp',
      rotateCounterclockwise: 'KeyZ',
      rotate180: 'KeyA',
      hold: 'KeyC',
      pause: 'Escape',
      backToMenu: 'KeyQ'
    },
    enableGhost: true,
    enableSound: true,
    masterVolume: 0.7,
    backgroundMusic: '',
    musicVolume: 0.5,
    ghostOpacity: 0.5,
    enableWallpaper: true,
    undoSteps: 0,
    wallpaperChangeInterval: 30000
  };

  // 玩家游戏逻辑
  const playerGameLogic = useGameLogic({
    gameMode: '40-line' as any,
    preGeneratedPieceTypes: []
  });

  // AI游戏逻辑
  const aiGameLogic = useGameLogic({
    gameMode: '40-line' as any,
    preGeneratedPieceTypes: []
  });

  const aiMoveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AI自动决策循环
  useEffect(() => {
    if (!gameStarted) return;

    const aiSpeed = {
      easy: 800,
      medium: 500,
      hard: 300,
      expert: 150
    }[difficulty];

    aiMoveIntervalRef.current = setInterval(() => {
      const move = makeAIMove(aiGameLogic.board, aiGameLogic.currentPiece, difficulty);
      
      if (move === 'moveLeft') {
        aiGameLogic.movePiece(-1, 0);
      } else if (move === 'moveRight') {
        aiGameLogic.movePiece(1, 0);
      } else if (move === 'rotate') {
        aiGameLogic.rotatePieceClockwise();
      } else if (move === 'hardDrop') {
        aiGameLogic.hardDrop();
      }
    }, aiSpeed);

    return () => {
      if (aiMoveIntervalRef.current) {
        clearInterval(aiMoveIntervalRef.current);
      }
    };
  }, [gameStarted, difficulty, aiGameLogic]);

  const handleStart = () => {
    playerGameLogic.startGame();
    aiGameLogic.startGame();
    setGameStarted(true);
  };

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      case 'expert': return '专家';
      default: return diff;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between p-4 bg-card border-b">
        <Button variant="outline" onClick={onBack}>
          ← 返回
        </Button>
        <div className="text-center">
          <h2 className="text-xl font-bold">AI对战练习</h2>
          <p className="text-sm text-muted-foreground">
            难度: {getDifficultyLabel(difficulty)}
          </p>
        </div>
        {!gameStarted ? (
          <Button onClick={handleStart} className="bg-green-500 hover:bg-green-600">
            开始游戏
          </Button>
        ) : (
          <Button onClick={onBack} variant="outline">
            结束游戏
          </Button>
        )}
      </div>

      {/* 双窗口游戏区域 */}
      <div className="flex-1 overflow-hidden">
        <OneVsOneGameArea
          player1State={{
            board: playerGameLogic.board,
            currentPiece: playerGameLogic.currentPiece,
            nextPieces: playerGameLogic.nextPieces,
            holdPiece: playerGameLogic.holdPiece,
            canHold: playerGameLogic.canHold,
            isHolding: false,
            score: playerGameLogic.score,
            lines: playerGameLogic.lines,
            level: playerGameLogic.level,
            gameOver: playerGameLogic.gameOver,
            paused: playerGameLogic.isPaused,
            pps: playerGameLogic.pps,
            apm: playerGameLogic.apm,
            combo: playerGameLogic.comboCount,
            b2b: playerGameLogic.isB2B,
            pieces: 0,
            attack: 0,
            startTime: null,
            endTime: null,
            ghostPiece: null,
            clearingLines: [],
            achievements: []
          }}
          player1Username={user?.username || 'Player'}
          player2State={{
            board: aiGameLogic.board,
            currentPiece: aiGameLogic.currentPiece,
            nextPieces: aiGameLogic.nextPieces,
            holdPiece: aiGameLogic.holdPiece,
            canHold: aiGameLogic.canHold,
            isHolding: false,
            score: aiGameLogic.score,
            lines: aiGameLogic.lines,
            level: aiGameLogic.level,
            gameOver: aiGameLogic.gameOver,
            paused: aiGameLogic.isPaused,
            pps: aiGameLogic.pps,
            apm: aiGameLogic.apm,
            combo: aiGameLogic.comboCount,
            b2b: aiGameLogic.isB2B,
            pieces: 0,
            attack: 0,
            startTime: null,
            endTime: null,
            ghostPiece: null,
            clearingLines: [],
            achievements: []
          }}
          player2Username={`AI Bot (${getDifficultyLabel(difficulty)})`}
          gameSettings={defaultSettings}
        />
      </div>
    </div>
  );
};
