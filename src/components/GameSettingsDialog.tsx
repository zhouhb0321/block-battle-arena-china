
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Keyboard, Volume2, Eye, Gamepad2, Music, Save, RotateCcw, CheckCircle } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { toast } from 'sonner';
import ControlsTab from './settings/ControlsTab';
import TimingTab from './settings/TimingTab';
import VisualTab from './settings/VisualTab';
import AudioTab from './settings/AudioTab';
import MusicTab from './settings/MusicTab';
import { useKeyRecording } from './settings/useKeyRecording';
import type { GameSettings } from '@/utils/gameTypes';

interface GameSettingsDialogProps {
  trigger?: React.ReactNode;
}

const GameSettingsDialog: React.FC<GameSettingsDialogProps> = ({ trigger }) => {
  const { gameSettings, updateGameSettings, refreshSettings } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tempSettings, setTempSettings] = useState(gameSettings);
  const [saving, setSaving] = useState(false);

  // 当gameSettings更新时，同步更新tempSettings
  useEffect(() => {
    console.log('GameSettingsDialog - gameSettings更新:', gameSettings);
    setTempSettings(gameSettings);
    setHasChanges(false);
  }, [gameSettings]);

  const { recordingKey, handleKeyRecord } = useKeyRecording(
    tempSettings,
    (key, value) => setTempSettings(prev => ({ ...prev, [key]: value })),
    () => setHasChanges(true)
  );

  const handleSettingChange = (key: string, value: any) => {
    console.log('GameSettingsDialog - 设置变化:', key, value);
    setTempSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      console.log('GameSettingsDialog - 保存设置:', tempSettings);
      await updateGameSettings(tempSettings);
      setHasChanges(false);
      toast.success('设置已保存并生效！');
    } catch (error) {
      console.error('GameSettingsDialog - 保存设置失败:', error);
      toast.error('保存设置失败，请检查网络连接并重试');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    const defaultSettings: GameSettings = {
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
      ghostOpacity: 50,
      enableWallpaper: true,
      wallpaperOpacity: 100,
      autoPlayMusic: false,
      loopMusic: true,
      enableLineAnimation: true,
      enableAchievementAnimation: true,
      enableLandingEffect: true,
      blockSkin: 'wood'
    };
    
    setTempSettings(defaultSettings);
    setHasChanges(true);
    toast.info('设置已重置为默认值');
  };

  const handleRefreshSettings = async () => {
    try {
      console.log('刷新设置...');
      await refreshSettings();
      toast.success('设置已刷新');
    } catch (error) {
      console.error('刷新设置失败:', error);
      toast.error('刷新设置失败');
    }
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
      setTempSettings(gameSettings);
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
                onClick={handleRefreshSettings}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                刷新设置
              </Button>
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
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存设置
                    </>
                  )}
                </Button>
              )}
              {!hasChanges && !saving && (
                <Button 
                  disabled
                  className="bg-gray-600 text-gray-400"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  已保存
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
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
        
        {hasChanges && (
          <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-200 text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" />
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
