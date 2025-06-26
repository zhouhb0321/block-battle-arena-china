
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
    if (!loginForm.email || !loginForm.password) {
      toast.error('请输入邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success('登录成功！');
      onClose();
    } catch (error) {
      console.error('登录错误:', error);
      const errorMessage = error instanceof Error ? error.message : '登录失败';
      if (errorMessage.includes('Invalid login credentials')) {
        toast.error('邮箱或密码错误，请检查输入');
      } else if (errorMessage.includes('Email not confirmed')) {
        toast.error('请先验证您的邮箱后再登录');
      } else {
        toast.error('登录失败：' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
      onClose();
    } catch (error) {
      console.error('注册错误:', error);
      const errorMessage = error instanceof Error ? error.message : '注册失败';
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
    } catch (error) {
      console.error('密码重置错误:', error);
      const errorMessage = error instanceof Error ? error.message : '发送重置邮件失败';
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
    loginAsGuest();
    toast.success(`以 ${guestName} 身份进入游戏`);
    onClose();
  };

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
                  />
                </div>
                <Button onClick={handleGuestLogin} className="w-full" disabled={loading}>
                  开始游戏
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
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
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
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
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
