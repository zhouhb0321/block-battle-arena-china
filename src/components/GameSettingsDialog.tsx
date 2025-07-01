
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Keyboard, Volume2, Eye, Gamepad2, Music, Save, RotateCcw } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);

  // 当settings更新时，同步更新tempSettings
  useEffect(() => {
    setTempSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const { recordingKey, handleKeyRecord } = useKeyRecording(
    tempSettings,
    setTempSettings,
    setHasChanges
  );

  const handleSettingChange = (key: string, value: any) => {
    console.log('Setting changed:', key, value);
    setTempSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await saveSettings(tempSettings);
      setHasChanges(false);
      toast.success('设置已保存！');
    } catch (error) {
      console.error('保存设置失败:', error);
      toast.error('保存设置失败，请检查网络连接并重试');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    const defaultSettings = {
      das: 167,
      arr: 33,
      sdf: 20,
      controls: {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        softDrop: 'ArrowDown',
        hardDrop: 'Space',
        rotateClockwise: 'ArrowUp',
        rotateCounterclockwise: 'KeyZ',
        rotate180: 'KeyA',
        hold: 'KeyC',
        pause: 'Escape',
        backToMenu: 'KeyB'
      },
      enableGhost: true,
      enableSound: true,
      masterVolume: 50,
      backgroundMusic: '',
      musicVolume: 30,
      ghostOpacity: 50
    };
    
    setTempSettings(defaultSettings);
    setHasChanges(true);
    toast.info('设置已重置为默认值');
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && hasChanges) {
      // 如果有未保存的更改，询问用户
      const shouldDiscard = confirm('您有未保存的更改，确定要关闭吗？');
      if (!shouldDiscard) {
        setIsOpen(true);
        return;
      }
      // 重置临时设置
      setTempSettings(settings);
      setHasChanges(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600">
            <Settings className="w-4 h-4 mr-2" />
            游戏设置
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              游戏设置
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefaults}
                className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重置默认
              </Button>
              {hasChanges && (
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? '保存中...' : '保存设置'}
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-400">加载设置中...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="timing" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-gray-800">
              <TabsTrigger value="timing" className="data-[state=active]:bg-blue-600">
                <Gamepad2 className="w-4 h-4 mr-2" />
                手感
              </TabsTrigger>
              <TabsTrigger value="controls" className="data-[state=active]:bg-blue-600">
                <Keyboard className="w-4 h-4 mr-2" />
                键位
              </TabsTrigger>
              <TabsTrigger value="visual" className="data-[state=active]:bg-blue-600">
                <Eye className="w-4 h-4 mr-2" />
                视觉
              </TabsTrigger>
              <TabsTrigger value="audio" className="data-[state=active]:bg-blue-600">
                <Volume2 className="w-4 h-4 mr-2" />
                音效
              </TabsTrigger>
              <TabsTrigger value="music" className="data-[state=active]:bg-blue-600">
                <Music className="w-4 h-4 mr-2" />
                音乐
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <TabsContent value="timing" className="space-y-4">
                <TimingTab
                  settings={tempSettings}
                  onSettingChange={handleSettingChange}
                />
              </TabsContent>
              
              <TabsContent value="controls" className="space-y-4">
                <ControlsTab
                  settings={tempSettings}
                  recordingKey={recordingKey}
                  onKeyRecord={handleKeyRecord}
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
            </div>
          </Tabs>
        )}
        
        {hasChanges && (
          <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-200 text-sm">
              您有未保存的更改，请点击"保存设置"来保存您的配置。
            </p>
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
          >
            {hasChanges ? '取消' : '关闭'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameSettingsDialog;
