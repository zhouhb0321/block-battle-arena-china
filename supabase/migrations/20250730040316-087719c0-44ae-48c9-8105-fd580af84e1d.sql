-- 创建音乐文件存储桶
INSERT INTO storage.buckets (id, name, public) 
VALUES ('music-files', 'music-files', true);

-- 创建壁纸存储桶  
INSERT INTO storage.buckets (id, name, public)
VALUES ('wallpapers', 'wallpapers', true);

-- 为音乐文件存储桶创建策略
CREATE POLICY "Anyone can view music files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'music-files');

CREATE POLICY "Admins can upload music files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'music-files' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update music files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'music-files' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete music files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'music-files' AND is_admin(auth.uid()));

-- 为壁纸存储桶创建策略
CREATE POLICY "Anyone can view wallpapers" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'wallpapers');

CREATE POLICY "Admins can upload wallpapers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'wallpapers' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update wallpapers" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'wallpapers' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete wallpapers" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'wallpapers' AND is_admin(auth.uid()));