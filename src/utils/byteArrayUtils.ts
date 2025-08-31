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

    // ArrayBuffer support
    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
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
        
        // Check if hex contains ASCII representation of base64
        if (hex.length > 0 && hex.length % 2 === 0) {
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
          }
          
          // Check if this looks like ASCII base64 (common issue with BYTEA storage)
          const ascii = String.fromCharCode(...bytes);
          if (/^[A-Za-z0-9+/]+=*$/.test(ascii.trim())) {
            console.log('toUint8Array: Detected base64 ASCII in hex, attempting secondary decode');
            try {
              const decodedBase64 = atob(ascii.trim());
              const finalBytes = new Uint8Array(decodedBase64.length);
              for (let i = 0; i < decodedBase64.length; i++) {
                finalBytes[i] = decodedBase64.charCodeAt(i);
              }
              console.log('toUint8Array: Successfully decoded base64 ASCII from hex');
              return finalBytes;
            } catch (e) {
              console.warn('toUint8Array: Failed to decode base64 ASCII, using raw hex bytes');
            }
          }
          
          return bytes;
        }
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

    // Buffer-like object with data array (Node.js Buffer format)
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      return new Uint8Array(data.data);
    }

    // Handle JSON stringified arrays like "[1,2,3]"
    if (typeof data === 'string' && data.startsWith('[') && data.endsWith(']')) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return new Uint8Array(parsed);
        }
      } catch (e) {
        console.warn('toUint8Array: Failed to parse JSON array string');
      }
    }

    // Handle JSON objects that look like {"0":1,"1":2,"2":3,...} 
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data);
      if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
        const maxIndex = Math.max(...keys.map(Number));
        const array = new Array(maxIndex + 1);
        for (const key of keys) {
          array[parseInt(key)] = data[key];
        }
        return new Uint8Array(array);
      }
    }

    console.warn('toUint8Array: Unknown data format, returning empty array', {
      type: typeof data,
      isArray: Array.isArray(data),
      hasData: data && 'data' in data,
      sample: typeof data === 'string' ? data.substring(0, 50) : data
    });
    return new Uint8Array(0);
  } catch (error) {
    console.error('toUint8Array: Error converting data:', error);
    return new Uint8Array(0);
  }
}