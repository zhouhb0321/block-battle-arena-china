
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import TimingTab from '@/components/settings/TimingTab';
import ControlsTab from '@/components/settings/ControlsTab';
import AudioTab from '@/components/settings/AudioTab';
import VisualTab from '@/components/settings/VisualTab';
import MusicTab from '@/components/settings/MusicTab';
import BlockSkinTab from '@/components/settings/BlockSkinTab';
import SettingsHints from '@/components/settings/SettingsHints';
import HandlingPreview from '@/components/settings/HandlingPreview';
import InputGraph from '@/components/settings/InputGraph';
import { useKeyRecording } from '@/components/settings/useKeyRecording';
import { useSettingsBinding } from '@/hooks/useSettingsBinding';

interface SettingsMenuProps {
  onBackToMenu: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onBackToMenu }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
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

  const { recordingKey, handleKeyRecord } = useKeyRecording(
    settings,
    updateSetting,
    () => {}
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBackToMenu}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <h2 className="text-3xl font-bold">{t('settings.title')}</h2>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetSettings}>
            {t('settings.reset')}
          </Button>
          <Button 
            onClick={commitSettings} 
            disabled={loading || !hasChanges}
            className={hasChanges ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {loading ? t('settings.saving') : hasChanges ? t('settings.saveChanges') : t('settings.saved')}
          </Button>
        </div>
      </div>

      <SettingsHints
        hints={hints}
        onApplyRecommendation={applyRecommendation}
        onApplyAll={applyAllRecommendations}
      />

      <Tabs defaultValue="timing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="timing">{t('settings.tabs.handling')}</TabsTrigger>
          <TabsTrigger value="controls">{t('settings.tabs.controls')}</TabsTrigger>
          <TabsTrigger value="visual">{t('settings.tabs.visual')}</TabsTrigger>
          <TabsTrigger value="blocks">{t('settings.tabs.blocks')}</TabsTrigger>
          <TabsTrigger value="audio">{t('settings.tabs.audio')}</TabsTrigger>
          <TabsTrigger value="music">{t('settings.tabs.music')}</TabsTrigger>
        </TabsList>

        <TabsContent value="timing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TimingTab 
              settings={settings}
              onSettingChange={updateSetting}
            />
            <HandlingPreview settings={settings} />
          </div>
          
          <InputGraph />
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
              {t('settings.guestModeWarning')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettingsMenu;
