import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface UndoRedoTabProps {
  undoSteps: number;
  onUndoStepsChange: (value: number) => void;
}

const UndoRedoTab: React.FC<UndoRedoTabProps> = ({
  undoSteps,
  onUndoStepsChange
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>撤销重做设置</CardTitle>
          <CardDescription>
            配置单人模式下的撤销重做功能选项
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              撤销重做功能仅在单人模式（Marathon/Endless）下可用
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="undo-steps">最大撤销步数</Label>
            <Select 
              value={undoSteps.toString()} 
              onValueChange={(value) => onUndoStepsChange(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择最大撤销步数" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50步（默认）</SelectItem>
                <SelectItem value="80">80步</SelectItem>
                <SelectItem value="100">100步</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              更多撤销步数会占用更多内存，请根据设备性能选择合适的数量
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UndoRedoTab;