import { supabase } from '@/integrations/supabase/client';

export const checkAdminPermission = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  return data?.role === 'admin';
};

export const logAdManagementAction = async (
  adminId: string,
  action: string,
  adId: string,
  details: any
): Promise<void> => {
  await supabase.from('ad_management_logs').insert({
    admin_id: adminId,
    action,
    ad_id: adId,
    details
  });
};
