# V4 Replay System - TDD Development Guide

## Overview

This guide documents the Test-Driven Development (TDD) approach for the V4 Replay System, including test structure, coverage goals, and implementation guidelines.

## Test Structure

```
src/utils/replayV4/__tests__/
├── codec.test.ts       # Encoding/Decoding tests
├── validation.test.ts  # Data validation tests
├── recorder.test.ts    # Recorder logic tests
└── player.test.ts      # Player logic tests
```

## Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test codec.test.ts

# Run with coverage
npm run test -- --coverage

# Watch mode for development
npm run test -- --watch
```

## Test Coverage Goals

- **Overall Coverage**: >80%
- **Critical Paths**: 100% (codec, validation)
- **Business Logic**: >90% (recorder, player)
- **UI Components**: >70%

## 1. Codec Tests (`codec.test.ts`)

### Purpose
Verify binary encoding/decoding integrity and error handling.

### Key Test Cases

#### ✅ Basic Encoding/Decoding
```typescript
it('should encode and decode minimal replay correctly', async () => {
  const original = createMinimalReplay();
  const encoded = await encodeV4Replay(original);
  const decoded = await decodeV4Replay(encoded);
  
  expect(decoded?.version).toBe('4.0');
  expect(decoded?.events.length).toBe(4);
});
```

#### ✅ Magic Bytes Validation
```typescript
it('should reject invalid magic bytes', async () => {
  const invalidData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
  const decoded = await decodeV4Replay(invalidData);
  
  expect(decoded).toBeNull();
});
```

#### ✅ Checksum Integrity
```typescript
it('should detect data tampering', async () => {
  const replay = createMinimalReplay();
  const encoded = await encodeV4Replay(replay);
  
  // Tamper with data
  const tampered = new Uint8Array(encoded);
  tampered[50] = tampered[50] ^ 0xFF;
  
  const decoded = await decodeV4Replay(tampered);
  expect(decoded === null || decoded.checksum !== replay.checksum).toBe(true);
});
```

### Coverage Metrics
- ✅ All event types (SPAWN, INPUT, LOCK, KF, META, END)
- ✅ Edge cases (empty events, large replays)
- ✅ Error conditions (invalid magic, wrong version)

## 2. Validation Tests (`validation.test.ts`)

### Purpose
Ensure data integrity before saving and loading replays.

### Critical Validations

#### ✅ Required Events
```typescript
it('should fail validation when no LOCK events', () => {
  const replay = createValidReplay();
  replay.events = replay.events.filter(e => e.type !== ReplayOpcode.LOCK);
  
  const result = validateV4Replay(replay);
  expect(result.valid).toBe(false);
});
```

#### ✅ Lock Count Consistency
```typescript
it('should fail when lockCount does not match actual LOCK events', () => {
  const replay = createValidReplay();
  replay.stats.lockCount = 10; // Incorrect
  
  const result = validateV4Replay(replay);
  expect(result.errors.some(e => e.includes('lockCount'))).toBe(true);
});
```

#### ✅ Piece Type Validation
```typescript
it('should fail for invalid piece type', () => {
  const replay = createValidReplay();
  replay.events[0].pieceType = 'X'; // Invalid
  
  const result = validateV4Replay(replay);
  expect(result.valid).toBe(false);
});
```

### Coverage Metrics
- ✅ Event presence (LOCK, KF)
- ✅ Statistical consistency (lockCount, keyframeCount)
- ✅ Data integrity (piece types, timestamps)
- ✅ Board dimensions (20x10)

## 3. Recorder Tests (`recorder.test.ts`)

### Purpose
Verify recording logic and event generation.

### Key Test Cases

#### ✅ Piece Type Sanitization
```typescript
it('should normalize lowercase to uppercase', () => {
  expect(sanitizePieceType('i')).toBe('I');
  expect(sanitizePieceType('t')).toBe('T');
});

