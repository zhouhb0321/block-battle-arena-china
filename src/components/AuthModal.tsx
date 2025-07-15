
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
  const [isLogin, setIsLogin] = useState(true);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('请填写邮箱和密码');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast.success('登录成功！');
        // 延迟关闭，确保状态更新完成
        setTimeout(() => {
          onClose();
        }, 100);
      } else {
        if (!username) {
          toast.error('请填写用户名');
          setLoading(false);
          return;
        }
        await register(email, password, username);
        toast.success('注册成功！');
        setTimeout(() => {
          onClose();
        }, 100);
      }
    } catch (error: any) {
      console.error('Authentication failed:', error);
      if (error.message.includes('Invalid login credentials')) {
        toast.error('邮箱或密码错误');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('请先验证邮箱');
      } else if (error.message.includes('User already registered')) {
        toast.error('用户已存在');
      } else {
        toast.error(error.message || '操作失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      await loginAsGuest();
      onClose();
    } catch (error: any) {
      console.error('Guest login failed:', error);
      toast.error('游客登录失败');
    } finally {
      setLoading(false);
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
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isLogin ? '登录' : '注册'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isLogin ? '登录您的账户开始游戏' : '创建新账户'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {!isLogin && (
            <div className="grid gap-2">
              <label htmlFor="username" className="text-foreground">用户名</label>
              <Input
                id="username"
                placeholder="请输入用户名"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background border-border text-foreground"
              />
            </div>
          )}
          <div className="grid gap-2">
            <label htmlFor="email" className="text-foreground">邮箱</label>
            <Input
              id="email"
              placeholder="请输入邮箱地址"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="password" className="text-foreground">密码</label>
            <Input
              id="password"
              placeholder="请输入密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
          <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </Button>
        </form>
        
        {isLogin && (
          <div className="text-center">
            <button 
              type="button" 
              className="text-sm text-primary hover:text-primary/80 underline"
              onClick={() => setShowPasswordReset(true)}
            >
              忘记密码？
            </button>
          </div>
        )}
        
        <div className="border-t border-border py-4">
          <Button 
            type="button" 
            onClick={handleGuestLogin} 
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" 
            variant="outline"
            disabled={loading}
          >
            {loading ? '处理中...' : '游客登录'}
          </Button>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            以游客身份快速开始游戏
          </p>
        </div>
        
        <div className="text-center">
          <button 
            type="button" 
            className="text-sm text-muted-foreground hover:text-foreground" 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? '还没有账户？立即注册' : '已有账户？立即登录'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
