import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { ReplayCompressor } from '@/utils/replayCompression';
import { EnhancedReplayPlayer } from './EnhancedReplayPlayer';
import { toUint8Array } from '@/utils/byteArrayUtils';
import type { CompressedReplay } from '@/utils/replayTypes';

interface ReplayImporterProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ReplayImporter: React.FC<ReplayImporterProps> = ({ 
  isOpen: controlledOpen, 
  onClose: controlledOnClose 
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [replayInput, setReplayInput] = useState('');
  const [importedReplay, setImportedReplay] = useState<CompressedReplay | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onClose = controlledOnClose || (() => setInternalOpen(false));

  const parseReplayData = (input: string): CompressedReplay | null => {
    try {
      // 清理输入数据
      const cleanInput = input.trim();
      
      // 尝试解析为JSON格式 (旧格式)
      if (cleanInput.startsWith('{')) {
        const replayData = JSON.parse(cleanInput);
        
        // 转换旧格式为新格式
        if (replayData.actions && Array.isArray(replayData.actions)) {
          const compressed = ReplayCompressor.compressActions(replayData.actions);
          const compressedBytes = ReplayCompressor.encodeToBinary(compressed);
          
          return {
            id: `imported-${Date.now()}`,
            userId: 'imported',
            gameType: 'single' as const,
            gameMode: replayData.gameType || 'sprint40',
            finalScore: replayData.score || 0,
            finalLines: replayData.lines || 0,
            finalLevel: replayData.level || 1,
            durationSeconds: (replayData.duration || 0) / 1000,
            pps: replayData.pps || 0,
            apm: replayData.apm || 0,
            seed: replayData.metadata?.seed || '',
            actionsCount: replayData.actions.length,
            compressedActions: compressedBytes,
            compressionRatio: compressedBytes.length / JSON.stringify(replayData.actions).length,
            version: '2.0',
            isPersonalBest: false,
            isWorldRecord: false,
            isFeatured: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            gameSettings: replayData.metadata?.settings || {},
            initialBoard: replayData.metadata?.initialBoard || Array(20).fill(null).map(() => Array(10).fill(0)),
            checksum: ''
          };
        }
      }
      
      // 尝试解析为Base64格式
      try {
        const bytes = toUint8Array(cleanInput);
        if (bytes.length > 0) {
          const compressed = ReplayCompressor.decodeFromBinary(bytes);
          const actions = ReplayCompressor.decompressActions(compressed);
          
          if (actions.length > 0) {
            return {
              id: `imported-${Date.now()}`,
              userId: 'imported',
              gameType: 'single' as const,
              gameMode: 'unknown',
              finalScore: 0,
              finalLines: 0,
              finalLevel: 1,
              durationSeconds: actions[actions.length - 1]?.timestamp / 1000 || 0,
              pps: 0,
              apm: 0,
              seed: '',
              actionsCount: actions.length,
              compressedActions: bytes,
              compressionRatio: 0,
              version: '2.0',
              isPersonalBest: false,
              isWorldRecord: false,
              isFeatured: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              gameSettings: {},
              initialBoard: Array(20).fill(null).map(() => Array(10).fill(0)),
              checksum: ''
            };
          }
        }
      } catch (e) {
        console.warn('Failed to parse as base64:', e);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse replay data:', error);
      return null;
    }
  };

  const handleImport = () => {
    if (!replayInput.trim()) {
      setErrorMessage('请输入录像数据');
      setImportStatus('error');
      return;
    }

    setImportStatus('importing');
    setErrorMessage('');

    try {
      const replay = parseReplayData(replayInput);
      
      if (replay) {
        setImportedReplay(replay);
        setImportStatus('success');
      } else {
        setErrorMessage('无法解析录像数据，请检查格式是否正确');
        setImportStatus('error');
      }
    } catch (error) {
      setErrorMessage('导入失败：' + (error as Error).message);
      setImportStatus('error');
    }
  };

  const handlePlayImported = () => {
    if (importedReplay) {
      setIsPlayerOpen(true);
    }
  };

  const handleReset = () => {
    setReplayInput('');
    setImportedReplay(null);
    setImportStatus('idle');
    setErrorMessage('');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); handleReset(); } }}>
        <DialogTrigger asChild>
          {!controlledOpen && (
            <Button variant="outline" onClick={() => setInternalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              读取录像
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              读取录像
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 输入区域 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                录像数据 (支持JSON格式或Base64编码)
              </label>
              <Textarea
                value={replayInput}
                onChange={(e) => setReplayInput(e.target.value)}
                placeholder="粘贴录像数据到这里..."
                className="min-h-[120px] font-mono text-xs"
                disabled={importStatus === 'importing'}
              />
            </div>

            {/* 状态指示器 */}
            {importStatus === 'error' && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{errorMessage}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {importStatus === 'success' && importedReplay && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">录像导入成功</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>游戏模式: <Badge variant="secondary">{importedReplay.gameMode}</Badge></div>
                    <div>动作数量: {importedReplay.actionsCount}</div>
                    <div>游戏时长: {Math.round(importedReplay.durationSeconds)}秒</div>
                    <div>最终分数: {importedReplay.finalScore.toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-between">
              <div className="flex gap-2">
                <Button 
                  onClick={handleImport}
                  disabled={!replayInput.trim() || importStatus === 'importing'}
                >
                  {importStatus === 'importing' ? '导入中...' : '导入录像'}
                </Button>
                
                {importedReplay && (
                  <Button 
                    onClick={handlePlayImported}
                    variant="outline"
                  >
                    播放录像
                  </Button>
                )}
              </div>

              <Button 
                onClick={handleReset}
                variant="ghost"
              >
                重置
              </Button>
            </div>

            {/* 使用说明 */}
            <Card>
              <CardContent className="p-3">
                <h4 className="text-sm font-medium mb-2">支持的格式：</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• JSON格式：包含actions数组的完整录像数据</li>
                  <li>• Base64编码：压缩后的二进制录像数据</li>
                  <li>• 兼容jstris和其他俄罗斯方块游戏的录像格式</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* 播放器 */}
      {importedReplay && (
        <EnhancedReplayPlayer
          replay={importedReplay}
          isOpen={isPlayerOpen}
          onClose={() => setIsPlayerOpen(false)}
        />
      )}
    </>
  );
};