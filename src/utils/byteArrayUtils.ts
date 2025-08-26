/**
 * Utility function to convert various BYTEA data formats from Supabase to Uint8Array
 * Handles hex strings, base64 strings, arrays, and existing Uint8Array objects
 */
export function toUint8Array(data: any): Uint8Array {
  if (!data) {
    console.warn('toUint8Array: Received null/undefined data');
    return new Uint8Array(0);
  }

  try {
    // Already a Uint8Array
    if (data instanceof Uint8Array) {
      return data;
    }

    // Regular array of numbers
    if (Array.isArray(data)) {
      return new Uint8Array(data);
    }

    // String data - could be hex or base64
    if (typeof data === 'string') {
      // Try hex format first (PostgreSQL BYTEA default)
      if (data.startsWith('\\x')) {
        const hex = data.slice(2);
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
      }
      
      // Try base64 format
      try {
        const bstr = atob(data);
        const arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
          arr[i] = bstr.charCodeAt(i);
        }
        return arr;
      } catch (e) {
        console.warn('toUint8Array: Failed to decode as base64, trying raw string');
        const arr = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          arr[i] = data.charCodeAt(i);
        }
        return arr;
      }
    }

    // Buffer-like object
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      return new Uint8Array(data.data);
    }

    console.warn('toUint8Array: Unknown data format, returning empty array', typeof data);
    return new Uint8Array(0);
  } catch (error) {
    console.error('toUint8Array: Error converting data:', error);
    return new Uint8Array(0);
  }
}