// 录像数据压缩工具

import { CompressedAction, OptimizedReplayData, ACTION_TYPES } from './replayTypes';
import type { ReplayAction } from './gameTypes';

export class ReplayCompressor {
  // 将传统的ReplayAction压缩为CompressedAction
  static compressActions(actions: ReplayAction[]): CompressedAction[] {
    return actions.map(action => {
      const compressed: CompressedAction = {
        t: action.timestamp,
        a: this.encodeActionType(action.action)
      };

      // 根据动作类型添加数据
      switch (action.action) {
        case 'move':
          compressed.d = action.data?.direction === 'left' ? 0 : 1;
          break;
        case 'rotate':
          compressed.d = action.data?.direction === 'clockwise' ? 0 : 
                        action.data?.direction === 'counterclockwise' ? 1 : 2;
          break;
        case 'drop':
          compressed.d = action.data?.type === 'soft' ? 0 : 1;
          break;
        case 'place':
          // 编码位置信息 (x坐标 + y坐标*16)
          compressed.d = (action.data?.x || 0) + ((action.data?.y || 0) * 16);
          break;
      }

      return compressed;
    });
  }

  // 将CompressedAction还原为ReplayAction
  static decompressActions(compressed: CompressedAction[]): ReplayAction[] {
    return compressed.map(action => {
      const decompressed: ReplayAction = {
        timestamp: action.t,
        action: this.decodeActionType(action.a)
      };

      // 根据动作类型解析数据
      switch (decompressed.action) {
        case 'move':
          decompressed.data = { direction: action.d === 0 ? 'left' : 'right' };
          break;
        case 'rotate':
          decompressed.data = { 
            direction: action.d === 0 ? 'clockwise' : 
                      action.d === 1 ? 'counterclockwise' : '180'
          };
          break;
        case 'drop':
          decompressed.data = { type: action.d === 0 ? 'soft' : 'hard' };
          break;
        case 'place':
          if (action.d !== undefined) {
            decompressed.data = {
              x: action.d % 16,
              y: Math.floor(action.d / 16)
            };
          }
          break;
      }

      return decompressed;
    });
  }

  // 二进制编码动作数组
  static encodeToBinary(actions: CompressedAction[]): Uint8Array {
    // 估算需要的字节数 (每个动作约4-6字节)
    const buffer = new ArrayBuffer(actions.length * 8);
    const view = new DataView(buffer);
    let offset = 0;

    for (const action of actions) {
      // 写入时间戳 (4字节)
      view.setUint32(offset, action.t, true);
      offset += 4;

      // 写入动作类型 (1字节)
      view.setUint8(offset, action.a);
      offset += 1;

      // 写入数据 (2字节，可选)
      if (action.d !== undefined) {
        view.setUint16(offset, action.d, true);
        offset += 2;
      } else {
        view.setUint16(offset, 0xFFFF, true); // 标记无数据
        offset += 2;
      }
    }

    return new Uint8Array(buffer, 0, offset);
  }

  // 二进制解码动作数组
  static decodeFromBinary(data: Uint8Array): CompressedAction[] {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const actions: CompressedAction[] = [];
    let offset = 0;

    while (offset + 7 <= data.length) {
      try {
        const action: CompressedAction = {
          t: view.getUint32(offset, true),
          a: view.getUint8(offset + 4)
        };
        offset += 5;

        const dataValue = view.getUint16(offset, true);
        if (dataValue !== 0xFFFF) {
          action.d = dataValue;
        }
        offset += 2;

        actions.push(action);
      } catch (e) {
        console.warn('ReplayCompressor: Failed to decode action at offset', offset, e);
        break;
      }
    }

    return actions;
  }

  // 计算压缩比率
  static calculateCompressionRatio(original: ReplayAction[], compressed: Uint8Array): number {
    const originalSize = JSON.stringify(original).length;
    const compressedSize = compressed.length;
    return Math.round((1 - compressedSize / originalSize) * 100) / 100;
  }

