
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TimingTab from '@/components/settings/TimingTab';
import ControlsTab from '@/components/settings/ControlsTab';
import AudioTab from '@/components/settings/AudioTab';
import VisualTab from '@/components/settings/VisualTab';
import MusicTab from '@/components/settings/MusicTab';
import BlockSkinTab from '@/components/settings/BlockSkinTab';
import SettingsHints from '@/components/settings/SettingsHints';
import { useKeyRecording } from '@/components/settings/useKeyRecording';
import { useSettingsBinding } from '@/hooks/useSettingsBinding';

interface SettingsMenuProps {
  onBackToMenu: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onBackToMenu }) => {
  const { user } = useAuth();
  const {
    settings,
    hasChanges,
    loading,
    hints,
    updateSetting,
    commitSettings,
    resetSettings,
    applyRecommendation,
    applyAllRecommendations
  } = useSettingsBinding();

  // 键位录制相关
  const { recordingKey, handleKeyRecord } = useKeyRecording(
    settings,
    updateSetting,
    () => {} // hasChanges is managed by useSettingsBinding
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBackToMenu}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h2 className="text-3xl font-bold">游戏设置</h2>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetSettings}>
            重置设置
          </Button>
          <Button 
            onClick={commitSettings} 
            disabled={loading || !hasChanges}
            className={hasChanges ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {loading ? '保存中...' : hasChanges ? '保存更改' : '已保存'}
          </Button>
        </div>
      </div>

      {/* 智能提示组件 */}
      <SettingsHints
        hints={hints}
        onApplyRecommendation={applyRecommendation}
        onApplyAll={applyAllRecommendations}
      />

      <Tabs defaultValue="timing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="timing">手感</TabsTrigger>
          <TabsTrigger value="controls">键位</TabsTrigger>
          <TabsTrigger value="visual">视觉</TabsTrigger>
          <TabsTrigger value="blocks">方块</TabsTrigger>
          <TabsTrigger value="audio">音效</TabsTrigger>
          <TabsTrigger value="music">音乐</TabsTrigger>
        </TabsList>

        <TabsContent value="timing" className="space-y-4">
          <TimingTab 
            settings={settings}
            onSettingChange={updateSetting}
          />
        </TabsContent>

        <TabsContent value="controls" className="space-y-4">
          <ControlsTab 
            settings={settings}
            recordingKey={recordingKey}
            onKeyRecord={handleKeyRecord}
            onSettingChange={updateSetting}
          />
        </TabsContent>

        <TabsContent value="visual" className="space-y-4">
          <VisualTab 
            settings={settings}
            onSettingChange={updateSetting}
          />
        </TabsContent>

        <TabsContent value="blocks" className="space-y-4">
          <BlockSkinTab 
            settings={settings}
            onSettingChange={updateSetting}
          />
        </TabsContent>

        <TabsContent value="audio" className="space-y-4">
          <AudioTab 
            settings={settings}
            onSettingChange={updateSetting}
          />
        </TabsContent>

        <TabsContent value="music" className="space-y-4">
          <MusicTab 
            settings={settings}
            onSettingChange={updateSetting}
          />
        </TabsContent>
      </Tabs>

      {user && user.isGuest && (
        <Card className="mt-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/50">
          <CardContent className="pt-6">
            <p className="text-orange-800 dark:text-orange-200 text-sm">
              您当前为游客模式，设置仅保存在本次会话中。登录后可永久保存您的个人设置。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettingsMenu;
