import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginAsGuest } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t('auth.missing_credentials') || '邮箱和密码不能为空');
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
        toast.success(t('auth.login_success') || '登录成功');
      } else {
        if (!username) {
          toast.error(t('auth.missing_username') || '用户名不能为空');
          return;
        }
        await register(username, email, password);
        toast.success(t('auth.signup_success') || '注册成功');
      }
      onClose();
    } catch (error: any) {
      console.error('Authentication failed:', error);
      toast.error(t('auth.login_failed') || '登录失败，请重试');
    }
  };

  const handleGuestLogin = async () => {
    if (!guestName.trim()) {
      toast.error(t('auth.username_required') || '请输入用户名');
      return;
    }
    
    try {
      loginAsGuest();
      toast.success(t('auth.guest_login_success', { name: guestName }) || `以 ${guestName} 身份进入游戏`);
      onClose();
    } catch (error: any) {
      console.error('Guest login failed:', error);
      toast.error(t('auth.login_failed') || '登录失败，请重试');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isLogin ? (t('auth.login') || "登录") : (t('auth.signup') || "注册")}</DialogTitle>
          <DialogDescription>
            {isLogin ? (t('auth.login_desc') || "登录以继续游戏") : (t('auth.signup_desc') || "注册一个新帐户")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {!isLogin && (
            <div className="grid gap-2">
              <label htmlFor="username">{t('auth.username') || "用户名"}</label>
              <Input
                id="username"
                placeholder={t('auth.username_placeholder') || "输入用户名"}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}
          <div className="grid gap-2">
            <label htmlFor="email">{t('auth.email') || "邮箱"}</label>
            <Input
              id="email"
              placeholder={t('auth.email_placeholder') || "输入邮箱"}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="password">{t('auth.password') || "密码"}</label>
            <Input
              id="password"
              placeholder={t('auth.password_placeholder') || "输入密码"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit">{isLogin ? (t('auth.login') || "登录") : (t('auth.signup') || "注册")}</Button>
        </form>
        <div className="border-t py-4">
          <div className="grid gap-2">
            <label htmlFor="guestname">{t('auth.guest_username') || "游客用户名"}</label>
            <Input
              id="guestname"
              placeholder={t('auth.guest_username_placeholder') || "输入游客用户名"}
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </div>
          <Button type="button" onClick={handleGuestLogin}>{t('auth.guest_login') || "游客登录"}</Button>
        </div>
        <div className="text-center">
          <button type="button" className="text-sm text-gray-500 hover:text-gray-700" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? (t('auth.need_account') || "需要注册一个帐户？") : (t('auth.already_have_account') || "已有帐户？")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
