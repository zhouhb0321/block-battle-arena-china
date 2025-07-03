
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
      toast.error(t('auth.missing_credentials'));
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast.success(t('auth.login_success'));
      } else {
        if (!username) {
          toast.error(t('auth.missing_username'));
          setLoading(false);
          return;
        }
        await register(email, password, username);
        toast.success(t('auth.signup_success'));
      }
      onClose();
    } catch (error: any) {
      console.error('Authentication failed:', error);
      if (error.message.includes('Invalid login credentials')) {
        toast.error(t('auth.login_failed'));
      } else if (error.message.includes('Email not confirmed')) {
        toast.error(t('auth.login_failed'));
      } else if (error.message.includes('User already registered')) {
        toast.error(t('auth.login_failed'));
      } else {
        toast.error(error.message || t('auth.login_failed'));
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
      toast.error(t('auth.login_failed'));
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
          <DialogTitle className="text-foreground">{isLogin ? t('auth.login') : t('auth.register')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isLogin ? t('auth.login_desc') : t('auth.register_desc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {!isLogin && (
            <div className="grid gap-2">
              <label htmlFor="username" className="text-foreground">{t('auth.username')}</label>
              <Input
                id="username"
                placeholder={t('auth.username_placeholder')}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background border-border text-foreground"
              />
            </div>
          )}
          <div className="grid gap-2">
            <label htmlFor="email" className="text-foreground">{t('auth.email')}</label>
            <Input
              id="email"
              placeholder={t('auth.email_placeholder')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="password" className="text-foreground">{t('auth.password')}</label>
            <Input
              id="password"
              placeholder={t('auth.password_placeholder')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
          <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {loading ? t('common.loading') : (isLogin ? t('auth.login_button') : t('auth.register_button'))}
          </Button>
        </form>
        
        {isLogin && (
          <div className="text-center">
            <button 
              type="button" 
              className="text-sm text-primary hover:text-primary/80 underline"
              onClick={() => setShowPasswordReset(true)}
            >
              {t('auth.forgot_password')}
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
            {loading ? t('common.loading') : t('auth.guest_login')}
          </Button>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {t('auth.guest_login_success')}
          </p>
        </div>
        
        <div className="text-center">
          <button 
            type="button" 
            className="text-sm text-muted-foreground hover:text-foreground" 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? t('auth.need_account') : t('auth.already_have_account')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
