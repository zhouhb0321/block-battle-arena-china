import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, ShieldCheck, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  event_data: any;
  ip_address: string | null;
  created_at: string;
}

const SecurityDashboard: React.FC = () => {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityEvents();
  }, []);

  const loadSecurityEvents = async () => {
    if (!user?.isAdmin) return;
    
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSecurityEvents(data || []);
    } catch (error) {
      console.error('Error loading security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    if (eventType.includes('subscribers_access')) {
      return <Eye className="w-4 h-4" />;
    }
    return <Shield className="w-4 h-4" />;
  };

  const getEventTypeBadge = (eventType: string) => {
    if (eventType.includes('subscribers_access')) {
      return <Badge variant="outline" className="text-blue-600">Payment Data Access</Badge>;
    }
    return <Badge variant="secondary">{eventType}</Badge>;
  };

  if (!user?.isAdmin) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-gray-600">Only administrators can access the security dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-600">ACTIVE</div>
              <p className="text-sm text-muted-foreground">Audit Logging</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-600">SECURED</div>
              <p className="text-sm text-muted-foreground">Payment Data</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Shield className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-purple-600">PROTECTED</div>
              <p className="text-sm text-muted-foreground">RLS Policies</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Improvements Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Security Enhancements Applied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Payment Data Protection</AlertTitle>
              <AlertDescription>
                The subscribers table now has enhanced RLS policies that ensure users can only access their own data. 
                Stripe customer IDs and email addresses are protected by multiple security layers.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Audit Logging</AlertTitle>
              <AlertDescription>
                All access to sensitive payment data is now logged for security monitoring. 
                This includes when data is viewed, modified, or deleted.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Data Masking</AlertTitle>
              <AlertDescription>
                Email addresses are automatically masked when displayed, and Stripe customer IDs are abstracted 
                to only show whether a customer has a payment method on file.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Admin Access Only</AlertTitle>
              <AlertDescription>
                Administrative access to all subscription data requires explicit admin privileges 
                and is logged for compliance purposes.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Security Events Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Security Events</CardTitle>
          <Button onClick={loadSecurityEvents} variant="outline" size="sm">
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading security events...</div>
          ) : securityEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No security events recorded yet
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getEventTypeIcon(event.event_type)}
                    <div>
                      <div className="flex items-center gap-2">
                        {getEventTypeBadge(event.event_type)}
                        <span className="text-sm text-gray-500">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        User: {event.user_id ? event.user_id.slice(0, 8) + '...' : 'Anonymous'} | 
                        IP: {event.ip_address || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remaining Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Additional Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Auth OTP Expiry</AlertTitle>
              <AlertDescription>
                Consider reducing OTP expiry time in Supabase auth settings for better security.
                <a 
                  href="https://supabase.com/docs/guides/platform/going-into-prod#security" 
                  target="_blank" 
                  className="ml-2 text-blue-600 hover:underline"
                >
                  Learn more →
                </a>
              </AlertDescription>
            </Alert>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Password Protection</AlertTitle>
              <AlertDescription>
                Enable leaked password protection in Supabase auth settings to prevent compromised passwords.
                <a 
                  href="https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection" 
                  target="_blank" 
                  className="ml-2 text-blue-600 hover:underline"
                >
                  Configure →
                </a>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;