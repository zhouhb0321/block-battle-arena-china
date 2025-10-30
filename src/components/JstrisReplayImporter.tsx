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
    const replayId = extractReplayId(jstrisUrl);
    if (!replayId) {
      toast({
        variant: 'destructive',
        title: '无效的 Jstris 回放链接',
        description: '请输入完整的 Jstris 回放 URL 或回放 ID（例如：820350）'
      });
      return;
    }

    setIsLoading(true);
    try {
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
            placeholder="粘贴 Jstris 回放链接或 ID（例如：820350）"
            value={jstrisUrl}
            onChange={(e) => setJstrisUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && jstrisUrl && fetchJstrisReplay()}
            disabled={isLoading}
            className="flex-1"
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
        
        <div className="text-sm text-muted-foreground space-y-1">
          <p>支持 Jstris 网站的回放链接，例如：</p>
          <p className="font-mono text-xs bg-muted px-2 py-1 rounded">
            https://jstris.jezevec10.com/replay/820350
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            也可以直接输入回放 ID（例如：820350）
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
