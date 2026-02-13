/**
 * Replay V4 Codec - Binary encoding/decoding
 */

import type {
  V4ReplayData,
  V4Event,
  V4BinaryFormat,
  V4ValidationResult,
  ReplayOpcode,
  V4SpawnEvent,
  V4InputEvent,
  V4LockEvent,
  V4KeyframeEvent,
  V4MetaEvent,
  V4EndEvent,
  V4FrameEvent
} from './types';
import { ReplayOpcode as Op } from './types';

const MAGIC = new TextEncoder().encode('RPV4');
const VERSION = 4;

// Varint encoding
function encodeVarint(value: number): Uint8Array {
  const bytes: number[] = [];
  while (value >= 0x80) {
    bytes.push((value & 0x7F) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7F);
  return new Uint8Array(bytes);
}

function decodeVarint(data: Uint8Array, offset: number): [number, number] {
  let value = 0;
  let shift = 0;
  let pos = offset;
  
  while (pos < data.length) {
    const byte = data[pos++];
    value |= (byte & 0x7F) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  
  return [value, pos];
}

// Simple checksum (CRC32-like)
async function calculateChecksum(data: Uint8Array): Promise<string> {
  // Create a new Uint8Array to ensure proper type
  const buffer = new Uint8Array(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// Event encoding
function encodeEvent(event: V4Event): Uint8Array {
  const parts: Uint8Array[] = [];
  
  // Opcode + timestamp
  parts.push(new Uint8Array([event.type]));
  parts.push(encodeVarint(event.timestamp));
  
  switch (event.type) {
    case Op.SPAWN: {
      const e = event as V4SpawnEvent;
      // Single byte for pieceType
      parts.push(new Uint8Array([e.pieceType.charCodeAt(0) || 63])); // 63='?'
      parts.push(encodeVarint(e.x));
      parts.push(encodeVarint(e.y));
      break;
    }
    
    case Op.INPUT: {
      const e = event as V4InputEvent;
      parts.push(new Uint8Array([e.action]));
      parts.push(new Uint8Array([e.success ? 1 : 0]));
      
      // ✅ P1 新增：编码位置和旋转（如果存在）
      if (e.position !== undefined) {
        parts.push(new Uint8Array([1])); // has position flag
        parts.push(encodeVarint(e.position.x));
        parts.push(encodeVarint(e.position.y));
      } else {
        parts.push(new Uint8Array([0])); // no position
      }
      
      if (e.rotation !== undefined) {
        parts.push(new Uint8Array([1])); // has rotation flag
        parts.push(encodeVarint(e.rotation));
      } else {
        parts.push(new Uint8Array([0])); // no rotation
      }
      break;
    }
    
    case Op.LOCK: {
      const e = event as V4LockEvent;
      // Single byte for pieceType
      parts.push(new Uint8Array([e.pieceType.charCodeAt(0) || 63])); // 63='?'
      parts.push(encodeVarint(e.x));
      parts.push(encodeVarint(e.y));
      parts.push(encodeVarint(e.rotation));
      parts.push(encodeVarint(e.linesCleared));
      const flags = (e.isTSpin ? 1 : 0) | (e.isMini ? 2 : 0) | (e.boardAfterLock ? 4 : 0);
      parts.push(new Uint8Array([flags]));
      
      // Encode boardAfterLock + extra state if present
      if (e.boardAfterLock) {
        const PIECE_TYPE_TO_ID: Record<string, number> = {
          'I': 1, 'O': 2, 'T': 3, 'S': 4, 'Z': 5, 'J': 6, 'L': 7
        };
        const normalizedBoard = e.boardAfterLock.map(row => 
          row.map(cell => {
            if (typeof cell === 'string') return PIECE_TYPE_TO_ID[cell] || 0;
            return cell;
          })
        );
        const lockJson = JSON.stringify({
          board: normalizedBoard,
          next: e.nextPieces || [],
          hold: e.holdPiece ?? null,
          score: e.score || 0,
          lines: e.lines || 0,
          level: e.level || 1
        });
        const lockJsonBytes = new TextEncoder().encode(lockJson);
        parts.push(encodeVarint(lockJsonBytes.length));
        parts.push(lockJsonBytes);
      }
      break;
    }
    
    case Op.KF: {
      const e = event as V4KeyframeEvent;
      
      // ✅ P0 修复：确保棋盘数据使用数字 ID (1-7) 而不是字符串
      const PIECE_TYPE_TO_ID: Record<string, number> = {
        'I': 1, 'O': 2, 'T': 3, 'S': 4, 'Z': 5, 'J': 6, 'L': 7
      };
      
      const normalizedBoard = e.board.map(row => 
        row.map(cell => {
          if (typeof cell === 'string') {
            return PIECE_TYPE_TO_ID[cell] || 0;
          }
          return cell;
        })
      );
      
      const json = JSON.stringify({
        board: normalizedBoard,
        next: e.nextPieces,
        hold: e.holdPiece,
        score: e.score,
        lines: e.lines,
        level: e.level
      });
      const jsonBytes = new TextEncoder().encode(json);
      parts.push(encodeVarint(jsonBytes.length));
      parts.push(jsonBytes);
      break;
    }
    
    case Op.META: {
      const e = event as V4MetaEvent;
      const json = JSON.stringify({ key: e.key, value: e.value });
      const jsonBytes = new TextEncoder().encode(json);
      parts.push(encodeVarint(jsonBytes.length));
      parts.push(jsonBytes);
      break;
    }
    
    case Op.END: {
      const e = event as V4EndEvent;
      const reasonBytes = new TextEncoder().encode(e.reason);
      parts.push(encodeVarint(reasonBytes.length));
      parts.push(reasonBytes);
      break;
    }
    
    case Op.FRAME: {
      const e = event as V4FrameEvent;
      parts.push(new Uint8Array([e.pieceType.charCodeAt(0) || 63]));
      parts.push(encodeVarint(e.x));
      parts.push(encodeVarint(e.y));
      parts.push(encodeVarint(e.rotation));
      break;
    }
  }
  
  // Combine all parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  
  return result;
}

// Event decoding
function decodeEvent(data: Uint8Array, offset: number): [V4Event | null, number] {
  // 留 16 字节给 checksum
  if (offset >= data.length - 16) return [null, offset];
  
  const opcode = data[offset++];
  const [timestamp, pos1] = decodeVarint(data, offset);
  let pos = pos1;
  
  try {
    switch (opcode) {
      case Op.SPAWN: {
        const pieceType = String.fromCharCode(data[pos++]);
        const [x, pos2] = decodeVarint(data, pos);
        const [y, pos3] = decodeVarint(data, pos2);
        return [{ type: Op.SPAWN, timestamp, pieceType, x, y }, pos3];
      }
      
      case Op.INPUT: {
        const action = data[pos++];
        const success = data[pos++] === 1;
        
        // ✅ P1 新增：解码位置和旋转
        let position: { x: number; y: number } | undefined = undefined;
        let rotation: number | undefined = undefined;
        
        const hasPosition = data[pos++] === 1;
        if (hasPosition) {
          const [x, pos2] = decodeVarint(data, pos);
          const [y, pos3] = decodeVarint(data, pos2);
          position = { x, y };
          pos = pos3;
        }
        
        const hasRotation = data[pos++] === 1;
        if (hasRotation) {
          const [rot, pos2] = decodeVarint(data, pos);
          rotation = rot;
          pos = pos2;
        }
        
        return [{ type: Op.INPUT, timestamp, action, success, position, rotation }, pos];
      }
      
      case Op.LOCK: {
        const pieceType = String.fromCharCode(data[pos++]);
        const [x, pos2] = decodeVarint(data, pos);
        const [y, pos3] = decodeVarint(data, pos2);
        const [rotation, pos4] = decodeVarint(data, pos3);
        const [linesCleared, pos5] = decodeVarint(data, pos4);
        const flags = data[pos5];
        let pos6 = pos5 + 1;
        
        let boardAfterLock: number[][] | undefined;
        let nextPieces: string[] | undefined;
        let holdPiece: string | null | undefined;
        let score: number | undefined;
        let lines: number | undefined;
        let level: number | undefined;
        
        // Decode boardAfterLock if flag bit 2 is set
        if (flags & 4) {
          const [jsonLen, pos7] = decodeVarint(data, pos6);
          const jsonBytes = data.slice(pos7, pos7 + jsonLen);
          const json = JSON.parse(new TextDecoder().decode(jsonBytes));
          boardAfterLock = json.board;
          nextPieces = json.next;
          holdPiece = json.hold;
          score = json.score;
          lines = json.lines;
          level = json.level;
          pos6 = pos7 + jsonLen;
        }
        
        return [{
          type: Op.LOCK,
          timestamp,
          pieceType,
          x,
          y,
          rotation,
          linesCleared,
          isTSpin: (flags & 1) !== 0,
          isMini: (flags & 2) !== 0,
          boardAfterLock,
          nextPieces,
          holdPiece,
          score,
          lines,
          level
        }, pos6];
      }
      
      case Op.KF: {
        const [jsonLen, pos2] = decodeVarint(data, pos);
        const jsonBytes = data.slice(pos2, pos2 + jsonLen);
        const json = JSON.parse(new TextDecoder().decode(jsonBytes));
        
        // ✅ 新增：验证并修复棋盘数据
        let board = json.board;
        if (!Array.isArray(board)) {
          console.warn('[V4 Decoder] KF board is not an array, creating empty');
          board = Array(23).fill(null).map(() => Array(10).fill(0));
        } else {
          board = board.map((row: any, idx: number) => {
            if (!Array.isArray(row)) {
              console.warn(`[V4 Decoder] KF board row ${idx} invalid`);
              return Array(10).fill(0);
            }
            return row;
          });
        }
        
        return [{
          type: Op.KF,
          timestamp,
          board,
          nextPieces: Array.isArray(json.next) ? json.next : [],
          holdPiece: json.hold || null,
          score: json.score || 0,
          lines: json.lines || 0,
          level: json.level || 1
        }, pos2 + jsonLen];
      }
      
      case Op.META: {
        const [jsonLen, pos2] = decodeVarint(data, pos);
        const jsonBytes = data.slice(pos2, pos2 + jsonLen);
        const json = JSON.parse(new TextDecoder().decode(jsonBytes));
        return [{
          type: Op.META,
          timestamp,
          key: json.key,
          value: json.value
        }, pos2 + jsonLen];
      }
      
      case Op.END: {
        const [reasonLen, pos2] = decodeVarint(data, pos);
        const reasonBytes = data.slice(pos2, pos2 + reasonLen);
        const reason = new TextDecoder().decode(reasonBytes);
        return [{
          type: Op.END,
          timestamp,
          reason: reason as any
        }, pos2 + reasonLen];
      }
      
      case Op.FRAME: {
        const pieceType = String.fromCharCode(data[pos++]);
        const [x, pos2] = decodeVarint(data, pos);
        const [y, pos3] = decodeVarint(data, pos2);
        const [rotation, pos4] = decodeVarint(data, pos3);
        return [{
          type: Op.FRAME,
          timestamp,
          pieceType,
          x,
          y,
          rotation
        }, pos4];
      }
      
      default:
        console.warn(`[V4 Decoder] ⚠️ Unknown opcode: ${opcode} at offset ${offset - 1}`);
        console.warn(`[V4 Decoder] Context bytes (hex):`, 
          Array.from(data.slice(Math.max(0, offset - 5), Math.min(data.length, offset + 10)))
            .map((b, i) => `[${i === 5 ? '→' : ' '}${b.toString(16).padStart(2, '0')}]`)
            .join('')
        );
        console.warn(`[V4 Decoder] Context bytes (decimal):`,
          Array.from(data.slice(Math.max(0, offset - 5), Math.min(data.length, offset + 10)))
        );
        // 尝试跳过这个损坏的事件，继续解码
        const skipBytes = Math.min(32, data.length - pos - 16);
        console.warn(`[V4 Decoder] Skipping ${skipBytes} bytes to attempt recovery`);
        return [null, pos + skipBytes];
    }
  } catch (err) {
    console.error('Event decode error:', err);
    return [null, pos];
  }
}

// Main encoding
export async function encodeV4Replay(replay: V4ReplayData): Promise<Uint8Array> {
  // Encode header (JSON metadata + stats)
  const headerObj = {
    metadata: replay.metadata,
    stats: replay.stats
  };
  const headerJson = JSON.stringify(headerObj);
  const headerBytes = new TextEncoder().encode(headerJson);
  
  // Encode events
  const eventBlocks: Uint8Array[] = [];
  const eventBreakdown = {
    SPAWN: 0,
    INPUT: 0,
    LOCK: 0,
    KF: 0,
    META: 0,
    END: 0,
    FRAME: 0
  };
  
  for (const event of replay.events) {
    eventBlocks.push(encodeEvent(event));
    // Count events
    switch (event.type) {
      case Op.SPAWN: eventBreakdown.SPAWN++; break;
      case Op.INPUT: eventBreakdown.INPUT++; break;
      case Op.LOCK: eventBreakdown.LOCK++; break;
      case Op.KF: eventBreakdown.KF++; break;
      case Op.META: eventBreakdown.META++; break;
      case Op.END: eventBreakdown.END++; break;
      case Op.FRAME: eventBreakdown.FRAME++; break;
    }
  }
  
  console.log('[V4 Encoder] Event breakdown:', eventBreakdown);
  
  const totalEventSize = eventBlocks.reduce((sum, b) => sum + b.length, 0);
  const eventsBytes = new Uint8Array(totalEventSize);
  let offset = 0;
  for (const block of eventBlocks) {
    eventsBytes.set(block, offset);
    offset += block.length;
  }
  
  // Calculate checksum
  const dataForChecksum = new Uint8Array(headerBytes.length + eventsBytes.length);
  dataForChecksum.set(headerBytes, 0);
  dataForChecksum.set(eventsBytes, headerBytes.length);
  const checksumStr = await calculateChecksum(dataForChecksum);
  const checksumBytes = new TextEncoder().encode(checksumStr);
  
  // Assemble binary format
  const parts: Uint8Array[] = [];
  parts.push(MAGIC);
  parts.push(new Uint8Array([VERSION]));
  parts.push(encodeVarint(headerBytes.length));
  parts.push(headerBytes);
  parts.push(encodeVarint(replay.events.length));
  parts.push(eventsBytes);
  parts.push(checksumBytes);
  
  const totalSize = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalSize);
  offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  
  return result;
}

// Main decoding
export async function decodeV4Replay(data: Uint8Array): Promise<V4ReplayData | null> {
  try {
    console.log('[V4 Decoder] Starting decode, data length:', data.length);
    console.log('[V4 Decoder] First 16 bytes (hex):', 
      Array.from(data.slice(0, 16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')
    );
    console.log('[V4 Decoder] First 8 bytes (decimal):', Array.from(data.slice(0, 8)));
    console.log('[V4 Decoder] First 16 bytes (ASCII):', 
      Array.from(data.slice(0, 16))
        .map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')
        .join('')
    );
    
    let pos = 0;
    
    // Check magic (byte-by-byte comparison)
    const magic = data.slice(pos, pos + 4);
    let magicMatch = true;
    for (let i = 0; i < 4; i++) {
      if (magic[i] !== MAGIC[i]) {
        magicMatch = false;
        break;
      }
    }
    
    if (!magicMatch) {
      const expectedBytes = Array.from(MAGIC);
      const receivedBytes = Array.from(magic);
      const expectedStr = new TextDecoder().decode(MAGIC);
      const receivedStr = new TextDecoder().decode(magic);
      
      console.error('[V4 Decoder] ❌ MAGIC BYTE MISMATCH - Replay data is corrupted or wrong format', {
        expected: expectedBytes,
        received: receivedBytes,
        expectedString: expectedStr,
        receivedString: receivedStr,
        expectedHex: expectedBytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
        receivedHex: receivedBytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
        diagnosis: receivedBytes.every(b => b === 0) 
          ? 'Data appears to be all zeros - storage corruption'
          : receivedStr.includes('{') || receivedStr.includes('[')
          ? 'Data looks like JSON - likely Uint8Array was serialized as JSON object instead of Base64'
          : 'Unknown format - may need to re-record replay'
      });
      throw new Error(
        `Invalid V4 replay format: Expected magic "RPV4" [82,80,86,52], got "${receivedStr}" [${receivedBytes.join(',')}]. ` +
        `This replay may have been saved in an older format and needs to be re-recorded.`
      );
    }
    console.log('[V4 Decoder] ✅ Magic bytes verified: RPV4');
    pos += 4;
    
    // Check version
    const version = data[pos++];
    console.log('[V4 Decoder] Version byte:', version);
    if (version !== VERSION) {
      console.error('[V4 Decoder] Unsupported version:', version, 'expected:', VERSION);
      throw new Error(`Unsupported version: ${version}, expected ${VERSION}`);
    }
    
    // Decode header
    const headerStart = pos;
    const [headerSize, pos1] = decodeVarint(data, pos);
    pos = pos1;
    console.log('[V4 Decoder] Header size:', headerSize, 'starts at:', headerStart);
    
    const headerBytes = data.slice(pos, pos + headerSize);
    pos += headerSize;
    const header = JSON.parse(new TextDecoder().decode(headerBytes));
    console.log('[V4 Decoder] Header decoded:', { metadata: header.metadata, stats: header.stats });
    
    // Decode events
    const eventStart = pos;
    const [eventCount, pos2] = decodeVarint(data, pos);
    pos = pos2;
    console.log('[V4 Decoder] Event count:', eventCount, 'starts at:', eventStart);
    
    const events: V4Event[] = [];
    let successfulDecodes = 0;
    let failedDecodes = 0;
    
    for (let i = 0; i < eventCount; i++) {
      // 边界检查：留 16 字节给 checksum
      if (pos >= data.length - 16) {
        console.warn(`[V4 Decoder] Reached end of data at event ${i}/${eventCount}`);
        break;
      }
      
      const beforePos = pos;
      const [event, nextPos] = decodeEvent(data, pos);
      
      if (event) {
        events.push(event);
        successfulDecodes++;
      } else {
        failedDecodes++;
        if (failedDecodes > 10) {
          console.error(`[V4 Decoder] Too many decode failures (${failedDecodes}), aborting`);
          break;
        }
      }
      
      pos = nextPos;
      
      // 防止无限循环
      if (pos <= beforePos) {
        console.error(`[V4 Decoder] Position not advancing at event ${i}, breaking loop`);
        pos = beforePos + 1; // 强制前进
      }
    }
    
    const eventEnd = pos;
    
    // Count decoded events by type
    const decodedBreakdown = {
      SPAWN: events.filter(e => e.type === Op.SPAWN).length,
      INPUT: events.filter(e => e.type === Op.INPUT).length,
      LOCK: events.filter(e => e.type === Op.LOCK).length,
      KF: events.filter(e => e.type === Op.KF).length,
      META: events.filter(e => e.type === Op.META).length,
      END: events.filter(e => e.type === Op.END).length,
      FRAME: events.filter(e => e.type === Op.FRAME).length
    };
    
    console.log(`[V4 Decoder] Events decoded: ${successfulDecodes} successful, ${failedDecodes} failed, ends at: ${eventEnd}`);
    console.log('[V4 Decoder] Decoded event breakdown:', decodedBreakdown);
    
    // Read checksum (last 16 bytes of hex string)
    const checksumBytes = data.slice(data.length - 16);
    const storedChecksum = new TextDecoder().decode(checksumBytes);
    console.log('[V4 Decoder] Stored checksum:', storedChecksum);
    
    // Verify checksum - Use header + events range
    const headerAndEventsBytes = new Uint8Array(headerBytes.length + (eventEnd - eventStart));
    headerAndEventsBytes.set(headerBytes, 0);
    headerAndEventsBytes.set(data.slice(eventStart, eventEnd), headerBytes.length);
    const calculatedChecksum = await calculateChecksum(headerAndEventsBytes);
    console.log('[V4 Decoder] Calculated checksum:', calculatedChecksum);
    
    if (storedChecksum !== calculatedChecksum) {
      console.warn('[V4 Decoder] ⚠️ Checksum mismatch - data may be corrupted', {
        stored: storedChecksum,
        calculated: calculatedChecksum
      });
    } else {
      console.log('[V4 Decoder] ✅ Checksum verified');
    }
    
    console.log('[V4 Decoder] ✅ Decode successful', {
      version: '4.0',
      eventCount: events.length,
      lockCount: events.filter(e => e.type === Op.LOCK).length,
      keyframeCount: events.filter(e => e.type === Op.KF).length
    });
    
    return {
      version: '4.0',
      metadata: header.metadata,
      events,
      stats: header.stats,
      checksum: storedChecksum
    };
  } catch (err) {
    console.error('[V4 Decoder] ❌ Decode failed:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`V4 decode error: ${err}`);
  }
}

// Validation
export function validateV4Replay(replay: V4ReplayData): V4ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats = {
    totalEvents: replay.events.length,
    spawnCount: 0,
    inputCount: 0,
    lockCount: 0,
    keyframeCount: 0,
    frameCount: 0
  };
  
  // Count events
  for (const event of replay.events) {
    switch (event.type) {
      case Op.SPAWN: stats.spawnCount++; break;
      case Op.INPUT: stats.inputCount++; break;
      case Op.LOCK: stats.lockCount++; break;
      case Op.KF: stats.keyframeCount++; break;
      case Op.FRAME: stats.frameCount++; break;
    }
  }
  
  // Critical validations
  if (stats.lockCount === 0) {
    errors.push('No LOCK events - replay is unplayable');
  }
  
  if (stats.keyframeCount === 0) {
    warnings.push('No keyframes - recovery may be difficult');
  }
  
  if (stats.spawnCount < stats.lockCount) {
    warnings.push('Fewer spawns than locks - possible data loss');
  }
  
  if (!replay.metadata.seed) {
    errors.push('Missing seed - cannot reproduce piece sequence');
  }
  
  if (!replay.metadata.initialPieceSequence || replay.metadata.initialPieceSequence.length < 7) {
    errors.push('Initial piece sequence incomplete');
  }
  
  // Validate pieceType for SPAWN, LOCK, and FRAME events
  const validPieceTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  for (const e of replay.events) {
    if ((e.type === Op.SPAWN || e.type === Op.LOCK || e.type === Op.FRAME) && 'pieceType' in e) {
      if (!validPieceTypes.includes(e.pieceType)) {
        errors.push(`Invalid pieceType "${e.pieceType}" at time ${e.timestamp}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}
