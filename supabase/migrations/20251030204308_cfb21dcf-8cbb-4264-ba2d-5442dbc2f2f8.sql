-- 扩展 advertisements 表
ALTER TABLE advertisements 
ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS spent DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS frequency_cap INTEGER,
ADD COLUMN IF NOT EXISTS ab_test_group TEXT;

-- 创建广告展示记录表（详细分析）
CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  region TEXT,
  language TEXT,
  device_type TEXT,
  user_agent TEXT,
  ip_address INET,
  session_id TEXT
);

-- 创建广告点击记录表
CREATE TABLE IF NOT EXISTS ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  region TEXT,
  language TEXT,
  device_type TEXT,
  clicked_url TEXT
);

-- 创建广告管理日志表
CREATE TABLE IF NOT EXISTS ad_management_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  action TEXT,
  ad_id UUID,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 创建广告图片存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS 策略 - ad_impressions
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert impressions"
ON ad_impressions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all impressions"
ON ad_impressions FOR SELECT
USING (is_admin(auth.uid()));

-- RLS 策略 - ad_clicks
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert clicks"
ON ad_clicks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all clicks"
ON ad_clicks FOR SELECT
USING (is_admin(auth.uid()));

-- RLS 策略 - ad_management_logs
ALTER TABLE ad_management_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert logs"
ON ad_management_logs FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view logs"
ON ad_management_logs FOR SELECT
USING (is_admin(auth.uid()));

-- RLS 策略 - storage.objects (ad-images bucket)
CREATE POLICY "Admins can upload ad images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-images' AND is_admin(auth.uid()));

CREATE POLICY "Anyone can view ad images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-images');

CREATE POLICY "Admins can delete ad images"
ON storage.objects FOR DELETE
USING (bucket_id = 'ad-images' AND is_admin(auth.uid()));