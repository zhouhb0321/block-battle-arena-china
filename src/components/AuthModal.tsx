
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginAsGuest } = useAuth();
  const { t } = useLanguage();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [guestName, setGuestName] = useState(`Guest-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginForm.email, loginForm.password);
      toast.success('登录成功！');
      onClose();
    } catch (error) {
      toast.error('登录失败，请检查邮箱和密码');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('密码不匹配');
      return;
    }
    try {
      await register(registerForm.username, registerForm.email, registerForm.password);
      toast.success('注册成功！请查收邮箱验证邮件');
      onClose();
    } catch (error) {
      toast.error('注册失败，请稍后重试');
    }
  };

  const handleGuestLogin = () => {
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
                />
              </div>
              <Button onClick={handleGuestLogin} className="w-full">
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
                />
              </div>
              <Button type="submit" className="w-full">
                {t('auth.login')}
              </Button>
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
                />
              </div>
              <Button type="submit" className="w-full">
                {t('auth.register')}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                注册后将发送验证邮件到您的邮箱
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
