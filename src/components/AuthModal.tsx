import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
      toast.error(t('auth.fillEmailPassword'));
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await login(email, password);
        if (error) {
          console.error('Login error:', error);
          if (error.message.includes('Invalid login credentials')) {
            toast.error(t('auth.invalidCredentials'));
          } else if (error.message.includes('Email not confirmed')) {
            toast.error(t('auth.verifyEmail'));
          } else if (error.message.includes('timeout') || error.message.includes('fetch')) {
            toast.error(t('auth.networkError'));
          } else if (error.message.includes('Too many requests')) {
            toast.error(t('auth.rateLimited'));
          } else if (error.message.includes('abort')) {
            toast.error(t('auth.requestAborted'));
          } else {
            toast.error(error.message || t('common.failed'));
          }
          return;
        }
        toast.success(t('auth.loginSuccess'));
      } else {
        if (!username) {
          toast.error(t('auth.fillUsername'));
          setLoading(false);
          return;
        }
        const { error } = await register(email, password, username);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error(t('auth.userExists'));
          } else if (error.message.includes('Email not confirmed')) {
            toast.error(t('auth.checkEmailLink'));
          } else {
            toast.error(error.message || t('auth.registerFailed'));
          }
          return;
        }
        toast.success(t('auth.registerSuccess'));
      }
      onClose();
    } catch (error: any) {
      console.error('Authentication failed:', error);
      toast.error(t('auth.networkError'));
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
      toast.error(t('auth.guestLoginFailed'));
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
            {isLogin ? t('auth.login') : t('auth.register')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isLogin ? t('auth.loginDesc') : t('auth.registerDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {!isLogin && (
            <div className="grid gap-2">
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input
                id="username"
                placeholder={t('auth.enterUsername')}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background border-border text-foreground"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              placeholder={t('auth.enterEmail')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              placeholder={t('auth.enterPassword')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>
          <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {loading ? t('auth.processing') : (isLogin ? t('auth.login') : t('auth.register'))}
          </Button>
        </form>
        
        {isLogin && (
          <div className="text-center">
            <button 
              type="button" 
              className="text-sm text-primary hover:text-primary/80 underline"
              onClick={() => setShowPasswordReset(true)}
            >
              {t('auth.forgotPassword')}
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
            {loading ? t('auth.processing') : t('auth.guestLogin')}
          </Button>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {t('auth.guestDescription')}
          </p>
        </div>
        
        <div className="text-center">
          <button 
            type="button" 
            className="text-sm text-muted-foreground hover:text-foreground" 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
