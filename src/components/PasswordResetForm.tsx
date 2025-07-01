
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, ArrowLeft } from 'lucide-react';

interface PasswordResetFormProps {
  onBack: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('请输入邮箱地址');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setSent(true);
      toast.success('密码重置邮件已发送，请检查您的邮箱');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error('发送重置邮件失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle>邮件已发送</CardTitle>
          <CardDescription>
            我们已向 {email} 发送了密码重置链接。请检查您的邮箱并点击链接重置密码。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onBack} variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回登录
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>重置密码</CardTitle>
        <CardDescription>
          输入您的邮箱地址，我们将发送密码重置链接给您。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱地址</Label>
            <Input
              id="email"
              type="email"
              placeholder="输入您的邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '发送中...' : '发送重置链接'}
          </Button>
          
          <Button type="button" onClick={onBack} variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回登录
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PasswordResetForm;
