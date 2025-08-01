-- Phase 1: Fix storage bucket permissions for music and wallpapers
-- Make music-files and wallpapers buckets fully public

-- Update music-files bucket to be public
UPDATE storage.buckets SET public = true WHERE id = 'music-files';

-- Update wallpapers bucket to be public  
UPDATE storage.buckets SET public = true WHERE id = 'wallpapers';

-- Create public read policies for anonymous users on music files
CREATE POLICY "Public read access for music files" ON storage.objects
FOR SELECT USING (bucket_id = 'music-files');

-- Create public read access for wallpaper files
CREATE POLICY "Public read access for wallpaper files" ON storage.objects  
FOR SELECT USING (bucket_id = 'wallpapers');

-- Allow authenticated users to upload music files
CREATE POLICY "Authenticated users can upload music files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'music-files' AND auth.role() = 'authenticated');

-- Allow authenticated users to upload wallpaper files  
CREATE POLICY "Authenticated users can upload wallpaper files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'wallpapers' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete music files
CREATE POLICY "Authenticated users can delete music files" ON storage.objects
FOR DELETE USING (bucket_id = 'music-files' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete wallpaper files
CREATE POLICY "Authenticated users can delete wallpaper files" ON storage.objects  
FOR DELETE USING (bucket_id = 'wallpapers' AND auth.role() = 'authenticated');