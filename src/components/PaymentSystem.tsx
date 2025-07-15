
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, QrCode, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  qr_code_url?: string;
  is_active: boolean;
}

interface PaymentSystemProps {
  onClose?: () => void;
}

const PaymentSystem: React.FC<PaymentSystemProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      // For now, use mock data since the payment_methods table might not be ready
      const mockMethods: PaymentMethod[] = [
        {
          id: '1',
          name: 'Stripe 支付',
          type: 'stripe',
          is_active: true
        },
        {
          id: '2',
          name: '支付宝扫码',
          type: 'alipay',
          qr_code_url: 'https://via.placeholder.com/200x200?text=Alipay+QR',
          is_active: true
        },
        {
          id: '3',
          name: '易宝支付',
          type: 'yeepay',
          qr_code_url: 'https://via.placeholder.com/200x200?text=YeePay+QR',
          is_active: true
        }
      ];
      setPaymentMethods(mockMethods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const handleStripePayment = async () => {
    if (!user || !amount) return;

    setLoading(true);
    setMessage('');

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: amountInCents,
          currency: 'cny',
          payment_method: 'stripe'
        }
      });

      if (error) throw error;

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setMessage('支付创建失败，请重试');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleQRCodePayment = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setMessage(`请使用${method.name}扫描二维码完成支付`);
    setMessageType('success');
  };

  const renderPaymentMethodCard = (method: PaymentMethod) => {
    const getIcon = () => {
      switch (method.type) {
        case 'stripe':
          return <CreditCard className="h-6 w-6" />;
        case 'alipay':
          return <Smartphone className="h-6 w-6 text-blue-500" />;
        case 'yeepay':
          return <QrCode className="h-6 w-6 text-green-500" />;
        default:
          return <CreditCard className="h-6 w-6" />;
      }
    };

    return (
      <Card key={method.id} className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getIcon()}
              <div>
                <div className="font-medium">{method.name}</div>
                <div className="text-sm text-gray-500">
                  {method.type === 'stripe' && '信用卡/借记卡'}
                  {method.type === 'alipay' && '支付宝扫码'}
                  {method.type === 'yeepay' && '易宝支付'}
                </div>
              </div>
            </div>
            <Badge variant="secondary">可用</Badge>
          </div>
          
          {method.type === 'stripe' ? (
            <Button 
              className="w-full mt-4" 
              onClick={handleStripePayment}
              disabled={loading || !amount}
            >
              {loading ? '处理中...' : '使用Stripe支付'}
            </Button>
          ) : (
            <Button 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => handleQRCodePayment(method)}
              disabled={!amount}
            >
              显示二维码
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              请先登录后再进行支付操作
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            支付系统
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <Label htmlFor="amount">支付金额 (¥)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="请输入支付金额"
                min="0.01"
                step="0.01"
              />
            </div>

            {/* Message Display */}
            {message && (
              <Alert className={messageType === 'error' ? 'border-red-200' : 'border-green-200'}>
                {messageType === 'error' ? 
                  <AlertCircle className="h-4 w-4" /> : 
                  <CheckCircle className="h-4 w-4" />
                }
                <AlertDescription className={messageType === 'error' ? 'text-red-600' : 'text-green-600'}>
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {/* Payment Methods */}
            <div>
              <h3 className="font-medium mb-3">选择支付方式</h3>
              <div className="grid gap-4">
                {paymentMethods.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      暂无可用的支付方式
                    </AlertDescription>
                  </Alert>
                ) : (
                  paymentMethods.map(renderPaymentMethodCard)
                )}
              </div>
            </div>

            {/* QR Code Display */}
            {selectedMethod && selectedMethod.qr_code_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">扫码支付</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <img 
                      src={selectedMethod.qr_code_url} 
                      alt="支付二维码" 
                      className="mx-auto mb-4 max-w-64 max-h-64"
                    />
                    <p className="text-sm text-gray-600">
                      请使用{selectedMethod.name}扫描上方二维码
                    </p>
                    <p className="text-lg font-medium mt-2">
                      支付金额: ¥{amount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Close Button */}
            {onClose && (
              <Button variant="outline" onClick={onClose} className="w-full">
                关闭
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSystem;
