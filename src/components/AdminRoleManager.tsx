import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Shield, Users, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  granted_at: string;
  user_profile?: {
    username: string;
    email: string;
  };
}

const AdminRoleManager: React.FC = () => {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator' | 'user'>('user');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    try {
      setLoading(true);
      
      // Get all users with their roles
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          granted_at,
          user_profiles!inner(username, email)
        `)
        .order('granted_at', { ascending: false });

      if (error) throw error;

      setUsers(rolesData || []);
    } catch (error) {
      console.error('Failed to load user roles:', error);
      setError('Failed to load user roles');
    } finally {
      setLoading(false);
    }
  };

  const grantRole = async () => {
    if (!email || !selectedRole) {
      setError('Please enter email and select role');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id, username, email')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Make sure the user has registered first.');
      }

      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userData.id)
        .eq('role', selectedRole)
        .single();

      if (existingRole) {
        throw new Error(`User already has ${selectedRole} role`);
      }

      // Grant the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userData.id,
          role: selectedRole,
          granted_by: user?.id
        });

      if (roleError) throw roleError;

      // Log the role grant
      await supabase.from('security_events').insert({
        user_id: user?.id,
        event_type: 'role_granted',
        event_data: {
          target_user_id: userData.id,
          target_email: email,
          role: selectedRole,
          granted_by: user?.email
        },
        user_agent: navigator.userAgent
      });

      toast({
        title: "Role Granted",
        description: `${selectedRole} role granted to ${email}`,
      });

      setEmail('');
      setSelectedRole('user');
      loadUserRoles();
    } catch (error: any) {
      console.error('Failed to grant role:', error);
      setError(error.message || 'Failed to grant role');
    } finally {
      setLoading(false);
    }
  };

  const revokeRole = async (roleId: string, userEmail: string, role: string) => {
    if (!confirm(`Are you sure you want to revoke ${role} role from ${userEmail}?`)) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      // Log the role revocation
      await supabase.from('security_events').insert({
        user_id: user?.id,
        event_type: 'role_revoked',
        event_data: {
          target_email: userEmail,
          role: role,
          revoked_by: user?.email
        },
        user_agent: navigator.userAgent
      });

      toast({
        title: "Role Revoked",
        description: `${role} role revoked from ${userEmail}`,
      });

      loadUserRoles();
    } catch (error: any) {
      console.error('Failed to revoke role:', error);
      setError(error.message || 'Failed to revoke role');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user?.isAdmin) {
    return (
      <Alert className="border-red-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access role management.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Grant User Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">User Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user email"
                disabled={loading}
              />
            </div>
            <div className="w-40">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantRole} disabled={loading || !email}>
              Grant Role
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading user roles...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users with special roles found</div>
          ) : (
            <div className="space-y-4">
              {users.map((userRole) => (
                <div key={userRole.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">{userRole.user_profile?.username}</div>
                      <div className="text-sm text-gray-500">{userRole.user_profile?.email}</div>
                    </div>
                    <Badge className={`${getRoleBadgeColor(userRole.role)} border-0`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {userRole.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      Granted: {new Date(userRole.granted_at).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revokeRole(
                        userRole.id,
                        userRole.user_profile?.email || '',
                        userRole.role
                      )}
                      disabled={loading}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRoleManager;