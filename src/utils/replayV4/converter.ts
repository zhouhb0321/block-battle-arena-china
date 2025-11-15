import { V4ReplayData, V4InputEvent, ReplayOpcode, InputAction } from './types';

/**
 * 将 V4 INPUT 事件转换为游戏引擎可理解的动作类型
 */
export function convertInputActionToString(action: InputAction): string | null {
  const actionMap: Record<InputAction, string> = {
    [InputAction.MOVE_LEFT]: 'moveLeft',
    [InputAction.MOVE_RIGHT]: 'moveRight',
    [InputAction.SOFT_DROP]: 'softDrop',
    [InputAction.HARD_DROP]: 'hardDrop',
    [InputAction.ROTATE_CW]: 'rotateClockwise',
    [InputAction.ROTATE_CCW]: 'rotateCounterclockwise',
    [InputAction.ROTATE_180]: 'rotate180',
    [InputAction.HOLD]: 'hold'
  };
  
  return actionMap[action] || null;
}

/**
 * 从 V4 回放中提取所有 INPUT 事件（用于驱动游戏引擎）
 */
export function extractInputEvents(replay: V4ReplayData): Array<{
  timestamp: number;
  action: string;
  success: boolean;
  position?: { x: number; y: number };
  rotation?: number;
}> {
  return replay.events
    .filter((e): e is V4InputEvent => e.type === ReplayOpcode.INPUT)
    .map(event => {
      const actionString = convertInputActionToString(event.action);
      if (!actionString) return null;
      
      return {
        timestamp: event.timestamp,
        action: actionString,
        success: event.success,
        position: event.position,
        rotation: event.rotation
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
}

/**
 * 从 V4 回放中提取 LOCK 事件
 */
export function extractLockEvents(replay: V4ReplayData) {
  return replay.events
    .filter((e): e is import('./types').V4LockEvent => e.type === ReplayOpcode.LOCK);
}

/**
 * 从 V4 回放中提取 KEYFRAME 事件
 */
export function extractKeyframeEvents(replay: V4ReplayData) {
  return replay.events
    .filter((e): e is import('./types').V4KeyframeEvent => e.type === ReplayOpcode.KF);
}

/**
 * 从 V4 回放中提取元数据
 */
export function extractReplayMetadata(replay: V4ReplayData) {
  return {
    seed: replay.metadata.seed,
    gameMode: replay.metadata.gameMode,
    settings: replay.metadata.settings,
    username: replay.metadata.username,
    recordedAt: replay.metadata.recordedAt,
    initialPieceSequence: replay.metadata.initialPieceSequence
  };
}
