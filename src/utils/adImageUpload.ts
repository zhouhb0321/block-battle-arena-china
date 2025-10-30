import { supabase } from '@/integrations/supabase/client';

export const uploadAdImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `ads/${fileName}`;

  const { error } = await supabase.storage
    .from('ad-images')
    .upload(filePath, file);

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('ad-images')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const deleteAdImage = async (imageUrl: string): Promise<void> => {
  const path = imageUrl.split('/ad-images/')[1];
  if (!path) return;

  const { error } = await supabase.storage
    .from('ad-images')
    .remove([`ads/${path}`]);

  if (error) throw error;
};
