
-- 为 advertisements 表添加缺失的 region 和 language 字段
ALTER TABLE public.advertisements 
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS language TEXT;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_advertisements_region ON public.advertisements(region);
CREATE INDEX IF NOT EXISTS idx_advertisements_language ON public.advertisements(language);