it('should reject invalid piece types', () => {
  expect(() => sanitizePieceType('X')).toThrow('Invalid piece type');
});
```

#### ✅ Keyframe Generation Rules
```typescript
it('should generate keyframe on first lock', () => {
  expect(shouldGenerateKeyframe(1)).toBe(true);
});

it('should generate keyframe every 10th lock', () => {
  expect(shouldGenerateKeyframe(10)).toBe(true);
  expect(shouldGenerateKeyframe(20)).toBe(true);
});

it('should not generate keyframe on other locks', () => {
  expect(shouldGenerateKeyframe(2)).toBe(false);
  expect(shouldGenerateKeyframe(5)).toBe(false);
});
```

#### ✅ Save Validation
```typescript
it('should refuse to save replay with lockCount = 0', () => {
  const result = shouldSaveReplay({ lockCount: 0, keyframeCount: 1, eventCount: 10 });
  expect(result.save).toBe(false);
  expect(result.reason).toContain('No pieces locked');
});
```

### Coverage Metrics
- ✅ Event recording (SPAWN, LOCK)
- ✅ Keyframe generation timing
- ✅ Data sanitization
- ✅ Pre-save validation

## 4. Player Tests (`player.test.ts`)

### Purpose
Verify playback reconstruction accuracy.

### Key Test Cases

#### ✅ Keyframe Finding (Binary Search)
```typescript
it('should find most recent keyframe before target time', () => {
  const kf = findRelevantKeyframe(15000, keyframes);
  expect(kf?.timestamp).toBe(10000);
});

it('should return null when target time is before first keyframe', () => {
  const kf = findRelevantKeyframe(-1000, keyframes);
  expect(kf).toBeNull();
});
```

#### ✅ Score Calculation
```typescript
it('should calculate tetris score', () => {
  expect(calculateScoreForLines(4, false, false, 1)).toBe(800);
  expect(calculateScoreForLines(4, false, false, 2)).toBe(1600);
});

it('should calculate T-Spin Double score', () => {
  expect(calculateScoreForLines(2, true, false, 1)).toBe(1200);
});
```

#### ✅ State Reconstruction
```typescript
it('should start from keyframe state', () => {
  const kf = createKeyframe({ score: 1000, lines: 5 });
  const state = reconstructState(kf, []);
  
  expect(state.score).toBe(1000);
  expect(state.lines).toBe(5);
});

it('should apply lock events to update state', () => {
  const kf = createKeyframe({ score: 0, lines: 0 });
  const locks = [createLockEvent({ linesCleared: 1 })];
  
  const state = reconstructState(kf, locks);
  expect(state.lines).toBe(1);
  expect(state.score).toBeGreaterThan(0);
});
```

### Coverage Metrics
- ✅ Keyframe lookup (binary search)
- ✅ LOCK event application
- ✅ Score calculation (all line clear types)
- ✅ Playback speed control
- ✅ Time seeking

## Optimized Replay UI (Jstris-Inspired)

### Design Goals
1. **Simplicity**: Key info prominent, technical details hidden
2. **Clarity**: Large, readable stats and controls
3. **Real-time**: PPS/APM update during playback
4. **Achievement Highlights**: Visual feedback for T-Spins, Tetrises

### UI Components

#### Main Layout
```
┌─────────────────────────────────────────────────────────┐
│  [Username] [Game Mode] [Badges]           [Close]      │
├────────────┬──────────────────────┬─────────────────────┤
│   Stats    │    Game Board        │    Next/Hold        │
│  Score     │   (Centered)         │    Pieces           │
│  Lines     │                      │                     │
│  Level     │   [Achievement       │   [Show Details]    │
│  PPS/APM   │    Overlay]          │                     │
│  Pieces    │                      │   [Technical Info]  │
└────────────┴──────────────────────┴─────────────────────┘
│  [Progress Bar]   [Time: 1:23 / 2:45]                   │
│  [Play/Pause]  [Reset]  [Speed: 0.25x 0.5x 1x 2x 4x]   │
└─────────────────────────────────────────────────────────┘
```

#### Achievement Overlay
- **Tetris**: Lightning bolt icon + "TETRIS!" text
- **T-Spin**: Award icon + "T-SPIN DOUBLE!" text
- **Auto-dismiss**: 2 second timeout
- **Styling**: Bright, animated, centered over board

#### Real-time Stats
- **PPS**: Calculated as `piecesPlaced / (currentTime / 1000)`
- **APM**: Calculated as `PPS * 60`
- **Update Frequency**: Every frame during playback

### Performance Optimizations

#### 1. State Caching
```typescript
const stateCache = useRef<Map<number, any>>(new Map());

