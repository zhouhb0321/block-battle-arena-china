
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle, Smartphone, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminAuthProps {
  onAuthenticated: () => void;
}

const AdminAuth: React.FC<AdminAuthProps> = ({ onAuthenticated }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'login' | 'mfa' | 'verified'>('login');
  const [email, setEmail] = useState('admin@tetris.com');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [devMode, setDevMode] = useState(process.env.NODE_ENV === 'development');

  // 检查现有用户登录状态 - 使用角色系统
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.isAdmin) {
        // Verify admin role in database
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
          
        if (roles && roles.length > 0) {
          onAuthenticated();
        }
      }
    };
    
    checkAdminStatus();
  }, [user, onAuthenticated]);

  // 检查是否被锁定
  useEffect(() => {
    const lockoutKey = 'admin_lockout';
    const savedLockout = localStorage.getItem(lockoutKey);
    if (savedLockout) {
      try {
        const lockoutData = JSON.parse(savedLockout);
        // Validate the parsed data structure
        if (lockoutData && typeof lockoutData.until === 'number' && lockoutData.until > 0) {
          if (Date.now() < lockoutData.until) {
            setLockoutTime(lockoutData.until);
          } else {
            localStorage.removeItem(lockoutKey);
          }
        } else {
          console.warn('Invalid lockout data structure');
          localStorage.removeItem(lockoutKey);
        }
      } catch (error) {
        console.error('Failed to parse lockout data:', error);
        localStorage.removeItem(lockoutKey);
      }
    }
  }, []);

  // 锁定倒计时
  useEffect(() => {
    if (lockoutTime) {
      const timer = setInterval(() => {
        if (Date.now() >= lockoutTime) {
          setLockoutTime(null);
          setFailedAttempts(0);
          localStorage.removeItem('admin_lockout');
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handleFailedAttempt = () => {
    const newFailedAttempts = failedAttempts + 1;
    setFailedAttempts(newFailedAttempts);
    
    if (newFailedAttempts >= 3) {
      const lockoutUntil = Date.now() + (30 * 60 * 1000); // 30分钟锁定
      setLockoutTime(lockoutUntil);
      localStorage.setItem('admin_lockout', JSON.stringify({ until: lockoutUntil }));
      setError('登录失败次数过多，账户已被锁定30分钟');
    }
  };

  const generateMFACode = () => {
    // 生成6位数字验证码
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendMFACode = async (userEmail: string) => {
    const code = generateMFACode();
    // 在实际应用中，这里应该发送到用户的邮箱或短信
    // 现在我们存储在localStorage中模拟
    localStorage.setItem('admin_mfa_code', JSON.stringify({
      code,
      email: userEmail,
      expires: Date.now() + (5 * 60 * 1000) // 5分钟有效期
    }));
    
    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('MFA验证码:', code); // 在实际应用中移除此日志
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime) return;
    
    setLoading(true);
    setError('');

    try {
      console.log('尝试管理员登录:', { email, password: password ? '***' : '' });
      
      // Enhanced input validation
      if (!email || !password) {
        throw new Error('请输入邮箱和密码');
      }

      if (password.length < 8) {
        throw new Error('密码长度至少8位');
      }

      // 使用Supabase认证 - 优化超时时间和重试机制
      const authTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('登录超时，请检查网络连接')), 5000); // 进一步降低超时时间
      });

      const authPromise = supabase.auth.signInWithPassword({
        email,
        password
      });

      const authResult = await Promise.race([authPromise, authTimeoutPromise]);

      const { data, error: authError } = authResult;

      console.log('Supabase登录结果:', { data: data?.user?.email, error: authError?.message });

      if (authError) {
        console.error('认证错误:', authError);
        handleFailedAttempt();
        
        // Log security event (don't wait)
        supabase.from('security_events').insert({
          event_type: 'admin_login_failed',
          event_data: { email, error: authError.message },
          user_agent: navigator.userAgent
        }).then(
          () => console.log('安全事件已记录'),
          (err) => console.warn('记录安全事件失败:', err)
        );
        
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('邮箱或密码错误');
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('邮箱未验证，请先验证邮箱');
        } else if (authError.message.includes('Too many requests')) {
          throw new Error('请求过于频繁，请稍后重试');
        } else {
          throw new Error('登录失败，请重试');
        }
      }

      if (data?.user) {
        // 检查用户是否有管理员权限
        const { data: roles, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin');

        if (roleError) {
          console.error('权限查询错误:', roleError);
          throw new Error('权限验证失败，请重试');
        }

        if (!roles || roles.length === 0) {
          handleFailedAttempt();
          await supabase.auth.signOut();
          throw new Error('您没有管理员权限');
        }

        console.log('管理员权限验证成功');
        
        // Log successful admin login with error handling
        try {
          await supabase.from('security_events').insert({
            user_id: data.user.id,
            event_type: 'admin_login_success',
            event_data: { email, devMode },
            user_agent: navigator.userAgent
          });
        } catch (logError) {
          console.warn('记录安全事件失败:', logError);
          // Don't fail the login for logging errors
        }
        
        // 开发模式下跳过MFA验证
        if (devMode) {
          console.log('开发模式：跳过MFA验证');
          setFailedAttempts(0);
          localStorage.removeItem('admin_lockout');
          
          // 设置管理员会话
          const adminSession = {
            email,
            authenticated: true,
            timestamp: Date.now(),
            expires: Date.now() + (4 * 60 * 60 * 1000),
            devMode: true
          };
          localStorage.setItem('admin_session', JSON.stringify(adminSession));
          
          onAuthenticated();
          return;
        }
        
        // 生产模式发送MFA验证码
        try {
          await sendMFACode(email);
          setStep('mfa');
        } catch (mfaError) {
          console.error('MFA发送失败:', mfaError);
          throw new Error('发送验证码失败，请重试');
        }
      } else {
        throw new Error('登录失败，请重试');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登录失败';
      console.error('登录错误:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const savedMFA = localStorage.getItem('admin_mfa_code');
      if (!savedMFA) {
        throw new Error('验证码已过期，请重新登录');
      }

      let mfaData;
      try {
        mfaData = JSON.parse(savedMFA);
        // Validate MFA data structure
        if (!mfaData || 
            typeof mfaData.code !== 'string' || 
            typeof mfaData.email !== 'string' || 
            typeof mfaData.expires !== 'number') {
          throw new Error('Invalid MFA data structure');
        }
      } catch (parseError) {
        console.error('Failed to parse MFA data:', parseError);
        localStorage.removeItem('admin_mfa_code');
        throw new Error('验证码数据无效，请重新登录');
      }

      if (Date.now() > mfaData.expires) {
        localStorage.removeItem('admin_mfa_code');
        throw new Error('验证码已过期，请重新登录');
      }

      if (mfaCode !== mfaData.code) {
        handleFailedAttempt();
        throw new Error('验证码错误');
      }

      // 验证成功
      localStorage.removeItem('admin_mfa_code');
      setFailedAttempts(0);
      localStorage.removeItem('admin_lockout');
      setStep('verified');
      
      // 设置管理员会话
      const adminSession = {
        email,
        authenticated: true,
        timestamp: Date.now(),
        expires: Date.now() + (4 * 60 * 60 * 1000) // 4小时有效期
      };
      localStorage.setItem('admin_session', JSON.stringify(adminSession));
      
      onAuthenticated();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'MFA验证失败';
      console.error('MFA验证错误:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getLockoutTimeRemaining = () => {
    if (!lockoutTime) return '';
    const remaining = Math.ceil((lockoutTime - Date.now()) / 1000 / 60);
    return `${remaining}分钟`;
  };

  if (lockoutTime) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            账户已锁定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              由于多次登录失败，您的账户已被锁定。请在 {getLockoutTimeRemaining()} 后重试。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {step === 'login' ? '管理员登录' : 'MFA验证'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {failedAttempts > 0 && failedAttempts < 3 && (
          <Alert className="mb-4 border-yellow-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              登录失败 {failedAttempts} 次，还有 {3 - failedAttempts} 次机会
            </AlertDescription>
          </Alert>
        )}

        {/* 管理员账户状态提示 */}
        <Alert className="mb-4 border-blue-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-blue-700">
            请使用具有管理员权限的账户登录管理面板
            {devMode && <span className="block text-sm mt-1 text-green-600">开发模式：MFA验证已禁用</span>}
          </AlertDescription>
        </Alert>

        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">管理员邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入管理员邮箱"
                required
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入管理员密码"
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '验证中...' : '登录'}
            </Button>
            
            {devMode && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>开发模式提示：</strong>MFA验证已禁用，登录成功后将直接进入管理面板
                </p>
              </div>
            )}
          </form>
        )}

        {step === 'mfa' && (
          <form onSubmit={handleMFAVerification} className="space-y-4">
            <div className="text-center mb-4">
              <Smartphone className="w-12 h-12 mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-gray-600">
                验证码已生成（开发环境下会在控制台显示），请查看并输入6位数字验证码
              </p>
            </div>
            <div>
              <Label htmlFor="mfaCode">验证码</Label>
              <Input
                id="mfaCode"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="请输入6位验证码"
                maxLength={6}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || mfaCode.length !== 6}>
              {loading ? '验证中...' : '验证'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={() => setStep('login')}
              disabled={loading}
            >
              返回登录
            </Button>
          </form>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">安全提示</span>
          </div>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• 请使用强密码并定期更换</li>
            <li>• 不要在公共设备上登录</li>
            <li>• 登录失败3次将锁定30分钟</li>
            <li>• 会话将在4小时后自动过期</li>
            <li>• 请确保您的账户具有管理员权限</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAuth;
