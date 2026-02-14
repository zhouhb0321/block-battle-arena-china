import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Settings, FastForward, Rewind, SkipForward, SkipBack, Info, Zap, Target, Flame } from 'lucide-react';
import { useMusicContext } from '@/contexts/MusicContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { V4ReplayData, ReplayOpcode, V4FrameEvent } from '@/utils/replayV4/types';
import { extractReplayMetadata, extractLockEvents, extractKeyframeEvents } from '@/utils/replayV4/converter';
import { extractKeyMoments, calculateReplayStats } from '@/utils/replayV4/eventExtractor';
import { ReplayAnalytics } from './ReplayAnalytics';
import { useGameRecording } from '@/contexts/GameRecordingContext';
import { buildStateTimeline, getStateAtTime, getFramesBetween } from '@/utils/replayV4/stateReconstructor';
import { getPieceShape, PIECE_TYPE_TO_ID } from '@/utils/tetrominoShapes';
import { getCurrentSkin, getColorByTypeId, isGarbageBlock, GARBAGE_COLOR } from '@/utils/blockSkins';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useTheme } from '@/contexts/ThemeContext';

interface ReplayPlayerV4UnifiedProps {
  replay: V4ReplayData;
  onClose: () => void;
  autoPlay?: boolean;
}

