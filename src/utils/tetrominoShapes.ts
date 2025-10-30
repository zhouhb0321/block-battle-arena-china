/**
 * Tetromino Shapes - All rotations for each piece
 * Used for replay playback and visual rendering
 */

export interface TetrominoShape {
  rotations: number[][][]; // 4 rotations, each is a 2D array
}

// I piece - Cyan
export const I_SHAPE: TetrominoShape = {
  rotations: [
    // 0° - Horizontal
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    // 90° - Vertical
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0]
    ],
    // 180° - Horizontal
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0]
    ],
    // 270° - Vertical
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0]
    ]
  ]
};

// O piece - Yellow (no rotation)
export const O_SHAPE: TetrominoShape = {
  rotations: [
    [
      [1, 1],
      [1, 1]
    ],
    [
      [1, 1],
      [1, 1]
    ],
    [
      [1, 1],
      [1, 1]
    ],
    [
      [1, 1],
      [1, 1]
    ]
  ]
};

// T piece - Purple
export const T_SHAPE: TetrominoShape = {
  rotations: [
    // 0° - T pointing up
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    // 90° - T pointing right
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0]
    ],
    // 180° - T pointing down
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0]
    ],
    // 270° - T pointing left
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0]
    ]
  ]
};

// S piece - Green
export const S_SHAPE: TetrominoShape = {
  rotations: [
    // 0° - Horizontal
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    // 90° - Vertical
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1]
    ],
    // 180° - Horizontal
    [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0]
    ],
    // 270° - Vertical
    [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0]
    ]
  ]
};

// Z piece - Red
export const Z_SHAPE: TetrominoShape = {
  rotations: [
    // 0° - Horizontal
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    // 90° - Vertical
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0]
    ],
    // 180° - Horizontal
    [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1]
    ],
    // 270° - Vertical
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0]
    ]
  ]
};

// J piece - Blue
export const J_SHAPE: TetrominoShape = {
  rotations: [
    // 0° - J pointing left
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    // 90° - J pointing up
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0]
    ],
    // 180° - J pointing right
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1]
    ],
    // 270° - J pointing down
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0]
    ]
  ]
};

// L piece - Orange
export const L_SHAPE: TetrominoShape = {
  rotations: [
    // 0° - L pointing right
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    // 90° - L pointing up
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1]
    ],
    // 180° - L pointing left
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0]
    ],
    // 270° - L pointing down
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0]
    ]
  ]
};

// Map piece type to shapes
export const TETROMINO_SHAPES: Record<string, TetrominoShape> = {
  'I': I_SHAPE,
  'O': O_SHAPE,
  'T': T_SHAPE,
  'S': S_SHAPE,
  'Z': Z_SHAPE,
  'J': J_SHAPE,
  'L': L_SHAPE
};

// Map piece type to numeric ID (for board storage)
export const PIECE_TYPE_TO_ID: Record<string, number> = {
  'I': 1,
  'O': 2,
  'T': 3,
  'S': 4,
  'Z': 5,
  'J': 6,
  'L': 7
};

// Reverse mapping: numeric ID to piece type
export const ID_TO_PIECE_TYPE: Record<number, string> = {
  1: 'I',
  2: 'O',
  3: 'T',
  4: 'S',
  5: 'Z',
  6: 'J',
  7: 'L'
};

/**
 * Get the shape of a piece at a specific rotation
 */
export function getPieceShape(pieceType: string, rotation: number): number[][] {
  const shape = TETROMINO_SHAPES[pieceType];
  if (!shape) {
    console.error(`[TetrominoShapes] Unknown piece type: ${pieceType}`);
    return [[0]];
  }
  
  const normalizedRotation = ((rotation % 4) + 4) % 4; // Ensure 0-3
  return shape.rotations[normalizedRotation];
}

/**
 * Convert piece type string to numeric ID
 */
export function pieceTypeToId(pieceType: string): number {
  return PIECE_TYPE_TO_ID[pieceType] || 0;
}

/**
 * Convert numeric ID to piece type string
 */
export function idToPieceType(id: number): string | null {
  return ID_TO_PIECE_TYPE[id] || null;
}
