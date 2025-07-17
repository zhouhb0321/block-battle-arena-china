
// Official Tetris colors (tetriswiki.cn standard)
export const BLOCK_COLORS = {
  'I': '#00ffff', // Cyan - I-piece
  'O': '#ffff00', // Yellow - O-piece  
  'T': '#800080', // Purple - T-piece
  'S': '#00ff00', // Green - S-piece
  'Z': '#ff0000', // Red - Z-piece
  'J': '#0000ff', // Blue - J-piece
  'L': '#ff8000', // Orange - L-piece
  'ghost': '#ffffff40', // Semi-transparent white for ghost pieces
  'empty': 'transparent'
} as const;

export type BlockType = keyof typeof BLOCK_COLORS;

/**
 * Get consistent color for a block type
 * This ensures all components use the same colors
 */
export const getBlockColor = (blockType: string | null): string => {
  if (!blockType) return BLOCK_COLORS.empty;
  
  // Normalize the block type (handle both uppercase and lowercase)
  const normalizedType = blockType.toUpperCase() as BlockType;
  
  return BLOCK_COLORS[normalizedType] || BLOCK_COLORS.empty;
};

/**
 * Get ghost piece color with custom opacity
 */
export const getGhostColor = (blockType: string | null, opacity: number = 0.3): string => {
  const baseColor = getBlockColor(blockType);
  if (baseColor === BLOCK_COLORS.empty) return BLOCK_COLORS.ghost;
  
  // Convert hex to rgba with opacity
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Check if a color is valid
 */
export const isValidBlockType = (blockType: string): blockType is BlockType => {
  return blockType.toUpperCase() in BLOCK_COLORS;
};

/**
 * Get all available block types
 */
export const getAllBlockTypes = (): BlockType[] => {
  return Object.keys(BLOCK_COLORS) as BlockType[];
};

/**
 * Generate CSS custom properties for block colors
 * Useful for theming and CSS variables
 */
export const generateBlockColorCSS = (): Record<string, string> => {
  const cssVars: Record<string, string> = {};
  
  Object.entries(BLOCK_COLORS).forEach(([type, color]) => {
    cssVars[`--block-${type.toLowerCase()}`] = color;
  });
  
  return cssVars;
};

console.log('Block colors initialized:', BLOCK_COLORS);
