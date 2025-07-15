
// Scoring constants
const LINE_CLEAR_SCORES = {
  1: 100,  // Single
  2: 300,  // Double
  3: 500,  // Triple
  4: 800   // Tetris
};

const TSPIN_SCORES = {
  single: 800,
  double: 1200,
  triple: 1600,
  mini_single: 200,
  mini_double: 400
};

// Calculate score based on lines cleared and various modifiers
export const calculateScore = (
  linesCleared: number,
  level: number,
  tSpinResult: { type: string; isMini: boolean } | null = null,
  isB2B: boolean = false,
  combo: number = -1,
  isPerfectClear: boolean = false
): number => {
  if (linesCleared === 0) return 0;

  let baseScore = 0;

  // T-Spin scoring
  if (tSpinResult) {
    const tSpinType = `${tSpinResult.isMini ? 'mini_' : ''}${
      linesCleared === 1 ? 'single' : 
      linesCleared === 2 ? 'double' : 'triple'
    }`;
    baseScore = TSPIN_SCORES[tSpinType as keyof typeof TSPIN_SCORES] || 0;
  } else {
    // Regular line clear scoring
    baseScore = LINE_CLEAR_SCORES[linesCleared as keyof typeof LINE_CLEAR_SCORES] || 0;
  }

  // Level multiplier
  baseScore *= level;

  // B2B bonus (50% more points)
  if (isB2B && (tSpinResult || linesCleared === 4)) {
    baseScore = Math.floor(baseScore * 1.5);
  }

  // Combo bonus
  if (combo >= 0) {
    baseScore += combo * 50 * level;
  }

  // Perfect Clear bonus
  if (isPerfectClear) {
    baseScore += 3500;
  }

  return baseScore;
};

// Calculate attack lines sent to opponent
export const calculateAttackLines = (
  linesCleared: number,
  tSpinResult: { type: string; isMini: boolean } | null = null,
  isB2B: boolean = false,
  combo: number = -1
): number => {
  if (linesCleared === 0) return 0;

  let attackLines = 0;

  // Base attack for T-Spins
  if (tSpinResult) {
    if (tSpinResult.isMini) {
      attackLines = linesCleared === 1 ? 0 : linesCleared === 2 ? 1 : 0;
    } else {
      attackLines = linesCleared === 1 ? 2 : linesCleared === 2 ? 4 : linesCleared === 3 ? 6 : 0;
    }
  } else {
    // Regular line clear attack
    switch (linesCleared) {
      case 1: attackLines = 0; break;
      case 2: attackLines = 1; break;
      case 3: attackLines = 2; break;
      case 4: attackLines = 4; break;
    }
  }

  // B2B bonus
  if (isB2B && attackLines > 0) {
    attackLines += 1;
  }

  // Combo bonus
  if (combo >= 0) {
    attackLines += Math.floor(combo / 2);
  }

  return attackLines;
};

// Calculate level based on lines cleared
export const calculateLevel = (lines: number): number => {
  return Math.floor(lines / 10) + 1;
};
