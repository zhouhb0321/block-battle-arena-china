export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  lastChecked: number;
}

export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private status: NetworkStatus = {
    isOnline: navigator.onLine,
    lastChecked: Date.now()
  };
  private listeners: Array<(status: NetworkStatus) => void> = [];

  private constructor() {
    this.setupEventListeners();
    this.startPeriodicCheck();
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.updateStatus({ isOnline: true, lastChecked: Date.now() });
    });

    window.addEventListener('offline', () => {
      this.updateStatus({ isOnline: false, lastChecked: Date.now() });
    });

    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.updateStatus({
          isOnline: navigator.onLine,
          connectionType: connection.effectiveType,
          lastChecked: Date.now()
        });
      });
    }
  }

  private startPeriodicCheck() {
    setInterval(async () => {
      const isOnline = await this.checkConnectivity();
      this.updateStatus({
        isOnline,
        lastChecked: Date.now()
      });
    }, 120000); // Check every 2 minutes instead of 30 seconds
  }

  private async checkConnectivity(): Promise<boolean> {
    try {
      // Try to fetch a small resource with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private updateStatus(newStatus: Partial<NetworkStatus>) {
    this.status = { ...this.status, ...newStatus };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('Network status listener error:', error);
      }
    });
  }

  public getStatus(): NetworkStatus {
    return { ...this.status };
  }

  public addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public async testConnection(): Promise<boolean> {
    const isOnline = await this.checkConnectivity();
    this.updateStatus({ isOnline, lastChecked: Date.now() });
    return isOnline;
  }
}

export const networkMonitor = NetworkMonitor.getInstance();

// Network error utilities
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const errorTypes = [
    'network',
    'fetch',
    'timeout',
    'connection',
    'cors',
    'err_network',
    'err_connection',
    'err_failed',
    'failed to fetch'
  ];
  
  return errorTypes.some(type => message.includes(type));
};

export const getNetworkErrorMessage = (error: any): string => {
  if (!error) return '未知网络错误';
  
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('timeout') || message.includes('超时')) {
    return '网络连接超时，请检查网络后重试';
  } else if (message.includes('cors')) {
    return '网络配置错误，请刷新页面重试';
  } else if (message.includes('failed to fetch') || message.includes('network')) {
    return '网络连接失败，请检查网络设置';
  } else if (message.includes('connection')) {
    return '连接失败，请检查网络连接';
  } else {
    return '网络错误，请稍后重试';
  }
};

export const withNetworkRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 800
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 为每个操作添加超时控制
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('操作超时')), 5000); // 5秒超时
      });
      
      const operationPromise = operation();
      return await Promise.race([operationPromise, timeoutPromise]);
    } catch (error) {
      lastError = error;
      
      // 不重试认证相关的错误
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message).toLowerCase();
        if (message.includes('invalid login') || 
            message.includes('email not confirmed') ||
            message.includes('too many requests')) {
          throw error;
        }
      }
      
      if (!isNetworkError(error) || attempt === maxRetries) {
        throw error;
      }
      
      // 优化重试间隔
      const retryDelay = Math.min(delay * Math.pow(1.5, attempt - 1), 3000);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw lastError;
};