  // 生成数据校验和
  static generateChecksum(data: OptimizedReplayData): string {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(16);
  }

  // 验证数据完整性
  static verifyChecksum(data: OptimizedReplayData, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  private static encodeActionType(action: string): number {
    switch (action) {
      case 'move': return ACTION_TYPES.MOVE_LEFT; // 具体方向在data中
      case 'rotate': return ACTION_TYPES.ROTATE_CW; // 具体方向在data中
      case 'drop': return ACTION_TYPES.SOFT_DROP; // 具体类型在data中
      case 'hold': return ACTION_TYPES.HOLD;
      case 'pause': return ACTION_TYPES.PAUSE;
      case 'place': return ACTION_TYPES.PLACE;
      default: return ACTION_TYPES.GAME_EVENT;
    }
  }

  private static decodeActionType(encoded: number): ReplayAction['action'] {
    switch (encoded) {
      case ACTION_TYPES.MOVE_LEFT:
      case ACTION_TYPES.MOVE_RIGHT:
        return 'move';
      case ACTION_TYPES.ROTATE_CW:
      case ACTION_TYPES.ROTATE_CCW:
      case ACTION_TYPES.ROTATE_180:
        return 'rotate';
      case ACTION_TYPES.SOFT_DROP:
      case ACTION_TYPES.HARD_DROP:
        return 'drop';
      case ACTION_TYPES.HOLD:
        return 'hold';
      case ACTION_TYPES.PAUSE:
        return 'pause';
      case ACTION_TYPES.PLACE:
        return 'place';
      default:
        return 'move'; // 默认值
    }
  }
}

// 随机种子生成器
export class SeededRandom {
  private seed: number;

  constructor(seed: string | number) {
    this.seed = typeof seed === 'string' ? this.hashString(seed) : seed;
  }

  // 生成下一个随机数 (0-1)
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % (2 ** 32);
    return this.seed / (2 ** 32);
  }

  // 生成指定范围的整数
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // 生成方块序列
  generatePieceSequence(length: number): string[] {
    const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const sequence: string[] = [];
    
    for (let i = 0; i < length; i++) {
      // 使用7-bag算法确保方块分布均匀
      if (i % 7 === 0) {
        const bag = [...pieces];
        // Fisher-Yates洗牌算法
        for (let j = bag.length - 1; j > 0; j--) {
          const k = this.nextInt(0, j);
          [bag[j], bag[k]] = [bag[k], bag[j]];
        }
        sequence.push(...bag);
      }
    }
    
    return sequence.slice(0, length);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
  }
}

// ELO积分计算
export class EloCalculator {
  static calculate(
    winnerRating: number, 
    loserRating: number, 
    kFactor: number = 32
  ): { winnerNewRating: number; loserNewRating: number } {
    const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser = 1 - expectedWinner;
    
    const winnerChange = Math.round(kFactor * (1 - expectedWinner));
    const loserChange = Math.round(kFactor * (0 - expectedLoser));
    
    return {
      winnerNewRating: winnerRating + winnerChange,
      loserNewRating: loserRating + loserChange
    };
  }

  // 根据游戏数量调整K因子
  static getKFactor(gamesPlayed: number): number {
    if (gamesPlayed < 30) return 32; // 新手
    if (gamesPlayed < 100) return 24; // 进阶
    return 16; // 老手
  }

  // 计算段位晋级所需积分
  static getPromotionTarget(currentRating: number): number {
    if (currentRating < 1200) return 1200; // Bronze -> Silver
    if (currentRating < 1600) return 1600; // Silver -> Gold
    if (currentRating < 2000) return 2000; // Gold -> Platinum
    if (currentRating < 2400) return 2400; // Platinum -> Diamond
    if (currentRating < 2800) return 2800; // Diamond -> Master
    if (currentRating < 3200) return 3200; // Master -> Grandmaster
    return currentRating + 200; // 继续上升
  }
}