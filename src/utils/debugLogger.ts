
// 安全的调试日志工具 - 自动过滤敏感信息
interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

// 敏感信息过滤规则
const SENSITIVE_PATTERNS = [
  /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // 邮箱
  /password/i,
  /token/i,
  /key/i,
  /secret/i,
  /auth/i
];

// 过滤敏感信息
const sanitizeData = (data: any): any => {
  if (typeof data === 'string') {
    let sanitized = data;
    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    return sanitized;
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};
    
    for (const key in data) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_PATTERNS.some(pattern => pattern.test(lowerKey))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(data[key]);
      }
    }
    return sanitized;
  }
  
  return data;
};

// 安全日志函数
export const debugLog = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data ? sanitizeData(data) : '');
    }
  },
  
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data ? sanitizeData(data) : '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data ? sanitizeData(data) : '');
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? sanitizeData(error) : '');
  },
  
  // 游戏专用日志
  game: (action: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GAME] ${action}`, data ? sanitizeData(data) : '');
    }
  },
  
  // 认证专用日志
  auth: (action: string, data?: any) => {
    console.log(`[AUTH] ${action}`, data ? sanitizeData(data) : '');
  }
};
