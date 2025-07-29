
// 垃圾行系统 - 实现完整的垃圾行规则
export interface GarbageLine {
  cells: number[];
  holePosition: number;
}

export interface AttackData {
  lines: number;
  source: 'single' | 'double' | 'triple' | 'tetris' | 'tspin' | 'combo';
  isTSpin: boolean;
  isB2B: boolean;
  combo: number;
}

// 计算攻击行数 - 基于标准俄罗斯方块规则
export const calculateAttack = (
  linesCleared: number,
  isTSpin: boolean = false,
  isB2B: boolean = false,
  combo: number = 0
): number => {
  let attack = 0;
  
  // 基础攻击力
  if (isTSpin) {
    switch (linesCleared) {
      case 1: attack = 2; break; // T-Spin Single
      case 2: attack = 4; break; // T-Spin Double  
      case 3: attack = 6; break; // T-Spin Triple
    }
  } else {
    switch (linesCleared) {
      case 1: attack = 0; break; // Single - 无攻击
      case 2: attack = 1; break; // Double
      case 3: attack = 2; break; // Triple
      case 4: attack = 4; break; // Tetris
    }
  }
  
  // Back-to-Back 加成
  if (isB2B && (attack > 0)) {
    attack += 1;
  }
  
  // 连击加成
  if (combo > 0) {
    const comboAttack = Math.floor(combo / 2); // 每2连击增加1攻击
    attack += comboAttack;
  }
  
  return Math.max(0, attack);
};

// 生成垃圾行 - 实现标准的垃圾行生成规则
export const generateGarbageLines = (attackLines: number, seed?: number): GarbageLine[] => {
  const garbageLines: GarbageLine[] = [];
  
  if (attackLines <= 0) return garbageLines;
  
  // 对于连续发送的垃圾行，洞口位置应该一致或有特定规律
  let baseHolePosition = seed !== undefined 
    ? seed % 10 
    : Math.floor(Math.random() * 10);
  
  for (let i = 0; i < attackLines; i++) {
    let holePosition = baseHolePosition;
    
    // 如果是大量垃圾行（8行以上），保持相同洞口
    // 如果是少量垃圾行，可以有轻微变化
    if (attackLines < 4 && Math.random() < 0.3) {
      holePosition = Math.floor(Math.random() * 10);
    }
    
    const garbageLine: number[] = Array(10).fill(8); // 8 = 垃圾块
    garbageLine[holePosition] = 0; // 留洞
    
    garbageLines.push({
      cells: garbageLine,
      holePosition
    });
  }
  
  return garbageLines;
};

// 添加垃圾行到游戏板
export const addGarbageToBoard = (
  board: number[][],
  garbageLines: GarbageLine[]
): { newBoard: number[][]; linesAdded: number } => {
  if (garbageLines.length === 0) {
    return { newBoard: board, linesAdded: 0 };
  }
  
  const boardHeight = board.length;
  const linesToRemove = Math.min(garbageLines.length, boardHeight);
  
  // 移除顶部的行
  const newBoard = board.slice(linesToRemove);
  
  // 在底部添加垃圾行
  const garbageToAdd = garbageLines.slice(0, linesToRemove);
  garbageToAdd.forEach(garbageLine => {
    newBoard.push([...garbageLine.cells]);
  });
  
  return {
    newBoard,
    linesAdded: linesToRemove
  };
};

// 检查垃圾行是否可以被消除
export const canClearGarbageLines = (board: number[][], row: number): boolean => {
  if (row < 0 || row >= board.length) return false;
  
  // 检查这一行是否都被填满（包括垃圾块）
  return board[row].every(cell => cell !== 0);
};

// 计算垃圾行防御（消除垃圾行可以抵消部分攻击）
export const calculateGarbageDefense = (
  linesCleared: number,
  garbageLinesInCleared: number
): number => {
  // 每消除一行包含垃圾块的行可以抵消一定攻击
  return Math.min(linesCleared, garbageLinesInCleared);
};

// 垃圾行动画数据
export interface GarbageAnimation {
  type: 'rise' | 'clear';
  startTime: number;
  duration: number;
  lines: number[];
}

// 创建垃圾行上升动画
export const createGarbageRiseAnimation = (lineCount: number): GarbageAnimation => {
  return {
    type: 'rise',
    startTime: Date.now(),
    duration: 300, // 300ms 动画
    lines: Array.from({ length: lineCount }, (_, i) => 20 - lineCount + i)
  };
};

// 垃圾行队列管理
export class GarbageQueue {
  private queue: GarbageLine[] = [];
  private pendingAttack: number = 0;
  
  // 添加攻击到队列
  addAttack(attackData: AttackData): void {
    const attackLines = calculateAttack(
      attackData.lines,
      attackData.isTSpin,
      attackData.isB2B,
      attackData.combo
    );
    
    if (attackLines > 0) {
      const garbageLines = generateGarbageLines(attackLines);
      this.queue.push(...garbageLines);
      this.pendingAttack += attackLines;
    }
  }
  
  // 获取下一批垃圾行
  getNextGarbageBatch(maxLines: number = 4): GarbageLine[] {
    const batch = this.queue.splice(0, Math.min(maxLines, this.queue.length));
    this.pendingAttack = Math.max(0, this.pendingAttack - batch.length);
    return batch;
  }
  
  // 获取队列中的垃圾行数
  getPendingCount(): number {
    return this.queue.length;
  }
  
  // 清空队列
  clear(): void {
    this.queue = [];
    this.pendingAttack = 0;
  }
  
  // 抵消攻击（通过消除垃圾行）
  defendAttack(defenseLines: number): number {
    const actualDefense = Math.min(defenseLines, this.queue.length);
    this.queue.splice(0, actualDefense);
    this.pendingAttack = Math.max(0, this.pendingAttack - actualDefense);
    return actualDefense;
  }
}

// 垃圾行渲染工具
export const getGarbageBlockColor = (): string => {
  return '#666666'; // 灰色垃圾块
};

export const isGarbageBlock = (cellValue: number): boolean => {
  return cellValue === 8;
};
