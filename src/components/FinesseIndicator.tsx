import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getFinesseGrade } from '@/utils/finesseSystem';
import type { FinesseStats } from '@/utils/finesseSystem';

interface FinesseIndicatorProps {
  finesseStats: FinesseStats;
  lastFinesseError: number;
  className?: string;
}

export const FinesseIndicator: React.FC<FinesseIndicatorProps> = ({
  finesseStats,
  lastFinesseError,
  className = ''
}) => {
  const { grade, color, description } = getFinesseGrade(finesseStats.efficiency);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {lastFinesseError === 0 ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
        <span className="text-sm font-medium">Finesse</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className={`text-lg font-bold ${color}`}>{grade}</span>
        <span className="text-sm text-muted-foreground">
          {finesseStats.efficiency.toFixed(1)}%
        </span>
      </div>
      
      {finesseStats.totalErrors > 0 && (
        <span className="text-xs text-muted-foreground">
          ({finesseStats.totalErrors} errors)
        </span>
      )}
    </div>
  );
};
