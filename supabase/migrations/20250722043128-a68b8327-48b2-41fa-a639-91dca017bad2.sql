-- 检查 advertisements 表的当前结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'advertisements' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 为 advertisements 表添加缺失的字段（如果不存在）
ALTER TABLE public.advertisements 
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS language TEXT;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_advertisements_region ON public.advertisements(region);
CREATE INDEX IF NOT EXISTS idx_advertisements_language ON public.advertisements(language);