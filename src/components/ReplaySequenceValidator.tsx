import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ReplaySequenceValidatorProps {
  recordedSequence?: string[];
  playedSequence?: string[];
}

/**
 * Visual validator component to compare recorded vs replayed piece sequences
 */
export const ReplaySequenceValidator: React.FC<ReplaySequenceValidatorProps> = ({
  recordedSequence = [],
  playedSequence = []
}) => {
  const minLength = Math.min(recordedSequence.length, playedSequence.length);
  let firstMismatch = -1;
  let matchCount = 0;

  for (let i = 0; i < minLength; i++) {
    if (recordedSequence[i] === playedSequence[i]) {
      matchCount++;
    } else if (firstMismatch === -1) {
      firstMismatch = i;
    }
  }

  const accuracy = minLength > 0 ? (matchCount / minLength) * 100 : 0;
  const isPerfect = accuracy === 100 && recordedSequence.length === playedSequence.length;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        {isPerfect ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-green-500">✅ 完美一致</h3>
          </>
        ) : accuracy >= 90 ? (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-yellow-500">⚠️ 部分一致</h3>
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-500">❌ 序列不匹配</h3>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">录制方块数:</span>
          <Badge variant="outline" className="ml-2">{recordedSequence.length}</Badge>
        </div>
        <div>
          <span className="text-muted-foreground">回放方块数:</span>
          <Badge variant="outline" className="ml-2">{playedSequence.length}</Badge>
        </div>
        <div>
          <span className="text-muted-foreground">匹配率:</span>
          <Badge 
            variant={accuracy === 100 ? "default" : accuracy >= 90 ? "secondary" : "destructive"} 
            className="ml-2"
          >
            {accuracy.toFixed(1)}%
          </Badge>
        </div>
        <div>
          <span className="text-muted-foreground">匹配数:</span>
          <Badge variant="outline" className="ml-2">{matchCount}/{minLength}</Badge>
        </div>
      </div>

      {firstMismatch >= 0 && (
        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
          <div className="text-sm font-medium text-destructive mb-1">
            首次不匹配位置: 第 {firstMismatch + 1} 个方块
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>录制: {recordedSequence[firstMismatch]}</div>
            <div>回放: {playedSequence[firstMismatch]}</div>
          </div>
        </div>
      )}

      {recordedSequence.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">前20个方块:</div>
          <div className="font-mono text-xs p-2 bg-muted rounded">
            录制: {recordedSequence.slice(0, 20).join(' ')}
          </div>
          {playedSequence.length > 0 && (
            <div className="font-mono text-xs p-2 bg-muted rounded">
              回放: {playedSequence.slice(0, 20).join(' ')}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
