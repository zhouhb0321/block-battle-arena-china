interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  exponentialBackoff?: boolean;
}

export const retryAuthOperation = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const { maxRetries = 1, delay = 800, exponentialBackoff = true } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      // Don't retry on certain errors
      if (
        error?.message?.includes('Invalid login credentials') ||
        error?.message?.includes('邮箱或密码错误') ||
        error?.message?.includes('Email not confirmed') ||
        error?.message?.includes('请先验证邮箱') ||
        error?.message?.includes('没有管理员权限') ||
        error?.message?.includes('Too many requests') ||
        error?.message?.includes('请求过于频繁')
      ) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay for next attempt
      const nextDelay = exponentialBackoff ? delay * Math.pow(2, attempt) : delay;
      
      console.warn(`认证操作失败 (尝试 ${attempt + 1}/${maxRetries + 1}), ${nextDelay}ms 后重试:`, error?.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, nextDelay));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw new Error('重试机制异常');
};

export const isNetworkError = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || '';
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('超时') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('cors') ||
    error?.code === 'NETWORK_ERROR' ||
    error?.status === 0
  );
};