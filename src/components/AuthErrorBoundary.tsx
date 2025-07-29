import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AuthErrorBoundary捕获到错误:', error, errorInfo);
    
    // Handle specific auth-related errors
    if (error.message?.includes('auth') || 
        error.message?.includes('登录') || 
        error.message?.includes('认证')) {
      
      // Show user-friendly error message
      if (error.message?.includes('网络') || error.message?.includes('timeout')) {
        toast.error('网络连接问题，请检查网络设置');
      } else if (error.message?.includes('权限')) {
        toast.error('权限验证失败，请重新登录');
      } else {
        toast.error('认证系统出现问题，正在尝试恢复...');
      }
      
      // Try to recover by clearing auth state
      try {
        localStorage.removeItem('supabase.auth.token');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (recoveryError) {
        console.error('错误恢复失败:', recoveryError);
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="text-center p-8 bg-black/20 rounded-lg backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">系统暂时遇到问题</h2>
            <p className="text-gray-300 mb-6">我们正在自动恢复，请稍候...</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;