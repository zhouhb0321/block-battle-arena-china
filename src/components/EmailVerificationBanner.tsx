import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface EmailVerificationBannerProps {
  onClose?: () => void;
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 不显示条件：访客、已验证、已关闭
  if (!user || user.isGuest || dismissed) {
    return null;
  }

  // 检查邮箱是否已验证 (Supabase会在email_confirmed_at字段记录)
  const isEmailVerified = user.email_confirmed_at != null;
  
  if (isEmailVerified) {
    return null;
  }

  const handleResendVerification = async () => {
    if (!user.email) return;
    
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        throw error;
      }

      toast.success('验证邮件已发送，请查收您的邮箱');
    } catch (error: any) {
      console.error('Failed to resend verification email:', error);
      toast.error(error.message || '发送验证邮件失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onClose?.();
  };

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 mb-4">
      <Mail className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <span className="text-amber-800 dark:text-amber-200">
            您的邮箱尚未验证。请查收验证邮件并点击链接完成验证。
          </span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendVerification}
            disabled={sending}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            {sending ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Mail className="w-4 h-4 mr-1" />
            )}
            重新发送
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-amber-600 hover:text-amber-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default EmailVerificationBanner;
