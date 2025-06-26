
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Keyboard, Volume2, Eye, Gamepad2, Music, Save } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from 'sonner';
import ControlsTab from './settings/ControlsTab';
import TimingTab from './settings/TimingTab';
import VisualTab from './settings/VisualTab';
import AudioTab from './settings/AudioTab';
import MusicTab from './settings/MusicTab';
import { useKeyRecording } from './settings/useKeyRecording';

interface GameSettingsDialogProps {
  trigger?: React.ReactNode;
}

const GameSettingsDialog: React.FC<GameSettingsDialogProps> = ({ trigger }) => {
  const { settings, saveSettings, loading } = useUserSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);

  const { recordingKey, handleKeyRecord } = useKeyRecording(
    tempSettings,
    setTempSettings,
    setHasChanges
  );

  const handleSettingChange = (key: string, value: any) => {
    setTempSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    await saveSettings(tempSettings);
    setHasChanges(false);
    toast.success('设置已保存！');
  };

  if (loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            游戏设置
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            游戏设置
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="controls" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="controls"><Keyboard className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="timing"><Gamepad2 className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="visual"><Eye className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="audio"><Volume2 className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="music"><Music className="w-4 h-4" /></TabsTrigger>
          </TabsList>
          
          <TabsContent value="controls" className="space-y-4">
            <ControlsTab
              settings={tempSettings}
              recordingKey={recordingKey}
              onKeyRecord={handleKeyRecord}
              onSettingChange={handleSettingChange}
            />
          </TabsContent>
          
          <TabsContent value="timing" className="space-y-4">
            <TimingTab
              settings={tempSettings}
              onSettingChange={handleSettingChange}
            />
          </TabsContent>
          
          <TabsContent value="visual" className="space-y-4">
            <VisualTab
              settings={tempSettings}
              onSettingChange={handleSettingChange}
            />
          </TabsContent>
          
          <TabsContent value="audio" className="space-y-4">
            <AudioTab
              settings={tempSettings}
              onSettingChange={handleSettingChange}
            />
          </TabsContent>

          <TabsContent value="music" className="space-y-4">
            <MusicTab
              settings={tempSettings}
              onSettingChange={handleSettingChange}
            />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          {hasChanges && (
            <Button onClick={handleSaveSettings} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              保存设置
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameSettingsDialog;
