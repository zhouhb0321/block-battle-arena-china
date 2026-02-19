
# Add TETR.IO Block Skin Option

## Overview
Add a new `tetrio` skin entry to the `BLOCK_SKINS` array in `src/utils/blockSkins.ts`. This skin closely mimics TETR.IO's signature look: a bright inner rectangle inset within a darker outer border, creating a distinctive "screen pixel" effect. Ghost pieces will be thin colored outlines (TETR.IO style), and the overall feel will be clean and modern.

## What Changes

**File: `src/utils/blockSkins.ts`**

Insert a new skin object (after the existing `wood` entry, as item #2) with `id: 'tetrio'`:

- **Name**: "TETR.IO 风格" 
- **Description**: "高度还原 TETR.IO 的方块视觉风格"
- **Block style**: 
  - Outer: 1px solid dark border
  - Inner: bright center highlight using a layered `inset box-shadow` -- a large bright inset surrounded by a thin darker ring, creating the characteristic TETR.IO "glowing center" look
  - No border-radius (sharp corners, true to TETR.IO)
- **Ghost style**: thin 1px solid outline of the piece color at ~30% opacity, transparent fill (TETR.IO ghosts are faint colored outlines, not gray dashed)
- **CSS class**: `tetrio-block` / `tetrio-ghost-block`

No other files need changes -- the skin system is already pluggable and `BlockSkinSelector` / `BlockSkinTab` automatically enumerate `BLOCK_SKINS`.

## Technical Detail

```typescript
{
  id: 'tetrio',
  name: 'TETR.IO 风格',
  description: '高度还原 TETR.IO 的方块视觉风格',
  getBlockStyle: (color, isGhost = false) => {
    if (isGhost) {
      return {
        backgroundColor: 'transparent',
        border: `1px solid ${color}50`,
        borderRadius: '0px',
        opacity: 0.4,
      };
    }
    const lighter = adjustBrightness(color, 60);
    const darker = adjustBrightness(color, -70);
    return {
      backgroundColor: color,
      border: `1px solid ${darker}`,
      borderRadius: '0px',
      boxShadow: `inset 0 0 0 1px ${darker}, inset 0 0 0 2px ${lighter}`,
    };
  },
  getBlockClass: (_, isGhost = false) =>
    isGhost ? 'tetrio-ghost-block' : 'tetrio-block',
}
```

This produces the TETR.IO look: a dark 1px outer edge, then a bright inner ring, then the base color fill -- all with sharp 0px radius corners.
