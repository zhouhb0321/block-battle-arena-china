
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from 'sonner';
import PasswordResetForm from './PasswordResetForm';

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
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t('auth.missing_credentials') || '邮箱和密码不能为空');
      return;
    }

    setLoading(true);

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
        toast.success(t('auth.signup_success') || '注册成功！请检查邮箱以激活账户。');
      }
      onClose();
    } catch (error: any) {
      console.error('Authentication failed:', error);
      if (error.message.includes('Invalid login credentials')) {
        toast.error('邮箱或密码错误，请检查后重试');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('请先验证您的邮箱地址');
      } else if (error.message.includes('User already registered')) {
        toast.error('该邮箱已被注册，请直接登录或使用其他邮箱');
      } else {
        toast.error(error.message || (t('auth.login_failed') || '登录失败，请重试'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (!guestName.trim()) {
      toast.error(t('auth.username_required') || '请输入用户名');
      return;
    }
    
    try {
      loginAsGuest();
      toast.success(t('auth.guest_login_success') || '游客登录成功');
      onClose();
    } catch (error: any) {
      console.error('Guest login failed:', error);
      toast.error(t('auth.login_failed') || '登录失败，请重试');
    }
  };

  const handleClose = () => {
    setShowPasswordReset(false);
    onClose();
  };

  if (showPasswordReset) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <PasswordResetForm onBack={() => setShowPasswordReset(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
          <Button type="submit" disabled={loading}>
            {loading ? '处理中...' : (isLogin ? (t('auth.login') || "登录") : (t('auth.signup') || "注册"))}
          </Button>
        </form>
        
        {isLogin && (
          <div className="text-center">
            <button 
              type="button" 
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              onClick={() => setShowPasswordReset(true)}
            >
              忘记密码？
            </button>
          </div>
        )}
        
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
          <Button type="button" onClick={handleGuestLogin} className="w-full mt-2">
            {t('auth.guest_login') || "游客登录"}
          </Button>
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
