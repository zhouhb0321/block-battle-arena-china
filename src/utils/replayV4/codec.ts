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
      const reasonBytes = new TextEncoder().encode(e.reason);
      parts.push(encodeVarint(reasonBytes.length));
      parts.push(reasonBytes);
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
        const [reasonLen, pos2] = decodeVarint(data, pos);
        const reasonBytes = data.slice(pos2, pos2 + reasonLen);
        const reason = new TextDecoder().decode(reasonBytes);
        return [{
          type: Op.END,
          timestamp,
          reason: reason as any
        }, pos2 + reasonLen];
      }
      
      default:
        console.warn(`Unknown opcode: ${opcode} at offset ${offset - 1}`);
        console.warn(`First 8 bytes from this position:`, 
          Array.from(data.slice(offset - 1, Math.min(offset + 7, data.length)))
            .map(b => `${b}(${String.fromCharCode(b)})`)
            .join(' ')
        );
        // 跳过这个损坏的事件，尝试恢复解码
        const skipBytes = Math.min(64, data.length - pos - 16);
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
    console.log(`[V4 Decoder] Events decoded: ${successfulDecodes} successful, ${failedDecodes} failed, ends at: ${eventEnd}`);
    
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
