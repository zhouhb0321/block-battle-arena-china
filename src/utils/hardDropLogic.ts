
import type { GamePiece } from './gameTypes';

export const calculateHardDropPosition = (
  piece: GamePiece,
  board: number[][]
): number => {
  let dropY = piece.y;
  
  while (dropY < 20) {
    // 检查下一行是否会发生碰撞
    let collision = false;
    const { shape } = piece.type;
    
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newY = dropY + row + 1;
          const newX = piece.x + col;
          
          // 检查边界和碰撞
          if (newY >= 20 || (newY >= 0 && board[newY][newX] !== 0)) {
            collision = true;
            break;
          }
        }
      }
      if (collision) break;
    }
    
    if (collision) {
      break;
    }
    
    dropY++;
  }
  
  return dropY;
};

export const performHardDrop = (
  piece: GamePiece,
  board: number[][],
  onPieceLocked: (newPiece: GamePiece) => void
): GamePiece => {
  const hardDropY = calculateHardDropPosition(piece, board);
  const droppedPiece = { ...piece, y: hardDropY };
  
  // 硬降后立即锁定方块
  setTimeout(() => {
    onPieceLocked(droppedPiece);
  }, 0);
  
  return droppedPiece;
};
