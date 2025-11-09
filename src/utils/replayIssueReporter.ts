/**
 * 回放问题报告工具
 * 自动生成并上传回放不一致报告
 */

import { supabase } from '@/integrations/supabase/client';
import type { DiagnosticDifference } from './replayV4/diagnostics';
import type { V4ReplayData } from './replayV4/types';

export interface ReplayIssueReport {
  replay_id?: string;
  user_id?: string;
  replay_metadata: any;
  total_differences: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  consistency_rate: number;
  differences_summary: any[];
  raw_differences: any;
  auto_detected: boolean;
  reported_at: string;
}

/**
 * 生成回放问题报告
 */
export function generateIssueReport(
  replay: V4ReplayData,
  differences: DiagnosticDifference[],
  userId?: string
): ReplayIssueReport {
  const critical = differences.filter(d => d.severity === 'critical');
  const warnings = differences.filter(d => d.severity === 'warning');
  const info = differences.filter(d => d.severity === 'info');
  
  const totalChecks = differences.length > 0 ? 100 : 100; // 假设总检查数
  const consistencyRate = ((totalChecks - differences.length) / totalChecks * 100);
  
  // 生成差异摘要
  const summary = differences.slice(0, 10).map(d => ({
    lockIndex: d.lockIndex,
    timestamp: d.timestamp,
    field: d.field,
    severity: d.severity,
    recorded: JSON.stringify(d.recorded),
    replayed: JSON.stringify(d.replayed)
  }));
  
  return {
    user_id: userId,
    replay_metadata: {
      seed: replay.metadata.seed,
      gameMode: replay.metadata.gameMode,
      username: replay.metadata.username,
      duration: replay.stats.duration,
      version: replay.version
    },
    total_differences: differences.length,
    critical_count: critical.length,
    warning_count: warnings.length,
    info_count: info.length,
    consistency_rate: consistencyRate,
    differences_summary: summary,
    raw_differences: differences,
    auto_detected: true,
    reported_at: new Date().toISOString()
  };
}

/**
 * 上传报告到 Supabase
 */
export async function uploadIssueReport(report: ReplayIssueReport): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('replay_issue_reports')
      .insert([report]);
    
    if (error) {
      console.error('[ReplayIssueReporter] 上传报告失败:', error);
      return false;
    }
    
    console.log('[ReplayIssueReporter] 报告上传成功');
    return true;
  } catch (err) {
    console.error('[ReplayIssueReporter] 上传报告异常:', err);
    return false;
  }
}

/**
 * 检查是否应该自动报告
 */
export function shouldAutoReport(
  differences: DiagnosticDifference[],
  threshold: { critical: number; warning: number; consistencyRate: number }
): boolean {
  const critical = differences.filter(d => d.severity === 'critical').length;
  const warnings = differences.filter(d => d.severity === 'warning').length;
  const totalChecks = 100;
  const consistencyRate = ((totalChecks - differences.length) / totalChecks * 100);
  
  return (
    critical >= threshold.critical ||
    warnings >= threshold.warning ||
    consistencyRate < threshold.consistencyRate
  );
}
