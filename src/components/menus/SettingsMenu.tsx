
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';
import TimingTab from '@/components/settings/TimingTab';
import ControlsTab from '@/components/settings/ControlsTab';
import AudioTab from '@/components/settings/AudioTab';
import VisualTab from '@/components/settings/VisualTab';
import MusicTab from '@/components/settings/MusicTab';
import { useKeyRecording } from '@/components/settings/useKeyRecording';
import type { GameSettings } from '@/utils/gameTypes';

interface SettingsMenuProps {
  onBackToMenu: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onBackToMenu }) => {
  const { user } = useAuth();
  const { gameSettings, updateGameSettings } = useGame();
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tempSettings, setTempSettings] = useState(gameSettings);

  // 键位录制相关
  const { recordingKey, handleKeyRecord } = useKeyRecording(
    tempSettings,
    setTempSettings,
    setHasChanges
  );

  useEffect(() => {
    if (user && !user.isGuest) {
      loadUserSettings();
    }
  }, [user]);

  const loadUserSettings = async () => {
    if (!user || user.isGuest) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Failed to load user settings:', error);
        return;
      }

      if (data) {
        // 正确处理 Json 类型转换
        const controls = typeof data.controls === 'object' && data.controls !== null 
          ? data.controls as Record<string, string>
          : {
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
            };

        const settings: GameSettings = {
          das: data.das,
          arr: data.arr,
          sdf: data.sdf,
          controls: controls as GameSettings['controls'],
          enableGhost: data.enable_ghost,
          enableSound: data.enable_sound,
          masterVolume: data.master_volume,
          backgroundMusic: data.background_music || '',
          musicVolume: data.music_volume || 30,
          ghostOpacity: 50 // 默认值，可以添加到数据库
        };

        updateGameSettings(settings);
        setTempSettings(settings);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!user || user.isGuest) {
      // 对于游客，只保存到本地状态
      updateGameSettings(tempSettings);
      setHasChanges(false);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          das: tempSettings.das,
          arr: tempSettings.arr,
          sdf: tempSettings.sdf,
          controls: tempSettings.controls,
          enable_ghost: tempSettings.enableGhost,
          enable_sound: tempSettings.enableSound,
          master_volume: tempSettings.masterVolume,
          background_music: tempSettings.backgroundMusic,
          music_volume: tempSettings.musicVolume,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      updateGameSettings(tempSettings);
      setHasChanges(false);
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('保存设置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof GameSettings, value: any) => {
    const newSettings = { ...tempSettings, [key]: value };
    setTempSettings(newSettings);
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    const defaultSettings: GameSettings = {
      das: 67, // 修正为67ms
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
  };

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
          <Button variant="outline" onClick={resetToDefaults}>
            恢复默认
          </Button>
          <Button 
            onClick={saveSettings} 
            disabled={loading || !hasChanges}
            className={hasChanges ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {loading ? '保存中...' : hasChanges ? '保存更改' : '已保存'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="timing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timing">手感</TabsTrigger>
          <TabsTrigger value="controls">键位</TabsTrigger>
          <TabsTrigger value="visual">视觉</TabsTrigger>
          <TabsTrigger value="audio">音效</TabsTrigger>
          <TabsTrigger value="music">音乐</TabsTrigger>
        </TabsList>

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
      </Tabs>

      {user && user.isGuest && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-orange-800 text-sm">
              您当前为游客模式，设置仅保存在本次会话中。登录后可永久保存您的个人设置。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettingsMenu;
