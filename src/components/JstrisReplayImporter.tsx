import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { convertJstrisToV4 } from '@/utils/jstrisConverter';
import { V4ReplayData } from '@/utils/replayV4/types';

interface JstrisReplayImporterProps {
  onImportSuccess: (replayData: V4ReplayData) => void;
}

export const JstrisReplayImporter: React.FC<JstrisReplayImporterProps> = ({ onImportSuccess }) => {
  const [jstrisUrl, setJstrisUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const { toast } = useToast();

  const isEncodedData = (input: string): boolean => {
    // Check if input looks like base64/encoded replay data (starts with N4Ig or similar patterns)
    const trimmed = input.trim();
    return trimmed.length > 100 && /^[A-Za-z0-9+/=_-]+$/.test(trimmed);
  };

  const extractReplayId = (url: string): string | null => {
    // Support formats:
    // https://jstris.jezevec10.com/replay/820350
    // https://jstris.jezevec10.com/replay/820350?u=username
    // 820350
    const match = url.match(/replay\/(\d+)/);
    if (match) return match[1];
    if (/^\d+$/.test(url.trim())) return url.trim();
    return null;
  };

  const fetchJstrisReplay = async () => {
    setIsLoading(true);
    
    try {
      // Check if input is encoded replay data
      if (isEncodedData(jstrisUrl)) {
        setLoadingStep('步骤 1/2: 解析编码数据...');
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setLoadingStep('步骤 2/2: 转换数据格式...');
        
        // Try to convert the encoded data directly
        const v4Replay = convertJstrisToV4({ encodedData: jstrisUrl }, 'encoded-data');
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        onImportSuccess(v4Replay);
        
        toast({
          title: '✅ 导入成功',
          description: '已导入 Jstris 编码数据'
        });
        
        setJstrisUrl('');
        return;
      }
      
      // Otherwise, treat as URL or replay ID
      const replayId = extractReplayId(jstrisUrl);
      if (!replayId) {
        toast({
          variant: 'destructive',
          title: '无效的 Jstris 输入',
          description: '请输入 Jstris 回放 URL、回放 ID 或粘贴编码数据'
        });
        return;
      }

      setLoadingStep('步骤 1/3: 连接 Jstris 服务器...');
      
      // Call Edge Function to fetch Jstris data
      const { data, error } = await supabase.functions.invoke('fetch-jstris-replay', {
        body: { replayId }
      });

      if (error) {
        throw new Error(error.message || '无法连接到 Jstris 服务器');
      }

      if (!data) {
        throw new Error('Jstris 服务器返回空数据');
      }

      setLoadingStep('步骤 2/3: 下载回放数据...');
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingStep('步骤 3/3: 转换数据格式...');
      
      // Convert to V4 format
      const v4Replay = convertJstrisToV4(data, replayId);
      
      await new Promise(resolve => setTimeout(resolve, 300));

      onImportSuccess(v4Replay);
      
      toast({
        title: '✅ 导入成功',
        description: `已导入 Jstris 回放 #${replayId}`
      });
      
      setJstrisUrl('');
    } catch (error) {
      console.error('Jstris import error:', error);
      
      let userMessage = '导入失败';
      let description = '请检查 Jstris 回放链接是否正确';
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        description = '回放不存在，请检查回放 ID 是否正确';
      } else if (errorMsg.includes('CORS') || errorMsg.includes('cors')) {
        description = 'Jstris 服务器拒绝访问，请稍后重试';
      } else if (errorMsg.includes('format') || errorMsg.includes('convert')) {
        description = '回放数据格式不兼容，无法转换';
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        description = '网络错误，请检查网络连接';
      } else {
        description = errorMsg;
      }
      
      toast({
        variant: 'destructive',
        title: userMessage,
        description
      });
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LinkIcon className="w-5 h-5 text-primary" />
          导入 Jstris 回放
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="粘贴 Jstris URL、回放 ID 或编码数据..."
            value={jstrisUrl}
            onChange={(e) => setJstrisUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && jstrisUrl && fetchJstrisReplay()}
            disabled={isLoading}
            className="flex-1 font-mono text-sm"
          />
          <Button 
            onClick={fetchJstrisReplay} 
            disabled={isLoading || !jstrisUrl}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                导入中
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                导入
              </>
            )}
          </Button>
        </div>
        
        {isLoading && loadingStep && (
          <div className="text-sm text-muted-foreground animate-pulse">
            {loadingStep}
          </div>
        )}
        
        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-semibold">支持以下格式：</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Jstris 回放链接：<code className="bg-muted px-1 rounded">https://jstris.jezevec10.com/replay/820350</code></li>
            <li>回放 ID：<code className="bg-muted px-1 rounded">820350</code></li>
            <li>编码数据：直接粘贴 Jstris 导出的编码字符串</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
