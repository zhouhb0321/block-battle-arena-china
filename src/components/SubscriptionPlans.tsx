
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Check, Star, Zap, Crown } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
}

const SubscriptionPlans: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState<string | null>(null);

  const plans: PricingPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 4.99,
      currency: 'USD',
      interval: 'month',
      icon: <Star className="w-6 h-6" />,
      features: [
        'Ad-free gaming',
        'Basic statistics',
        'Standard themes',
        'Email support'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 9.99,
      currency: 'USD',
      interval: 'month',
      popular: true,
      icon: <Zap className="w-6 h-6" />,
      features: [
        'All Basic features',
        'Advanced statistics',
        'Premium themes & skins',
        'Unlimited replays',
        'Priority support',
        'Custom keybindings'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 19.99,
      currency: 'USD',
      interval: 'month',
      icon: <Crown className="w-6 h-6" />,
      features: [
        'All Premium features',
        'Tournament access',
        'Detailed analytics',
        'Custom game modes',
        'API access',
        'White-label options'
      ]
    }
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      alert('Please sign in to subscribe');
      return;
    }

    setLoading(planId);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId }
      });

      if (error) throw error;

      if (data?.url) {
        // 在新标签页中打开Stripe Checkout
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription process. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t('premium')} Plans</h2>
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>
          <p className="text-muted-foreground mt-2">
            Unlock premium features and enhance your Tetris experience
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-2 text-primary">
                    {plan.icon}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    ${plan.price}
                    <span className="text-base font-normal text-muted-foreground">
                      /{plan.interval}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={loading === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {loading === plan.id ? 'Processing...' : `${t('subscribe')} to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>All plans include a 7-day free trial. Cancel anytime.</p>
            <p>Secure payment processing by Stripe.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
