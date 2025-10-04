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
  V4EndEvent
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
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
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
      parts.push(new TextEncoder().encode(e.pieceType));
      parts.push(encodeVarint(e.x));
      parts.push(encodeVarint(e.y));
      break;
    }
    
    case Op.INPUT: {
      const e = event as V4InputEvent;
      parts.push(new Uint8Array([e.action]));
      parts.push(new Uint8Array([e.success ? 1 : 0]));
      break;
    }
    
    case Op.LOCK: {
      const e = event as V4LockEvent;
      parts.push(new TextEncoder().encode(e.pieceType));
      parts.push(encodeVarint(e.x));
      parts.push(encodeVarint(e.y));
      parts.push(encodeVarint(e.rotation));
      parts.push(encodeVarint(e.linesCleared));
      const flags = (e.isTSpin ? 1 : 0) | (e.isMini ? 2 : 0);
      parts.push(new Uint8Array([flags]));
      break;
    }
    
    case Op.KF: {
      const e = event as V4KeyframeEvent;
      const json = JSON.stringify({
        board: e.board,
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
      parts.push(new TextEncoder().encode(e.reason));
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
  if (offset >= data.length) return [null, offset];
  
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
        return [{ type: Op.INPUT, timestamp, action, success }, pos];
      }
      
      case Op.LOCK: {
        const pieceType = String.fromCharCode(data[pos++]);
        const [x, pos2] = decodeVarint(data, pos);
        const [y, pos3] = decodeVarint(data, pos2);
        const [rotation, pos4] = decodeVarint(data, pos3);
        const [linesCleared, pos5] = decodeVarint(data, pos4);
        const flags = data[pos5];
        const pos6 = pos5 + 1;
        return [{
          type: Op.LOCK,
          timestamp,
          pieceType,
          x,
          y,
          rotation,
          linesCleared,
          isTSpin: (flags & 1) !== 0,
          isMini: (flags & 2) !== 0
        }, pos6];
      }
      
      case Op.KF: {
        const [jsonLen, pos2] = decodeVarint(data, pos);
        const jsonBytes = data.slice(pos2, pos2 + jsonLen);
        const json = JSON.parse(new TextDecoder().decode(jsonBytes));
        return [{
          type: Op.KF,
          timestamp,
          board: json.board,
          nextPieces: json.next,
          holdPiece: json.hold,
          score: json.score,
          lines: json.lines,
          level: json.level
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
        const reasonBytes: number[] = [];
        while (pos < data.length && data[pos] !== 0) {
          reasonBytes.push(data[pos++]);
        }
        const reason = new TextDecoder().decode(new Uint8Array(reasonBytes));
        return [{
          type: Op.END,
          timestamp,
          reason: reason as any
        }, pos];
      }
      
      default:
        console.warn(`Unknown opcode: ${opcode}`);
        return [null, pos];
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
  for (const event of replay.events) {
    eventBlocks.push(encodeEvent(event));
  }
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
    let pos = 0;
    
    // Check magic
    if (data.slice(pos, pos + 4).toString() !== MAGIC.toString()) {
      console.error('Invalid magic bytes');
      return null;
    }
    pos += 4;
    
    // Check version
    const version = data[pos++];
    if (version !== VERSION) {
      console.error(`Unsupported version: ${version}`);
      return null;
    }
    
    // Decode header
    const [headerSize, pos1] = decodeVarint(data, pos);
    pos = pos1;
    const headerBytes = data.slice(pos, pos + headerSize);
    pos += headerSize;
    const header = JSON.parse(new TextDecoder().decode(headerBytes));
    
    // Decode events
    const [eventCount, pos2] = decodeVarint(data, pos);
    pos = pos2;
    
    const events: V4Event[] = [];
    for (let i = 0; i < eventCount; i++) {
      const [event, nextPos] = decodeEvent(data, pos);
      if (event) {
        events.push(event);
      }
      pos = nextPos;
    }
    
    // Read checksum (last 16 bytes of hex string)
    const checksumBytes = data.slice(pos, pos + 16);
    const storedChecksum = new TextDecoder().decode(checksumBytes);
    
    // Verify checksum
    const dataForChecksum = data.slice(9, pos);  // From header to end of events
    const calculatedChecksum = await calculateChecksum(dataForChecksum);
    
    if (storedChecksum !== calculatedChecksum) {
      console.warn('Checksum mismatch - data may be corrupted');
    }
    
    return {
      version: '4.0',
      metadata: header.metadata,
      events,
      stats: header.stats,
      checksum: storedChecksum
    };
  } catch (err) {
    console.error('V4 decode error:', err);
    return null;
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
    keyframeCount: 0
  };
  
  // Count events
  for (const event of replay.events) {
    switch (event.type) {
      case Op.SPAWN: stats.spawnCount++; break;
      case Op.INPUT: stats.inputCount++; break;
      case Op.LOCK: stats.lockCount++; break;
      case Op.KF: stats.keyframeCount++; break;
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
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}
