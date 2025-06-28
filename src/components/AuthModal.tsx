
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
  const { loginAsGuest } = useAuth();
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
      toast.error(t('auth.enter_email_password') || '请输入邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      console.log('开始登录...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });

      if (error) {
        console.error('登录错误:', error);
        throw error;
      }

      if (data?.user) {
        console.log('登录成功，用户:', data.user.email);
        toast.success(t('auth.login_success') || '登录成功！');
        
        setLoginForm({ email: '', password: '' });
        onClose();
      } else {
        throw new Error(t('auth.login_failed_no_user') || '登录失败，未返回用户信息');
      }
      
    } catch (error: any) {
      console.error('登录错误详情:', error);
      let errorMessage = t('auth.login_failed') || '登录失败';
      
      if (error?.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = t('auth.invalid_credentials') || '邮箱或密码错误，请检查输入';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = t('auth.email_not_confirmed') || '请先验证您的邮箱后再登录';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = t('auth.too_many_requests') || '登录尝试过于频繁，请稍后重试';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = t('auth.invalid_email') || '邮箱格式不正确';
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
      toast.error(t('auth.fill_required_fields') || '请填写所有必填字段');
      return;
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error(t('auth.password_mismatch') || '密码不匹配');
      return;
    }
    
    if (registerForm.password.length < 6) {
      toast.error(t('auth.password_min_length') || '密码至少需要6位字符');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            username: registerForm.username
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        throw error;
      }

      toast.success(t('auth.register_success') || '注册成功！请查收邮箱验证邮件');
      
      setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
      onClose();
    } catch (error: any) {
      console.error('注册错误:', error);
      let errorMessage = t('auth.register_failed') || '注册失败';
      
      if (error?.message) {
        if (error.message.includes('User already registered')) {
          errorMessage = t('auth.email_already_registered') || '该邮箱已被注册，请使用其他邮箱或尝试登录';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = t('auth.invalid_email') || '邮箱格式不正确';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = t('auth.password_min_length') || '密码至少需要6位字符';
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
      toast.error(t('auth.enter_email') || '请输入邮箱地址');
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

      toast.success(t('auth.reset_email_sent') || '密码重置邮件已发送，请查收邮箱');
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('密码重置错误:', error);
      const errorMessage = error?.message || (t('auth.reset_email_failed') || '发送重置邮件失败');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    if (!guestName.trim()) {
      toast.error(t('auth.enter_guest_name') || '请输入游客名称');
      return;
    }
    
    try {
      loginAsGuest(); // 修复：移除多余的参数
      toast.success(t('auth.guest_login_success', { name: guestName }) || `以 ${guestName} 身份进入游戏`);
      onClose();
    } catch (error: any) {
      console.error('游客登录错误:', error);
      toast.error(t('auth.guest_login_failed') || '游客登录失败，请重试');
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      // Reset forms when modal opens
      setLoginForm({ email: '', password: '' });
      setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
      setShowForgotPassword(false);
      setLoading(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">{t('game.title') || '方块竞技场'}</DialogTitle>
        </DialogHeader>
        
        {showForgotPassword ? (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{t('auth.reset_password') || '重置密码'}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.reset_password_desc') || '输入您的邮箱地址，我们将发送密码重置链接'}</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="forgotEmail">{t('auth.email') || '邮箱地址'}</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder={t('auth.enter_email') || '请输入您的邮箱'}
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (t('auth.sending') || '发送中...') : (t('auth.send_reset_email') || '发送重置邮件')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForgotPassword(false)}
                  disabled={loading}
                >
                  {t('common.cancel') || '取消'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <Tabs defaultValue="guest" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="guest">{t('auth.guest') || '游客'}</TabsTrigger>
              <TabsTrigger value="login">{t('auth.login') || '登录'}</TabsTrigger>
              <TabsTrigger value="register">{t('auth.register') || '注册'}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="guest" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">{t('auth.quick_start') || '快速开始游戏，无需注册'}</p>
                <div>
                  <Label htmlFor="guestName">{t('auth.guest_name') || '游客名称'}</Label>
                  <Input
                    id="guestName"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="text-center"
                    disabled={loading}
                    placeholder={t('auth.enter_guest_name') || '输入游客名称'}
                  />
                </div>
                <Button onClick={handleGuestLogin} className="w-full" disabled={loading || !guestName.trim()}>
                  {loading ? (t('auth.logging_in') || '登录中...') : (t('common.start_game') || '开始游戏')}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t('auth.register_benefits') || '注册用户可以参与排名和保存游戏记录'}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">{t('auth.email') || '邮箱'}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder={t('auth.enter_email') || '请输入邮箱'}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="password">{t('auth.password') || '密码'}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder={t('auth.enter_password') || '请输入密码'}
                    autoComplete="current-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !loginForm.email || !loginForm.password}
                >
                  {loading ? (t('auth.logging_in') || '登录中...') : (t('auth.login') || '登录')}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm"
                    onClick={() => setShowForgotPassword(true)}
                    disabled={loading}
                  >
                    {t('auth.forgot_password') || '忘记密码？'}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="username">{t('auth.username') || '用户名'}</Label>
                  <Input
                    id="username"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder={t('auth.enter_username') || '请输入用户名'}
                    autoComplete="username"
                  />
                </div>
                <div>
                  <Label htmlFor="regEmail">{t('auth.email') || '邮箱'}</Label>
                  <Input
                    id="regEmail"
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder={t('auth.enter_email') || '请输入邮箱'}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="regPassword">{t('auth.password') || '密码'}</Label>
                  <Input
                    id="regPassword"
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder={t('auth.password_min_chars') || '至少6位字符'}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">{t('auth.confirm_password') || '确认密码'}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    disabled={loading}
                    placeholder={t('auth.enter_password_again') || '再次输入密码'}
                    autoComplete="new-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !registerForm.username || !registerForm.email || !registerForm.password || !registerForm.confirmPassword}
                >
                  {loading ? (t('auth.registering') || '注册中...') : (t('auth.register') || '注册')}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t('auth.verification_email_note') || '注册后将发送验证邮件到您的邮箱'}
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
