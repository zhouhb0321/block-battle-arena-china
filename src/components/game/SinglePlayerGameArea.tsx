
import React from 'react';
import { Button } from '@/components/ui/button';
import EnhancedGameBoard from '../EnhancedGameBoard';
import GameInfo from '../GameInfo';
import PiecePreview from '../PiecePreview';
import GameOverlay from '../GameOverlay';
import GameStatusIndicators from '../GameStatusIndicators';
import GameCountdownInArea from '../GameCountdownInArea';
import AdSpace from '../AdSpace';
import MobileControls from '../MobileControls';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import type { GameState, GameSettings } from '@/utils/gameTypes';

interface SinglePlayerGameAreaProps {
  gameState: GameState;
  gameSettings: GameSettings;
  username: string;
  onPause: () => void;
  onShare: () => void;
  onReset: () => void;
  onBackToMenu: () => void;
  showCountdown?: boolean;
  onCountdownEnd?: () => void;
  gameStarted?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onSoftDrop?: () => void;
  onHardDrop?: () => void;
  onRotateClockwise?: () => void;
  onRotateCounterclockwise?: () => void;
  onRotate180?: () => void;
  onHold?: () => void;
}

const SinglePlayerGameArea: React.FC<SinglePlayerGameAreaProps> = ({
  gameState,
  gameSettings,
  username,
  onPause,
  onShare,
  onReset,
  onBackToMenu,
  showCountdown = false,
  onCountdownEnd = () => {},
  gameStarted: propGameStarted = false,
  onMoveLeft = () => {},
  onMoveRight = () => {},
  onSoftDrop = () => {},
  onHardDrop = () => {},
  onRotateClockwise = () => {},
  onRotateCounterclockwise = () => {},
  onRotate180 = () => {},
  onHold = () => {}
}) => {
  const mainCellSize = 30;
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  
  // 判断游戏是否已开始 - 基于当前方块存在与否
  const gameStarted = propGameStarted || (!showCountdown && gameState.currentPiece !== null);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-900">
        {/* 移动端游戏区域 */}
        <div className="flex-1 flex items-center justify-center p-2">
          <div className="flex gap-2 items-start max-w-full">
            {/* HOLD 区域 - 左侧 */}
            <div className="game-panel-light p-2 rounded">
              <PiecePreview 
                piece={gameState.holdPiece?.type || null} 
                title="HOLD" 
                cellSize={20}
              />
            </div>

            {/* 主游戏区域 */}
            <div className="game-board-light p-3 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-700 relative">
              <GameInfo
                username={username}
                score={gameState.score}
                lines={gameState.lines}
                level={gameState.level}
                pieces={gameState.pieces || 0}
                pps={gameState.pps || 0}
                attack={gameState.apm || 0}
                paused={gameState.paused}
                onPause={gameStarted ? onPause : undefined}
                onShare={onShare}
                mode="single"
                combo={gameState.combo && gameState.combo >= 0 ? gameState.combo : undefined}
                gameStarted={gameStarted}
              />
              
              <div className="relative">
                <EnhancedGameBoard
                  board={gameState.board}
                  currentPiece={gameState.currentPiece}
                  ghostPiece={gameState.ghostPiece}
                  enableGhost={gameSettings.enableGhost}
                  cellSize={25}
                  clearingLines={gameState.clearingLines}
                  showHiddenRows={true}
                />
                {/* 只在堆叠区显示倒计时 */}
                <GameCountdownInArea show={showCountdown} onCountdownEnd={onCountdownEnd} />
                <GameOverlay
                  paused={gameState.paused}
                  gameOver={gameState.gameOver}
                  score={gameState.score}
                  lines={gameState.lines}
                  totalAttack={gameState.attack || 0}
                  pps={gameState.pps || 0}
                  apm={gameState.apm || 0}
                  onReset={onReset}
                  onBackToMenu={onBackToMenu}
                />
              </div>
            </div>

            {/* NEXT 区域 - 右侧 */}
            <div className="game-panel-light p-2 rounded">
              <h3 className="text-foreground text-xs mb-2 text-center font-bold">NEXT</h3>
              <div className="space-y-1">
                {gameState.nextPieces.slice(0, 3).map((piece, index) => (
                  <PiecePreview 
                    key={index} 
                    piece={piece.type} 
                    title=""
                    cellSize={20}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 移动端控制按钮 */}
        <MobileControls
          onMoveLeft={onMoveLeft}
          onMoveRight={onMoveRight}
          onSoftDrop={onSoftDrop}
          onHardDrop={onHardDrop}
          onRotateClockwise={onRotateClockwise}
          onRotateCounterclockwise={onRotateCounterclockwise}
          onRotate180={onRotate180}
          onHold={onHold}
          onPause={onPause}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-center justify-center w-full min-h-screen bg-background">
      {/* 左侧广告位 */}
      <div className="hidden xl:block">
        <AdSpace position="left" width={240} height={600} />
      </div>

      <div className="flex gap-6 items-start">
        {/* 左侧HOLD面板 */}
        <div className="flex flex-col gap-4">
          <div className="game-panel-light p-4 rounded-lg shadow-lg">
            <PiecePreview 
              piece={gameState.holdPiece?.type || null} 
              title="HOLD" 
              cellSize={mainCellSize}
            />
          </div>
          
          <div className="game-panel-light p-3 rounded-lg shadow-lg">
            <GameStatusIndicators 
              combo={gameState.combo || -1}
              b2b={gameState.b2b || 0}
              totalAttack={gameState.attack || 0}
            />
          </div>

          <Button 
            onClick={onBackToMenu}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {t('common.back')}
          </Button>
        </div>

        {/* 主游戏区域 - 居中显示 */}
        <div className="game-board-light p-6 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-700 flex flex-col items-center">
          <GameInfo
            username={username}
            score={gameState.score}
            lines={gameState.lines}
            level={gameState.level}
            pieces={gameState.pieces || 0}
            pps={gameState.pps || 0}
            attack={gameState.apm || 0}
            paused={gameState.paused}
            onPause={gameStarted ? onPause : undefined}
            onShare={onShare}
            mode="single"
            combo={gameState.combo && gameState.combo >= 0 ? gameState.combo : undefined}
            gameStarted={gameStarted}
          />
          <div className="relative">
            <EnhancedGameBoard
              board={gameState.board}
              currentPiece={gameState.currentPiece}
              ghostPiece={gameState.ghostPiece}
              enableGhost={gameSettings.enableGhost}
              cellSize={mainCellSize}
              clearingLines={gameState.clearingLines}
              showHiddenRows={true}
            />
            {/* 只在堆叠区（含隐藏区）显示倒计时 */}
            <GameCountdownInArea show={showCountdown} onCountdownEnd={onCountdownEnd} />
            <GameOverlay
              paused={gameState.paused}
              gameOver={gameState.gameOver}
              score={gameState.score}
              lines={gameState.lines}
              totalAttack={gameState.attack || 0}
              pps={gameState.pps || 0}
              apm={gameState.apm || 0}
              onReset={onReset}
              onBackToMenu={onBackToMenu}
            />
          </div>
        </div>

        {/* 右侧NEXT面板 */}
        <div className="game-panel-light p-4 rounded-lg shadow-lg">
          <h3 className="text-foreground text-sm mb-3 text-center font-bold">NEXT</h3>
          <div className="space-y-3">
            {gameState.nextPieces.slice(0, 4).map((piece, index) => (
              <PiecePreview 
                key={index} 
                piece={piece.type} 
                title=""
                cellSize={mainCellSize}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="hidden xl:block">
        <AdSpace position="right" width={240} height={600} />
      </div>

      <AdSpace position="bottom" width={200} height={100} gameContext={true} />
    </div>
  );
};

export default SinglePlayerGameArea;