export const ReplayPlayerV4Unified: React.FC<ReplayPlayerV4UnifiedProps> = ({
  replay,
  onClose,
  autoPlay = false
}) => {
  const gameRecording = useGameRecording();
  const { settings } = useUserSettings();
  const { actualTheme } = useTheme();
  const currentSkin = getCurrentSkin(settings.blockSkin || 'wood');
  
  // Pre-compute state timeline (the core of the new architecture)
  const stateTimeline = useMemo(() => buildStateTimeline(replay), [replay]);
  
  const metadata = useMemo(() => extractReplayMetadata(replay), [replay]);
  const lockEvents = useMemo(() => extractLockEvents(replay), [replay]);
  const keyframes = useMemo(() => extractKeyframeEvents(replay), [replay]);
  const keyMoments = useMemo(() => extractKeyMoments(replay), [replay]);
  const replayStats = useMemo(() => calculateReplayStats(replay), [replay]);
  
  // All FRAME events for smooth piece animation
  const frameEvents = useMemo(() => 
    replay.events
      .filter(e => e.type === ReplayOpcode.FRAME)
      .map(e => e as V4FrameEvent),
    [replay]
  );
  
  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  
  const lastFrameTimeRef = useRef<number | null>(null);
  
  // Music
  const { requestPlayback, releasePlayback } = useMusicContext();
  
  useEffect(() => {
    requestPlayback('replay', {
      id: 'replay-music',
      url: '/music/WotLK_main_title.mp3',
      title: 'Replay Music'
    });
    return () => { releasePlayback('replay'); };
  }, [requestPlayback, releasePlayback]);
  
  // Mark as replaying to prevent session timeout
  useEffect(() => {
    gameRecording.setReplaying(true);
    return () => { gameRecording.setReplaying(false); };
  }, [gameRecording]);
  
  // Get current game state from timeline
  const currentState = useMemo(() => getStateAtTime(stateTimeline, currentTime), [stateTimeline, currentTime]);
  
  // Get current animated piece position from FRAME events
  const animatedPiece = useMemo(() => {
    if (!frameEvents.length) return currentState.currentPiece;
    
    // Find the most recent frame at or before currentTime
    let best: V4FrameEvent | null = null;
    for (let i = frameEvents.length - 1; i >= 0; i--) {
      if (frameEvents[i].timestamp <= currentTime) {
        best = frameEvents[i];
        break;
      }
    }
    
    // Only use frame data if it's between the current state and the next state
    if (best && best.timestamp >= currentState.timestamp) {
      return {
        type: best.pieceType,
        x: best.x,
        y: best.y,
        rotation: best.rotation
      };
    }
    
    return currentState.currentPiece;
  }, [frameEvents, currentTime, currentState]);
  
  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;
      return;
    }
    
    let animationFrameId: number;
    const totalDuration = replay.stats.duration;
    
    const tick = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }
      
      const deltaMs = (timestamp - lastFrameTimeRef.current) * playbackSpeed;
      lastFrameTimeRef.current = timestamp;
      
      setCurrentTime(prev => {
        const newTime = prev + deltaMs;
        if (newTime >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return newTime;
      });
      
      animationFrameId = requestAnimationFrame(tick);
    };
    
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, replay.stats.duration]);
  
  // Controls
  const handlePlayPause = useCallback(() => setIsPlaying(prev => !prev), []);
  
  const handleReset = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    lastFrameTimeRef.current = null;
  }, []);
  
  const handleSeek = useCallback((newTime: number) => {
    setCurrentTime(newTime);
    lastFrameTimeRef.current = null;
  }, []);
  
  const totalDuration = replay.stats.duration;
  
  const handleSkipForward = useCallback((seconds: number) => {
    setCurrentTime(prev => Math.min(prev + seconds * 1000, totalDuration));
    lastFrameTimeRef.current = null;
  }, [totalDuration]);
  
  const handleSkipBackward = useCallback((seconds: number) => {
    setCurrentTime(prev => Math.max(prev - seconds * 1000, 0));
    lastFrameTimeRef.current = null;
  }, []);
  
  const jumpToNextMoment = useCallback(() => {
    const next = keyMoments.find(m => m.timestamp > currentTime);
    if (next) handleSeek(next.timestamp);
  }, [keyMoments, currentTime, handleSeek]);
  
  const jumpToPreviousMoment = useCallback(() => {
    const prev = keyMoments.filter(m => m.timestamp < currentTime);
    if (prev.length > 0) handleSeek(prev[prev.length - 1].timestamp);
  }, [keyMoments, currentTime, handleSeek]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case ' ': e.preventDefault(); handlePlayPause(); break;
        case 'ArrowLeft': e.preventDefault(); handleSkipBackward(5); break;
        case 'ArrowRight': e.preventDefault(); handleSkipForward(5); break;
        case 'n': jumpToNextMoment(); break;
        case 'p': jumpToPreviousMoment(); break;
        case '[': e.preventDefault(); setPlaybackSpeed(prev => Math.max(0.25, prev - 0.25)); break;
        case ']': e.preventDefault(); setPlaybackSpeed(prev => Math.min(4, prev + 0.25)); break;
        case 'Home': e.preventDefault(); handleReset(); break;
        case 'End': e.preventDefault(); handleSeek(totalDuration); break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePlayPause, handleSkipForward, handleSkipBackward, jumpToNextMoment, jumpToPreviousMoment, handleReset, handleSeek, totalDuration]);
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const milliseconds = Math.floor(ms % 1000);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };
  
  // Build display board with animated piece overlay
  const displayBoard = useMemo(() => {
    const board = currentState.board.map(row => [...row]);
    
    // Overlay the current piece
    const piece = animatedPiece;
    if (piece) {
      const shape = getPieceShape(piece.type, piece.rotation);
      const typeId = PIECE_TYPE_TO_ID[piece.type] || 1;
      
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] !== 0) {
            const boardY = piece.y + row;
            const boardX = piece.x + col;
            if (boardY >= 0 && boardY < board.length && boardX >= 0 && boardX < 10) {
              if (board[boardY][boardX] === 0) {
                board[boardY][boardX] = typeId;
              }
            }
          }
        }
      }
    }
    
    return board;
  }, [currentState.board, animatedPiece]);
  
  // Render a simple piece preview
  const renderPiecePreview = (pieceType: string, size: number = 16) => {
    const shape = getPieceShape(pieceType, 0);
    const typeId = PIECE_TYPE_TO_ID[pieceType] || 1;
    const color = getColorByTypeId(typeId);
    
    return (
      <div className="inline-grid gap-px" style={{
        gridTemplateColumns: `repeat(${shape[0]?.length || 3}, ${size}px)`,
        gridTemplateRows: `repeat(${shape.length}, ${size}px)`
      }}>
        {shape.map((row, ri) => 
          row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              style={{
                width: size,
                height: size,
                backgroundColor: cell ? color : 'transparent',
                borderRadius: cell ? '2px' : '0',
                border: cell ? `1px solid rgba(255,255,255,0.2)` : 'none'
              }}
            />
          ))
        )}
      </div>
    );
  };
  
  const cellSize = 24;
  const visibleRows = 20;
  const hiddenRows = 3;
  
  const getCellStyle = (cellValue: number, isHidden: boolean) => {
    if (cellValue === 0) {
      if (isHidden) return { backgroundColor: 'transparent', border: 'none' };
      return {
        backgroundColor: 'transparent',
        border: actualTheme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.08)'
      };
    }
    
    if (isGarbageBlock(cellValue)) {
      return {
        backgroundColor: GARBAGE_COLOR,
        border: `1px solid ${GARBAGE_COLOR}`,
        opacity: isHidden ? 0.3 : 1
      };
    }
    
    const color = getColorByTypeId(cellValue);
    const style = currentSkin.getBlockStyle(color, false);
    if (isHidden) style.opacity = 0.3;
    return style;
  };
  
  const getPanelThemeClasses = () => 'bg-background/40 border-border/60 backdrop-blur-sm';
  
  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      {/* Close button - floating top-right */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setShowDetails(!showDetails)} className="text-foreground/70 hover:text-foreground">
          <Settings className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-foreground/70 hover:text-foreground">
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Main layout matching SinglePlayerGameArea */}
      <div className="flex justify-center items-start p-4 gap-4">
        {/* Left panel: Hold + Stats (mirrors SinglePlayerGameArea) */}
        <div className="w-48 flex flex-col gap-4">
          {/* Hold piece */}
          <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
            <div className="text-sm font-bold mb-2 text-center">HOLD</div>
            <div className="flex items-center justify-center min-h-[60px]">
              {currentState.holdPiece ? renderPiecePreview(currentState.holdPiece, 18) : (
                <span className="text-xs text-muted-foreground">Empty</span>
              )}
            </div>
          </div>
          
          {/* Stats panel */}
          <div className={`p-4 rounded-lg border ${getPanelThemeClasses()}`}>
            <div className="space-y-3">
              <div className="text-center border-b border-border/40 pb-2 mb-3">
                <div className="font-bold text-lg">{metadata.username}</div>
                <div className="text-xs text-muted-foreground">{metadata.gameMode}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Score:</div>
                <div className="font-mono text-right">{currentState.score.toLocaleString()}</div>
                <div>Lines:</div>
                <div className="font-mono text-right">{currentState.lines}</div>
                <div>Level:</div>
                <div className="font-mono text-right">{currentState.level}</div>
                <div>PPS:</div>
                <div className="font-mono text-right">{replayStats.pps}</div>
                <div>APM:</div>
                <div className="font-mono text-right">{replay.stats?.apm?.toFixed(1) || '0.0'}</div>
                <div>Time:</div>
                <div className="font-mono text-right">{formatTime(currentTime)}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Center: Game board */}
        <div className="relative">
          <div className="p-4 rounded-lg border bg-transparent">
            <div 
              className="relative"
              style={{
                width: cellSize * 10,
                height: cellSize * visibleRows,
                display: 'grid',
                gridTemplateColumns: `repeat(10, ${cellSize}px)`,
                gridTemplateRows: `repeat(${visibleRows}, ${cellSize}px)`,
                border: '2px solid hsl(var(--muted-foreground) / 0.3)',
              }}
            >
              {displayBoard.slice(hiddenRows, hiddenRows + visibleRows).map((row, rowIdx) => 
                row.map((cellValue, colIdx) => {
                  const style = getCellStyle(cellValue, false);
                  const cellClass = cellValue !== 0 ? currentSkin.getBlockClass(getColorByTypeId(cellValue), false) : '';
                  
                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      className={cellClass}
                      style={{
                        ...style,
                        width: cellSize,
                        height: cellSize,
                        boxSizing: 'border-box',
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        {/* Right panel: Next pieces (mirrors SinglePlayerGameArea) */}
        <div className="w-48">
          <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
            <h3 className="text-sm font-bold mb-3 text-center">NEXT</h3>
            <div className="space-y-3">
              {currentState.nextPieces.slice(0, 5).map((piece, idx) => (
                <div key={idx} className={`flex justify-center p-2 ${idx === 0 ? 'bg-background/20 backdrop-blur-sm rounded' : ''}`}>
                  {renderPiecePreview(piece, 18)}
                </div>
              ))}
              {currentState.nextPieces.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">No next pieces</div>
              )}
            </div>
          </div>
          
          {/* Key moments (compact) */}
          {keyMoments.length > 0 && (
            <div className={`p-3 rounded-lg border mt-4 ${getPanelThemeClasses()}`}>
              <div className="text-sm font-bold mb-2 text-center">Key Moments</div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {keyMoments.slice(0, 8).map((moment, idx) => {
                  const Icon = moment.type === 'tetris' ? Zap : 
                               moment.type === 'tspin' ? Target : 
                               moment.type === 'combo' ? Flame : null;
                  return (
                    <Button
                      key={idx}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-1 h-7 text-xs"
                      onClick={() => handleSeek(moment.timestamp)}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      <span className="flex-1 text-left truncate">{moment.label}</span>
                      <span className="opacity-50">{formatTime(moment.timestamp)}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Floating playback controls bar at bottom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
        <Card className="p-4 space-y-3 bg-card/90 backdrop-blur-md border-border">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
            <div className="relative">
              <Slider
                value={[currentTime]}
                max={totalDuration}
                step={16}
                onValueChange={(value) => handleSeek(value[0])}
                className="w-full"
              />
              {/* Key moment markers */}
              <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
                {keyMoments.map((moment, idx) => {
                  const position = (moment.timestamp / totalDuration) * 100;
                  return (
                    <div key={idx} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                      style={{ left: `${position}%` }} title={moment.label} />
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Controls row */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleReset} title="Reset">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSkipBackward(10)} title="-10s">
              <Rewind className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={jumpToPreviousMoment} title="Prev moment">
              <SkipBack className="w-3.5 h-3.5" />
            </Button>
            <Button size="default" onClick={handlePlayPause} title="Play/Pause" className="h-10 w-10 rounded-full">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={jumpToNextMoment} title="Next moment">
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSkipForward(10)} title="+10s">
              <FastForward className="w-3.5 h-3.5" />
            </Button>
            
            {/* Speed buttons inline */}
            <div className="ml-4 flex items-center gap-1">
              {[0.5, 1, 2, 4].map(speed => (
                <Button
                  key={speed}
                  variant={playbackSpeed === speed ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setPlaybackSpeed(speed)}
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>
      
      {/* Technical details overlay */}
      {showDetails && (
        <div className="absolute top-16 right-4 z-10">
          <Card className="p-4 bg-card/95 backdrop-blur-md text-xs space-y-2 w-64">
            <div className="font-semibold">Technical Info</div>
            <div className="text-muted-foreground space-y-1">
              <div>Seed: {metadata.seed.slice(0, 16)}...</div>
              <div>Duration: {formatTime(replay.stats.duration)}</div>
              <div>Lock events: {lockEvents.length}</div>
              <div>Keyframes: {keyframes.length}</div>
              <div>Frame samples: {frameEvents.length}</div>
              <div>State timeline: {stateTimeline.length} states</div>
              <div>PPS: {replayStats.pps} | Tetris: {replayStats.tetrisCount}</div>
              <div>T-Spin: {replayStats.tspinCount} | Combo: {replayStats.maxCombo}</div>
              <div>DAS: {metadata.settings.das}ms / ARR: {metadata.settings.arr}ms</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReplayPlayerV4Unified;
