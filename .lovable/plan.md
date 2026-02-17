

# Plan: Fix Replay Duplication + TETR.IO-Style Block Visuals

## Issue 1: All Replays Show the Same Game

**Root Cause**: The `ReplayPreparationDialog` component does NOT reset its internal state (`replayData`, `loadingState`) when a new `replayId` is passed. When a user:
1. Opens replay A, clicks "Load", it loads successfully
2. Closes the dialog
3. Opens replay B -- the dialog still has replay A's data cached with `loadingState: 'success'`
4. Clicks "Play" -- sends replay A's data to the player

**Fix**: Add a `useEffect` in `ReplayPreparationDialog` that resets `replayData`, `loadingState`, and `loadProgress` whenever `replayId` changes.

```text
// In ReplayPreparationDialog.tsx
useEffect(() => {
  setReplayData(null);
  setLoadingState('idle');
  setLoadProgress(0);
  setErrorMessage('');
}, [replayId]);
```

## Issue 2: Block Visuals Lack 3D Depth

The reference image (TETR.IO) shows blocks with a distinctive "beveled" style:
- Each block has a **lighter inner square** creating a raised 3D effect
- The outer edge has a subtle **dark border** for contrast
- Ghost pieces use **dark semi-transparent outlines** (not colored)
- Garbage rows are a distinct **uniform gray** with clear grid lines
- Colors are **saturated but not harsh** -- good contrast against the dark board

### Changes to Default Block Style

**File: `src/utils/blockSkins.ts`**

Update the default `wood` skin to use a TETR.IO-inspired beveled style as the new default. The key visual effect is:
- Main color fill
- `inset` box-shadow with lighter top-left and darker bottom-right edges
- Small inner highlight rectangle (via CSS pseudo-element or inset shadow)
- No wood grain texture -- clean, modern look

**File: `src/utils/blockColors.ts`**

Increase color saturation slightly. The current colors are too desaturated (`#5A8A8A` etc.) making blocks hard to distinguish. Update to moderately saturated colors that match the reference:
- I: `#00B8B8` (teal/cyan)
- O: `#B8B800` (yellow)
- T: `#8800AA` (purple)
- S: `#00B800` (green)
- Z: `#B80000` (red)
- J: `#0044B8` (blue)
- L: `#B86600` (orange)

Also update `blockSkins.ts` `getColorByTypeId` to match.

**File: `src/components/EnhancedGameBoard.tsx`**

Update ghost piece rendering to use dark outlines (matching reference) instead of colored transparent fills. Update garbage block rendering to use a distinctive checkerboard/grid gray pattern.

**File: `src/components/WoodTextureCell.tsx`**

Simplify the placed-piece rendering: remove the multiple overlay divs (wood-grain, shimmer) and replace with a clean beveled CSS-only style using `box-shadow: inset`.

## Files Changed

| File | Change |
|------|--------|
| `src/components/ReplayPreparationDialog.tsx` | Add `useEffect` to reset state when `replayId` changes |
| `src/utils/blockColors.ts` | Increase color saturation for better visibility |
| `src/utils/blockSkins.ts` | Redesign default skin to TETR.IO-style beveled blocks; update `getColorByTypeId` to match new colors |
| `src/components/EnhancedGameBoard.tsx` | Update ghost piece style (dark outlines), garbage block style (distinct gray grid) |
| `src/components/WoodTextureCell.tsx` | Simplify to clean beveled style, remove wood-grain overlays |
| `src/components/ReplayPlayerV4Unified.tsx` | Update `getCellStyle` to use the same beveled block rendering for consistency |

## Technical Details

### Beveled Block CSS Pattern (matching reference image)

Each filled cell will use:
```css
background: <piece-color>;
border: 2px solid <darker-shade>;
box-shadow: 
  inset 2px 2px 0 <lighter-shade>,   /* top-left highlight */
  inset -2px -2px 0 <darker-shade>;  /* bottom-right shadow */
border-radius: 2px;
```

This creates the characteristic "raised button" look visible in the reference image without any texture overlays.

### Ghost Piece Style
- Dark semi-transparent fill with dashed gray border (matching reference where ghost is barely visible gray outlines)

### Garbage Row Style
- Uniform medium gray (`#888`) with slightly darker borders and a subtle inner grid pattern to distinguish from regular blocks

