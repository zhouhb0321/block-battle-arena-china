import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import OneVsOneGameArea from './OneVsOneGameArea';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { findBestPlacement, getAIMoveInterval } from '@/utils/aiEngine';
import type { GameSettings, GameMode } from '@/utils/gameTypes';

interface AIBattleGameProps {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  onBack: () => void;
}

export const AIBattleGame: React.FC<AIBattleGameProps> = ({ difficulty, onBack }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useUserSettings();
  const [gameStarted, setGameStarted] = useState(false);

  // Convert UserSettings to GameSettings format
  const gameSettings: GameSettings = {
    das: settings.das,
    arr: settings.arr,
    sdf: settings.sdf,
    dcd: settings.dcd,
    controls: settings.controls,
    enableGhost: settings.enableGhost,
    enableSound: settings.enableSound,
    masterVolume: settings.masterVolume,
    backgroundMusic: settings.backgroundMusic,
    musicVolume: settings.musicVolume,
    ghostOpacity: settings.ghostOpacity,
    enableWallpaper: settings.enableWallpaper,
    undoSteps: settings.undoSteps,
    wallpaperChangeInterval: settings.wallpaperChangeInterval,
  };

  // Player game logic
  const playerGameLogic = useGameLogic({
    gameMode: { id: 'endless', name: 'AI Battle' } as any,
    preGeneratedPieceTypes: []
  });

  // AI game logic
  const aiGameLogic = useGameLogic({
    gameMode: { id: 'endless', name: 'AI Battle' } as any,
    preGeneratedPieceTypes: []
  });

  // Player keyboard controls
  const { processHeldKeys } = useKeyboardControls({
    gameSettings,
    gameOver: playerGameLogic.gameOver,
    paused: playerGameLogic.isPaused || !gameStarted,
    onMoveLeft: () => playerGameLogic.movePiece(-1, 0),
    onMoveRight: () => playerGameLogic.movePiece(1, 0),
    onSoftDrop: () => playerGameLogic.movePiece(0, 1),
    onHardDrop: () => playerGameLogic.hardDrop(),
    onRotateClockwise: () => playerGameLogic.rotatePieceClockwise(),
    onRotateCounterclockwise: () => playerGameLogic.rotatePieceCounterclockwise(),
    onRotate180: () => playerGameLogic.rotatePiece180(),
    onHold: () => playerGameLogic.holdCurrentPiece(),
    onPause: () => {
      if (playerGameLogic.isPaused) playerGameLogic.resumeGame();
      else playerGameLogic.pauseGame();
    },
    onBackToMenu: onBack,
    onInstantSoftDrop: () => playerGameLogic.instantSoftDrop(),
  });

  // rAF loop for DAS/ARR processing
  useEffect(() => {
    if (!gameStarted || playerGameLogic.gameOver) return;
    let animId: number;
    const tick = (ts: number) => {
      processHeldKeys(ts);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [gameStarted, playerGameLogic.gameOver, processHeldKeys]);

  // AI decision state
  const aiTargetRef = useRef<{ rotation: number; x: number } | null>(null);
  const aiPhaseRef = useRef<'thinking' | 'rotating' | 'moving' | 'dropping'>('thinking');
  const aiMoveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AI decision loop
  useEffect(() => {
    if (!gameStarted || aiGameLogic.gameOver) return;

    const interval = getAIMoveInterval(difficulty);

    aiMoveIntervalRef.current = setInterval(() => {
      const piece = aiGameLogic.currentPiece;
      if (!piece) return;

      // Phase: thinking - find best placement
      if (aiPhaseRef.current === 'thinking') {
        const pieceType = piece.type?.type || piece.type?.name;
        if (!pieceType) return;
        
        const best = findBestPlacement(aiGameLogic.board, pieceType, difficulty);
        if (!best) {
          // Mistake: just hard drop wherever
          aiGameLogic.hardDrop();
          return;
        }
        aiTargetRef.current = { rotation: best.targetRotation, x: best.targetX };
        aiPhaseRef.current = 'rotating';
      }

      const target = aiTargetRef.current;
      if (!target) {
        aiPhaseRef.current = 'thinking';
        return;
      }

      // Phase: rotating
      if (aiPhaseRef.current === 'rotating') {
        const currentRot = piece.rotation || 0;
        if (currentRot !== target.rotation) {
          aiGameLogic.rotatePieceClockwise();
          return;
        }
        aiPhaseRef.current = 'moving';
      }

      // Phase: moving
      if (aiPhaseRef.current === 'moving') {
        if (piece.x < target.x) {
          aiGameLogic.movePiece(1, 0);
          return;
        } else if (piece.x > target.x) {
          aiGameLogic.movePiece(-1, 0);
          return;
        }
        aiPhaseRef.current = 'dropping';
      }

      // Phase: dropping
      if (aiPhaseRef.current === 'dropping') {
        aiGameLogic.hardDrop();
        aiTargetRef.current = null;
        aiPhaseRef.current = 'thinking';
      }
    }, interval);

    return () => {
      if (aiMoveIntervalRef.current) clearInterval(aiMoveIntervalRef.current);
    };
  }, [gameStarted, difficulty, aiGameLogic]);

  const handleStart = () => {
    playerGameLogic.startGame();
    aiGameLogic.startGame();
    aiPhaseRef.current = 'thinking';
    aiTargetRef.current = null;
    setGameStarted(true);
  };

  const getDifficultyLabel = (diff: string) => {
    const key = `ai_battle.difficulty_${diff}`;
    const translated = t(key);
    return translated !== key ? translated : diff;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top control bar */}
      <div className="flex items-center justify-between p-4 bg-card border-b">
        <Button variant="outline" onClick={onBack}>
          ← {t('ai_battle.back') !== 'ai_battle.back' ? t('ai_battle.back') : 'Back'}
        </Button>
        <div className="text-center">
          <h2 className="text-xl font-bold">
            {t('ai_battle.title') !== 'ai_battle.title' ? t('ai_battle.title') : 'AI Battle Practice'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('ai_battle.difficulty_label') !== 'ai_battle.difficulty_label' ? t('ai_battle.difficulty_label') : 'Difficulty'}: {getDifficultyLabel(difficulty)}
          </p>
        </div>
        {!gameStarted ? (
          <Button onClick={handleStart} className="bg-green-500 hover:bg-green-600">
            {t('ai_battle.start') !== 'ai_battle.start' ? t('ai_battle.start') : 'Start Game'}
          </Button>
        ) : (
          <Button onClick={onBack} variant="outline">
            {t('ai_battle.end') !== 'ai_battle.end' ? t('ai_battle.end') : 'End Game'}
          </Button>
        )}
      </div>

      {/* Dual game area */}
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
            ghostPiece: playerGameLogic.ghostPiece,
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
            ghostPiece: aiGameLogic.ghostPiece,
            clearingLines: [],
            achievements: []
          }}
          player2Username={`AI Bot (${getDifficultyLabel(difficulty)})`}
          gameSettings={gameSettings}
        />
      </div>
    </div>
  );
};
