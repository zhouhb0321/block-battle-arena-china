/**
 * Replay Diagnostics Panel
 * UI for enabling diagnostics and viewing comparison results
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Info, Bug } from 'lucide-react';
import type { DiagnosticDifference } from '@/utils/replayV4/diagnostics';

interface ReplayDiagnosticsPanelProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  differences?: DiagnosticDifference[];
  recordedSnapshotCount?: number;
  replayedSnapshotCount?: number;
}

export function ReplayDiagnosticsPanel({
  enabled,
  onToggle,
  differences = [],
  recordedSnapshotCount = 0,
  replayedSnapshotCount = 0
}: ReplayDiagnosticsPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const critical = differences.filter(d => d.severity === 'critical');
  const warnings = differences.filter(d => d.severity === 'warning');
  const info = differences.filter(d => d.severity === 'info');
  
  const hasComparison = recordedSnapshotCount > 0 && replayedSnapshotCount > 0;
  const isConsistent = hasComparison && differences.length === 0;
  
  return (
    <Card className="p-4 space-y-4 bg-card border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Replay Diagnostics</h3>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="diagnostics-toggle" className="text-sm text-muted-foreground">
            Enable
          </Label>
          <Switch
            id="diagnostics-toggle"
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </div>
      
      {!enabled && (
        <p className="text-sm text-muted-foreground">
          Enable diagnostics to record frame-by-frame snapshots and detect replay inconsistencies.
        </p>
      )}
      
      {enabled && !hasComparison && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4" />
          <span>Recording diagnostic snapshots... Play a game and then replay it to see comparison.</span>
        </div>
      )}
      
      {enabled && hasComparison && (
        <div className="space-y-3">
          {/* Status Summary */}
          <div className="flex items-center gap-3">
            {isConsistent ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  ✓ Replay is consistent!
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Found {differences.length} difference{differences.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
          
          {/* Snapshot Counts */}
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Recorded:</span>
              <span className="ml-1 font-medium text-foreground">{recordedSnapshotCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Replayed:</span>
              <span className="ml-1 font-medium text-foreground">{replayedSnapshotCount}</span>
            </div>
          </div>
          
          {/* Difference Badges */}
          {differences.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {critical.length > 0 && (
                <Badge variant="destructive">
                  {critical.length} Critical
                </Badge>
              )}
              {warnings.length > 0 && (
                <Badge variant="secondary">
                  {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {info.length > 0 && (
                <Badge variant="outline">
                  {info.length} Info
                </Badge>
              )}
            </div>
          )}
          
          {/* Toggle Details */}
          {differences.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          )}
          
          {/* Difference Details */}
          {showDetails && differences.length > 0 && (
            <ScrollArea className="h-64 border border-border rounded-md">
              <div className="p-3 space-y-2">
                {critical.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-destructive mb-2">
                      🔴 Critical Issues
                    </h4>
                    {critical.map((d, i) => (
                      <div key={i} className="mb-3 p-2 bg-destructive/10 rounded text-xs">
                        <div className="font-medium">
                          Lock #{d.lockIndex} @ {d.timestamp}ms
                        </div>
                        <div className="text-muted-foreground">Field: {d.field}</div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <span className="text-muted-foreground">Recorded:</span>
                            <pre className="mt-1 text-foreground">{JSON.stringify(d.recorded, null, 2)}</pre>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Replayed:</span>
                            <pre className="mt-1 text-foreground">{JSON.stringify(d.replayed, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {warnings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-500 mb-2">
                      ⚠️ Warnings
                    </h4>
                    {warnings.map((d, i) => (
                      <div key={i} className="mb-2 p-2 bg-yellow-500/10 rounded text-xs">
                        <div>
                          Lock #{d.lockIndex}: {d.field}
                        </div>
                        <div className="text-muted-foreground">
                          {JSON.stringify(d.recorded)} → {JSON.stringify(d.replayed)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {info.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-blue-500 mb-2">
                      ℹ️ Info
                    </h4>
                    {info.map((d, i) => (
                      <div key={i} className="mb-2 p-2 bg-blue-500/10 rounded text-xs">
                        <div>
                          Lock #{d.lockIndex}: {d.field}
                        </div>
                        <div className="text-muted-foreground">
                          {JSON.stringify(d.recorded)} → {JSON.stringify(d.replayed)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </Card>
  );
}
