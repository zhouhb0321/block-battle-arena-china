
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginAsGuest } = useAuth();
  const { t } = useLanguage();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [guestName, setGuestName] = useState(`Guest-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('登录表单提交:', { email: loginForm.email, hasPassword: !!loginForm.password });
    
    if (!loginForm.email || !loginForm.password) {
      toast.error('请输入邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      console.log('开始登录...');
      await login(loginForm.email, loginForm.password);
      console.log('登录成功');
      toast.success('登录成功！');
      
      // Clear form and close modal
      setLoginForm({ email: '', password: '' });
      onClose();
    } catch (error: any) {
      console.error('登录错误:', error);
      let errorMessage = '登录失败';
      
      if (error?.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = '邮箱或密码错误，请检查输入';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '请先验证您的邮箱后再登录';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = '登录尝试过于频繁，请稍后重试';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = '邮箱格式不正确';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerForm.username || !registerForm.email || !registerForm.password) {
      toast.error('请填写所有必填字段');
      return;
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('密码不匹配');
      return;
    }
    
    if (registerForm.password.length < 6) {
      toast.error('密码至少需要6位字符');
      return;
    }

    setLoading(true);
    try {
      await register(registerForm.username, registerForm.email, registerForm.password);
      toast.success('注册成功！请查收邮箱验证邮件');
      
      // Clear form and close modal
      setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
      onClose();
    } catch (error: any) {
      console.error('注册错误:', error);
      let errorMessage = '注册失败';
      
      if (error?.message) {
        if (error.message.includes('User already registered')) {
          errorMessage = '该邮箱已被注册，请使用其他邮箱或尝试登录';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = '邮箱格式不正确';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = '密码至少需要6位字符';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast.error('请输入邮箱地址');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }

      toast.success('密码重置邮件已发送，请查收邮箱');
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('密码重置错误:', error);
      const errorMessage = error?.message || '发送重置邮件失败';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    if (!guestName.trim()) {
      toast.error('请输入游客名称');
      return;
    }
    
    try {
      loginAsGuest();
      toast.success(`以 ${guestName} 身份进入游戏`);
      onClose();
    } catch (error: any) {
      console.error('游客登录错误:', error);
      toast.error('游客登录失败，请重试');
    }
  };

  // Close modal on successful authentication
  React.useEffect(() => {
    if (isOpen) {
      // Reset forms when modal opens
      setLoginForm({ email: '', password: '' });
      setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
      setShowForgotPassword(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">{t('game.title')}</DialogTitle>
        </DialogHeader>
        
        {showForgotPassword ? (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">重置密码</h3>
              <p className="text-sm text-muted-foreground">输入您的邮箱地址，我们将发送密码重置链接</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="forgotEmail">邮箱地址</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="请输入您的邮箱"
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? '发送中...' : '发送重置邮件'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForgotPassword(false)}
                  disabled={loading}
                >
                  取消
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <Tabs defaultValue="guest" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="guest">{t('auth.guest')}</TabsTrigger>
              <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
              <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="guest" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">快速开始游戏，无需注册</p>
                <div>
                  <Label htmlFor="guestName">游客名称</Label>
                  <Input
                    id="guestName"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="text-center"
                    disabled={loading}
                    placeholder="输入游客名称"
                  />
                </div>
                <Button onClick={handleGuestLogin} className="w-full" disabled={loading || !guestName.trim()}>
                  {loading ? '登录中...' : '开始游戏'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  注册用户可以参与排名和保存游戏记录
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder="请输入邮箱"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !loginForm.email || !loginForm.password}
                >
                  {loading ? '登录中...' : t('auth.login')}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm"
                    onClick={() => setShowForgotPassword(true)}
                    disabled={loading}
                  >
                    忘记密码？
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="username">{t('auth.username')}</Label>
                  <Input
                    id="username"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder="请输入用户名"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <Label htmlFor="regEmail">{t('auth.email')}</Label>
                  <Input
                    id="regEmail"
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder="请输入邮箱"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="regPassword">{t('auth.password')}</Label>
                  <Input
                    id="regPassword"
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder="至少6位字符"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">确认密码</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !registerForm.username || !registerForm.email || !registerForm.password || !registerForm.confirmPassword}
                >
                  {loading ? '注册中...' : t('auth.register')}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  注册后将发送验证邮件到您的邮箱
                </p>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
