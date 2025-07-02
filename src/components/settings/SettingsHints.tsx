import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';

interface SettingsHint {
  key: string;
  title: string;
  description: string;
  value: any;
  recommended?: any;
  isRecommended?: boolean;
}

interface SettingsHintsProps {
  hints: SettingsHint[];
  onApplyRecommendation: (hint: SettingsHint) => void;
  onApplyAll: () => void;
}

const SettingsHints: React.FC<SettingsHintsProps> = ({
  hints,
  onApplyRecommendation,
  onApplyAll
}) => {
  if (hints.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">您的设置配置良好！</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendedHints = hints.filter(hint => hint.isRecommended);

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Lightbulb className="w-5 h-5" />
            设置优化建议
          </CardTitle>
          {recommendedHints.length > 0 && (
            <Button
              onClick={onApplyAll}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              应用所有推荐
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hints.map((hint, index) => (
          <div
            key={index}
            className="flex items-start justify-between p-3 bg-white rounded-lg border border-blue-100"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-900">{hint.title}</span>
                {hint.isRecommended && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    推荐
                  </Badge>
                )}
              </div>
              <p className="text-sm text-blue-700">{hint.description}</p>
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <span>当前值: {String(hint.value)}</span>
                {hint.recommended !== undefined && (
                  <span>→ 建议值: {String(hint.recommended)}</span>
                )}
              </div>
            </div>
            {hint.recommended !== undefined && (
              <Button
                onClick={() => onApplyRecommendation(hint)}
                size="sm"
                variant="outline"
                className="ml-3 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                应用
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SettingsHints;