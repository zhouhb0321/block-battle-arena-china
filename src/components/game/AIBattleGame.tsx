import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import OneVsOneGameArea from './OneVsOneGameArea';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { findBestPlacementWithHold, getAIThinkTime, getAIActionStep } from '@/utils/aiEngine';
import type { GameSettings } from '@/utils/gameTypes';

interface AIBattleGameProps {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  onBack: () => void;
}

export const AIBattleGame: React.FC<AIBattleGameProps> = ({ difficulty, onBack }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useUserSettings();
  const [gameStarted, setGameStarted] = useState(false);

  const gameSettings: GameSettings = useMemo(() => ({
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
  }), [settings.das, settings.arr, settings.sdf, settings.dcd, settings.controls, settings.enableGhost, settings.enableSound, settings.masterVolume, settings.backgroundMusic, settings.musicVolume, settings.ghostOpacity, settings.enableWallpaper, settings.undoSteps, settings.wallpaperChangeInterval]);

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

  // ---- Stable callbacks via ref ----
  const playerLogicRef = useRef(playerGameLogic);
  useEffect(() => { playerLogicRef.current = playerGameLogic; });

  const stableMoveLeft = useCallback(() => playerLogicRef.current.movePiece(-1, 0), []);
  const stableMoveRight = useCallback(() => playerLogicRef.current.movePiece(1, 0), []);
  const stableSoftDrop = useCallback(() => playerLogicRef.current.movePiece(0, 1), []);
  const stableHardDrop = useCallback(() => playerLogicRef.current.hardDrop(), []);
  const stableRotateCW = useCallback(() => playerLogicRef.current.rotatePieceClockwise(), []);
  const stableRotateCCW = useCallback(() => playerLogicRef.current.rotatePieceCounterclockwise(), []);
  const stableRotate180 = useCallback(() => playerLogicRef.current.rotatePiece180(), []);
  const stableHold = useCallback(() => playerLogicRef.current.holdCurrentPiece(), []);
  const stableInstantSoftDrop = useCallback(() => playerLogicRef.current.instantSoftDrop(), []);
  const stablePause = useCallback(() => {
    if (playerLogicRef.current.isPaused) playerLogicRef.current.resumeGame();
    else playerLogicRef.current.pauseGame();
  }, []);

  const { processHeldKeys } = useKeyboardControls({
    gameSettings,
    gameOver: playerGameLogic.gameOver,
    paused: playerGameLogic.isPaused || !gameStarted,
    onMoveLeft: stableMoveLeft,
    onMoveRight: stableMoveRight,
    onSoftDrop: stableSoftDrop,
    onHardDrop: stableHardDrop,
    onRotateClockwise: stableRotateCW,
    onRotateCounterclockwise: stableRotateCCW,
    onRotate180: stableRotate180,
    onHold: stableHold,
    onPause: stablePause,
    onBackToMenu: onBack,
    onInstantSoftDrop: stableInstantSoftDrop,
  });

  // rAF loop for DAS/ARR
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

  // ---- AI two-phase state machine ----
  const aiLogicRef = useRef(aiGameLogic);
  useEffect(() => { aiLogicRef.current = aiGameLogic; });

  const aiTargetRef = useRef<{ rotation: number; x: number; shouldHold: boolean } | null>(null);
  const aiPhaseRef = useRef<'thinking' | 'holding' | 'rotating' | 'moving' | 'dropping'>('thinking');
  const aiLastPieceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gameStarted || aiGameLogic.gameOver) return;

    const thinkTime = getAIThinkTime(difficulty);
    const actionStep = getAIActionStep(difficulty);

    let thinkTimer: NodeJS.Timeout | null = null;
    let actionTimer: NodeJS.Timeout | null = null;

    const startThinking = () => {
      thinkTimer = setTimeout(() => {
        const logic = aiLogicRef.current;
        const piece = logic.currentPiece;
        if (!piece) {
          startThinking();
          return;
        }

        const pieceType = piece.type?.type || piece.type?.name;
        if (!pieceType) {
          startThinking();
          return;
        }

        const holdType = logic.holdPiece?.type?.type || logic.holdPiece?.type?.name || null;
        const nextPiece = logic.nextPieces?.[0];
        const nextType = nextPiece?.type?.type ?? nextPiece?.type?.name ?? null;

        const best = findBestPlacementWithHold(logic.board, pieceType, holdType, nextType, difficulty);
        if (!best) {
          // Mistake: just drop
          logic.hardDrop();
          aiPhaseRef.current = 'thinking';
          startThinking();
          return;
        }

        aiTargetRef.current = { rotation: best.targetRotation, x: best.targetX, shouldHold: best.shouldHold };
        aiPhaseRef.current = best.shouldHold ? 'holding' : 'rotating';
        startExecuting();
      }, thinkTime);
    };

    const startExecuting = () => {
      actionTimer = setInterval(() => {
        const logic = aiLogicRef.current;
        const piece = logic.currentPiece;
        if (!piece) return;

        const target = aiTargetRef.current;
        if (!target) {
          clearInterval(actionTimer!);
          aiPhaseRef.current = 'thinking';
          startThinking();
          return;
        }

        if (aiPhaseRef.current === 'holding') {
          logic.holdCurrentPiece();
          aiPhaseRef.current = 'rotating';
          return;
        }

        if (aiPhaseRef.current === 'rotating') {
          const currentRot = piece.rotation || 0;
          if (currentRot !== target.rotation) {
            logic.rotatePieceClockwise();
            return;
          }
          aiPhaseRef.current = 'moving';
        }

        if (aiPhaseRef.current === 'moving') {
          if (piece.x < target.x) {
            logic.movePiece(1, 0);
            return;
          } else if (piece.x > target.x) {
            logic.movePiece(-1, 0);
            return;
          }
          aiPhaseRef.current = 'dropping';
        }

        if (aiPhaseRef.current === 'dropping') {
          logic.hardDrop();
          aiTargetRef.current = null;
          aiPhaseRef.current = 'thinking';
          clearInterval(actionTimer!);
          startThinking();
        }
      }, actionStep);
    };

    aiPhaseRef.current = 'thinking';
    startThinking();

    return () => {
      if (thinkTimer) clearTimeout(thinkTimer);
      if (actionTimer) clearInterval(actionTimer);
    };
  }, [gameStarted, aiGameLogic.gameOver, difficulty]);

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
            pieces: 0, attack: 0, startTime: null, endTime: null,
            ghostPiece: playerGameLogic.ghostPiece,
            clearingLines: [], achievements: []
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
            pieces: 0, attack: 0, startTime: null, endTime: null,
            ghostPiece: aiGameLogic.ghostPiece,
            clearingLines: [], achievements: []
          }}
          player2Username={`AI Bot (${getDifficultyLabel(difficulty)})`}
          gameSettings={gameSettings}
        />
      </div>
    </div>
  );
};
