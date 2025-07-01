
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
import type { GameSettings } from '@/utils/gameTypes';

interface SettingsMenuProps {
  onBackToMenu: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onBackToMenu }) => {
  const { user } = useAuth();
  const { gameSettings, updateGameSettings } = useGame();
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
        const settings: GameSettings = {
          das: data.das,
          arr: data.arr,
          sdf: data.sdf,
          controls: data.controls,
          enableGhost: data.enable_ghost,
          enableSound: data.enable_sound,
          masterVolume: data.master_volume,
          backgroundMusic: data.background_music || '',
          musicVolume: data.music_volume || 30,
          ghostOpacity: 50 // 默认值，可以添加到数据库
        };

        updateGameSettings(settings);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!user || user.isGuest) {
      // 对于游客，只保存到本地状态
      setHasChanges(false);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          das: gameSettings.das,
          arr: gameSettings.arr,
          sdf: gameSettings.sdf,
          controls: gameSettings.controls,
          enable_ghost: gameSettings.enableGhost,
          enable_sound: gameSettings.enableSound,
          master_volume: gameSettings.masterVolume,
          background_music: gameSettings.backgroundMusic,
          music_volume: gameSettings.musicVolume,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

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
    const newSettings = { ...gameSettings, [key]: value };
    updateGameSettings(newSettings);
    setHasChanges(true);
  };

  const resetToDefaults = () => {
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
      ghostOpacity: 50
    };

    updateGameSettings(defaultSettings);
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
            settings={gameSettings}
            onSettingChange={handleSettingChange}
          />
        </TabsContent>

        <TabsContent value="controls" className="space-y-4">
          <ControlsTab 
            settings={gameSettings}
            onSettingChange={handleSettingChange}
          />
        </TabsContent>

        <TabsContent value="visual" className="space-y-4">
          <VisualTab 
            settings={gameSettings}
            onSettingChange={handleSettingChange}
          />
        </TabsContent>

        <TabsContent value="audio" className="space-y-4">
          <AudioTab 
            settings={gameSettings}
            onSettingChange={handleSettingChange}
          />
        </TabsContent>

        <TabsContent value="music" className="space-y-4">
          <MusicTab 
            settings={gameSettings}
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
