
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle, Smartphone } from 'lucide-react';
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

  // 检查现有用户登录状态
  useEffect(() => {
    if (user?.email === 'admin@tetris.com') {
      onAuthenticated();
    }
  }, [user, onAuthenticated]);

  // 检查是否被锁定
  useEffect(() => {
    const lockoutKey = 'admin_lockout';
    const savedLockout = localStorage.getItem(lockoutKey);
    if (savedLockout) {
      try {
        const lockoutData = JSON.parse(savedLockout);
        if (Date.now() < lockoutData.until) {
          setLockoutTime(lockoutData.until);
        } else {
          localStorage.removeItem(lockoutKey);
        }
      } catch {
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
      
      // 验证是否为管理员邮箱
      if (email !== 'admin@tetris.com') {
        throw new Error('无效的管理员账户');
      }

      // 使用Supabase认证
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('Supabase登录结果:', { data: data?.user?.email, error: authError?.message });

      if (authError) {
        console.error('认证错误:', authError);
        handleFailedAttempt();
        
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('用户名或密码错误，请检查密码是否正确');
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('邮箱未验证，请先验证邮箱');
        } else {
          throw new Error(authError.message);
        }
      }

      if (data?.user) {
        console.log('登录成功，准备发送MFA验证码');
        // 发送MFA验证码
        await sendMFACode(email);
        setStep('mfa');
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

      const mfaData = JSON.parse(savedMFA);
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

        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">管理员邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tetris.com"
                required
                disabled
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '验证中...' : '登录'}
            </Button>
            <div className="text-sm text-gray-600 mt-2">
              <p>提示：请确保您已在 Supabase 中设置了 admin@tetris.com 账户的密码</p>
            </div>
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
            <li>• 确保已在Supabase中设置管理员密码</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAuth;
