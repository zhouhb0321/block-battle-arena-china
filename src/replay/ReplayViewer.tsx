import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Gauge, Pause, Play, RotateCcw } from 'lucide-react';
import { getPieceShape } from '@/utils/tetrominoShapes';
import type { V4ReplayData } from '@/utils/replayV4/types';
import {
  BOARD_COLS,
  VISIBLE_ROWS,
  buildTimeline,
  sampleAt,
  type FrameState,
} from './timeline';

const PIECE_COLORS: Record<string, string> = {
  I: '#22d3ee',
  O: '#facc15',
  T: '#a855f7',
  S: '#22c55e',
  Z: '#ef4444',
  J: '#3b82f6',
  L: '#f97316',
};

const CELL_COLORS = [
  '#475569',
  '#22d3ee',
  '#facc15',
  '#a855f7',
  '#22c55e',
  '#ef4444',
  '#3b82f6',
  '#f97316',
];

const SPEEDS = [0.5, 1, 2, 4];
const HIDDEN_ROWS = 3;

export interface ReplayViewerProps {
  replay: V4ReplayData;
  onClose?: () => void;
  autoPlay?: boolean;
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ReplayViewer({ replay, onClose, autoPlay = true }: ReplayViewerProps) {
  const timeline = useMemo(() => buildTimeline(replay), [replay]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);
  const stateRef = useRef<FrameState | null>(null);

  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);
  const [uiTime, setUiTime] = useState(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = sampleAt(timeline, timeRef.current);
    stateRef.current = state;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = Math.floor(Math.min((cssW - 8) / BOARD_COLS, (cssH - 8) / VISIBLE_ROWS));
    const boardW = cell * BOARD_COLS;
    const boardH = cell * VISIBLE_ROWS;
    const offsetX = Math.floor((cssW - boardW) / 2);
    const offsetY = Math.floor((cssH - boardH) / 2);

    ctx.clearRect(0, 0, cssW, cssH);

    // board background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(offsetX, offsetY, boardW, boardH);

    // grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= BOARD_COLS; c += 1) {
      const x = offsetX + c * cell + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + boardH);
      ctx.stroke();
    }
    for (let r = 0; r <= VISIBLE_ROWS; r += 1) {
      const y = offsetY + r * cell + 0.5;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + boardW, y);
      ctx.stroke();
    }

    const paintCell = (col: number, row: number, color: string) => {
      if (col < 0 || col >= BOARD_COLS || row < 0 || row >= VISIBLE_ROWS) return;
      const x = offsetX + col * cell;
      const y = offsetY + row * cell;
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + 1, y + 1, cell - 2, Math.max(2, Math.floor(cell * 0.18)));
    };

    // settled blocks
    for (let r = 0; r < VISIBLE_ROWS; r += 1) {
      for (let c = 0; c < BOARD_COLS; c += 1) {
        const value = state.board?.[r]?.[c] ?? 0;
        if (!value) continue;
        const color = CELL_COLORS[value] ?? CELL_COLORS[0];
        paintCell(c, r, color);
      }
    }

    // active piece
    if (state.piece) {
      const shape = getPieceShape(state.piece.type, state.piece.rotation);
      const color = PIECE_COLORS[state.piece.type] ?? '#e2e8f0';
      for (let r = 0; r < shape.length; r += 1) {
        for (let c = 0; c < (shape[r]?.length ?? 0); c += 1) {
          if (shape[r][c]) paintCell(state.piece.x + c, state.piece.y - HIDDEN_ROWS + r, color);
        }
      }
    }

    // board border
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.strokeRect(offsetX + 0.5, offsetY + 0.5, boardW - 1, boardH - 1);
  }, [timeline]);

  // playback loop
  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;

    const loop = (now: number) => {
      const dt = (now - last) * speed;
      last = now;
      timeRef.current = Math.min(timeline.duration, timeRef.current + dt);
      draw();
      if (now - lastUi > 100) {
        lastUi = now;
        setUiTime(timeRef.current);
      }
      if (timeRef.current >= timeline.duration) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, timeline.duration, draw]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (event.code === 'ArrowLeft') {
        timeRef.current = Math.max(0, timeRef.current - 5000);
        setUiTime(timeRef.current);
        draw();
      } else if (event.code === 'ArrowRight') {
        timeRef.current = Math.min(timeline.duration, timeRef.current + 5000);
        setUiTime(timeRef.current);
        draw();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draw, timeline.duration]);

  const seek = (value: number[]) => {
    timeRef.current = value[0];
    setUiTime(value[0]);
    draw();
  };

  const restart = () => {
    timeRef.current = 0;
    setUiTime(0);
    draw();
    setPlaying(true);
  };

  const meta = timeline.meta;
  const stats = timeline.stats ?? {
    finalScore: 0,
    finalLines: 0,
    finalLevel: 1,
    duration: timeline.duration,
    pps: 0,
    apm: 0,
    lockCount: 0,
    keyframeCount: 0,
  };
  const frameState = stateRef.current;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="text-lg font-semibold">
                {meta?.username || 'Player'} · {meta?.gameMode || 'replay'}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(meta?.recordedAt || Date.now()).toLocaleString()} ·{' '}
                {timeline.eventCounters.locks} locks · {timeline.eventCounters.keyframes} keyframes
              </div>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-mono text-xl">{formatTime(uiTime)} / {formatTime(timeline.duration)}</div>
            <div className="text-xs text-muted-foreground">{playing ? 'playing' : 'paused'}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[auto_1fr_auto]">
          <Card className="p-3 space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Hold</div>
            <PiecePreview type={frameState?.hold ?? null} />
            <div className="text-xs uppercase tracking-wide text-muted-foreground pt-2">Score</div>
            <div className="font-mono text-2xl">{frameState?.score ?? 0}</div>
            <div className="text-xs text-muted-foreground">Lines</div>
            <div className="font-mono text-lg">{frameState?.lines ?? 0}</div>
            <div className="text-xs text-muted-foreground">Level</div>
            <div className="font-mono text-lg">{frameState?.level ?? 1}</div>
          </Card>

          <div className="flex flex-col gap-3">
            <div className="relative w-full rounded-xl border border-border bg-slate-950/60 p-2">
              <canvas ref={canvasRef} className="h-[62vh] max-h-[640px] w-full" />
            </div>
            <div className="flex items-center gap-3">
              <Button size="icon" onClick={() => setPlaying((value) => !value)} aria-label="play">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={restart} aria-label="restart">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Slider
                className="flex-1"
                min={0}
                max={timeline.duration}
                step={50}
                value={[uiTime]}
                onValueChange={seek}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
              >
                <Gauge className="mr-1 h-4 w-4" />
                {speed}x
              </Button>
            </div>
          </div>

          <Card className="p-3 space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Next</div>
            <div className="flex flex-col gap-2">
              {(frameState?.next ?? []).slice(0, 5).map((type, index) => (
                <PiecePreview key={`${type}-${index}`} type={type} />
              ))}
            </div>
            <div className="border-t border-border pt-3 text-xs text-muted-foreground space-y-1">
              <div>Final score <span className="font-mono text-foreground">{stats.finalScore}</span></div>
              <div>Final lines <span className="font-mono text-foreground">{stats.finalLines}</span></div>
              <div>PPS <span className="font-mono text-foreground">{Number(stats.pps || 0).toFixed(2)}</span></div>
              <div>APM <span className="font-mono text-foreground">{Number(stats.apm || 0).toFixed(1)}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PiecePreview({ type }: { type: string | null }) {
  if (!type) {
    return <div className="h-14 w-20 rounded-md border border-dashed border-border" />;
  }
  const shape = getPieceShape(type, 0);
  const color = PIECE_COLORS[type] ?? '#e2e8f0';
  const rows = shape.length;
  const cols = shape.reduce((max, row) => Math.max(max, row.length), 0);
  return (
    <div
      className="grid h-14 w-20 place-content-center gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${cols}, 10px)` }}
    >
      {Array.from({ length: rows * cols }).map((_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const filled = Boolean(shape[row]?.[col]);
        return (
          <span
            key={index}
            className="h-[10px] w-[10px] rounded-[2px]"
            style={{ backgroundColor: filled ? color : 'transparent' }}
          />
        );
      })}
    </div>
  );
}
