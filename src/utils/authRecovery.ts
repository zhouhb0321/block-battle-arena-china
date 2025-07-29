import { supabase } from '@/integrations/supabase/client';
import { debugLog } from './debugLogger';

export interface AuthRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class AuthRecoveryManager {
  private static instance: AuthRecoveryManager;
  private isRecovering = false;

  static getInstance(): AuthRecoveryManager {
    if (!AuthRecoveryManager.instance) {
      AuthRecoveryManager.instance = new AuthRecoveryManager();
    }
    return AuthRecoveryManager.instance;
  }

  /**
   * 清理所有认证相关的本地存储
   */
  async cleanupAuthStorage(): Promise<void> {
    try {
      debugLog.auth('开始清理认证存储');
      
      // 清理所有已知的认证相关键
      const authKeys = [
        'admin_lockout',
        'admin_mfa_code',
        'admin_session',
        'last_password_reset',
        'supabase.auth.token'
      ];

      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          debugLog.error(`清理localStorage失败: ${key}`, error);
        }
      });

      // 清理所有supabase相关的存储
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        debugLog.error('清理supabase存储失败', error);
      }

      debugLog.auth('认证存储清理完成');
    } catch (error) {
      debugLog.error('认证存储清理过程发生错误', error);
    }
  }

  /**
   * 恢复认证状态，处理网络错误和超时
   */
  async recoverAuthState(options: AuthRecoveryOptions = {}): Promise<boolean> {
    if (this.isRecovering) {
      debugLog.auth('认证恢复已在进行中，跳过');
      return false;
    }

    const {
      maxRetries = 3,
      retryDelay = 2000,
      timeout = 8000
    } = options;

    this.isRecovering = true;

    try {
      debugLog.auth('开始认证状态恢复');

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          debugLog.auth(`认证恢复尝试 ${attempt}/${maxRetries}`);

          // 创建超时Promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('认证状态检查超时')), timeout);
          });

          // 获取当前会话
          const sessionPromise = supabase.auth.getSession();
          const result = await Promise.race([sessionPromise, timeoutPromise]);
          const { data: { session }, error } = result;

          if (error) {
            debugLog.error(`认证状态检查失败 (尝试 ${attempt})`, error);
            if (attempt === maxRetries) {
              throw error;
            }
          } else {
            debugLog.auth('认证状态恢复成功', { hasSession: !!session });
            return !!session;
          }
        } catch (attemptError: any) {
          debugLog.error(`认证恢复尝试 ${attempt} 失败`, attemptError);
          
          if (attempt < maxRetries) {
            debugLog.auth(`等待 ${retryDelay}ms 后重试`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          } else {
            throw attemptError;
          }
        }
      }

      return false;
    } catch (error) {
      debugLog.error('认证状态恢复失败', error);
      return false;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * 强制登出，清理所有状态
   */
  async forceSignOut(): Promise<void> {
    try {
      debugLog.auth('开始强制登出');

      // 清理本地存储
      await this.cleanupAuthStorage();

      // 尝试调用Supabase登出，但不等待结果
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise<void>(resolve => {
        setTimeout(() => resolve(), 3000); // 3秒超时
      });

      try {
        await Promise.race([signOutPromise, timeoutPromise]);
        debugLog.auth('Supabase登出完成');
      } catch (signOutError) {
        debugLog.error('Supabase登出失败，但本地状态已清理', signOutError);
      }

      debugLog.auth('强制登出完成');
    } catch (error) {
      debugLog.error('强制登出过程发生错误', error);
    }
  }

  /**
   * 检查网络连接状态
   */
  async checkNetworkStatus(): Promise<boolean> {
    try {
      // 检查基本网络连接
      if (!navigator.onLine) {
        return false;
      }

      // 尝试发送一个简单的请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      debugLog.error('网络状态检查失败', error);
      return false;
    }
  }

  /**
   * 网络恢复后的认证状态同步
   */
  async syncAuthOnNetworkRecover(): Promise<void> {
    try {
      debugLog.auth('网络恢复，开始同步认证状态');

      const hasNetwork = await this.checkNetworkStatus();
      if (!hasNetwork) {
        debugLog.auth('网络仍不可用，跳过同步');
        return;
      }

      // 尝试恢复认证状态
      await this.recoverAuthState({
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 6000
      });

      debugLog.auth('认证状态同步完成');
    } catch (error) {
      debugLog.error('认证状态同步失败', error);
    }
  }
}

export const authRecoveryManager = AuthRecoveryManager.getInstance();