// Cache states at 100ms intervals
const cacheKey = Math.floor(targetTime / 100) * 100;
stateCache.current.set(cacheKey, { time: targetTime, state });
```

#### 2. Binary Search for Keyframes
```typescript
// O(log n) instead of O(n)
while (left <= right) {
  const mid = Math.floor((left + right) / 2);
  if (keyframes[mid].timestamp <= targetTime) {
    result = keyframes[mid];
    left = mid + 1;
  } else {
    right = mid - 1;
  }
}
```

#### 3. Reduced Logging
```typescript
// Only log errors in production
if (process.env.NODE_ENV === 'development') {
  console.log('[Replay] State reconstructed:', state);
}
```

## Integration Testing

### End-to-End Flow
```typescript
describe('Replay System E2E', () => {
  it('should record, save, load, and play replay', async () => {
    // 1. Start recording
    const recorder = useReplayRecorderV4();
    recorder.startRecording(seed, initialPieces, settings, user);
    
    // 2. Record game actions
    recorder.recordSpawn('I', 3, 0, 0);
    recorder.recordLock('I', 3, 19, 0, 1000, 1, false, false);
    
    // 3. Stop and save
    await recorder.stopRecording(finalStats);
    
    // 4. Load from database
    const loaded = await loadReplayFromDB(replayId);
    
    // 5. Verify playback
    expect(loaded?.version).toBe('4.0');
    expect(loaded?.events.length).toBeGreaterThan(0);
  });
});
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Replay Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3
```

### Coverage Reporting
- **Tool**: Codecov / Istanbul
- **Threshold**: 80% minimum
- **Fail Build**: If coverage drops below threshold

## Monitoring

### Metrics to Track
1. **Save Success Rate**: % of replays successfully saved
2. **Validation Failure Rate**: % of replays rejected by validation
3. **Average Replay Size**: Bytes per replay
4. **Playback Errors**: Exceptions during playback
5. **Performance**: State reconstruction time (<10ms target)

### Logging
```typescript
// Production-safe logging
import { logger } from '@/utils/debugLogger';

logger.error('[Replay] Failed to encode:', error);
logger.info('[Replay] Saved successfully:', { replayId, size });
```

## Best Practices

### 1. Test Naming
✅ **Good**: `should reject replay with lockCount = 0`  
❌ **Bad**: `test1`

### 2. Arrange-Act-Assert Pattern
```typescript
it('should calculate score correctly', () => {
  // Arrange
  const linesCleared = 4;
  const level = 2;
  
  // Act
  const score = calculateScore(linesCleared, level);
  
  // Assert
  expect(score).toBe(1600);
});
```

### 3. Isolate Tests
- ✅ Each test is independent
- ✅ No shared mutable state
- ✅ Use factories for test data

### 4. Coverage ≠ Quality
- ✅ Test edge cases, not just happy paths
- ✅ Verify error conditions
- ✅ Test boundary values

## Next Steps

1. **Run Initial Tests**: `npm run test`
2. **Check Coverage**: `npm run test -- --coverage`
3. **Fix Failing Tests**: Address any issues
4. **Add Missing Tests**: Cover untested code paths
5. **Integrate CI**: Set up automated testing
6. **Monitor Production**: Track replay save rates

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [V4 Replay Specification](./V4_REPLAY_IMPLEMENTATION.md)

---

**Last Updated**: 2025-10-30  
**Maintainer**: Development Team
