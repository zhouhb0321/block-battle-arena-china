
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Keyboard, Volume2, Eye, Gamepad2, Music, Save } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { toast } from 'sonner';

interface GameSettingsDialogProps {
  trigger?: React.ReactNode;
}

const GameSettingsDialog: React.FC<GameSettingsDialogProps> = ({ trigger }) => {
  const { settings, saveSettings, loading } = useUserSettings();
  const { musicTracks, playTrack, pauseMusic, setMusicVolume } = useBackgroundMusic();
  const [isOpen, setIsOpen] = useState(false);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);

  const handleSettingChange = (key: string, value: any) => {
    setTempSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleControlChange = (controlName: string, keyCode: string) => {
    const newControls = { ...tempSettings.controls, [controlName]: keyCode };
    setTempSettings(prev => ({ ...prev, controls: newControls }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    await saveSettings(tempSettings);
    setHasChanges(false);
    toast.success('设置已保存！');
  };

  const handleKeyRecord = (controlName: string) => {
    setRecordingKey(controlName);
    
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      handleControlChange(controlName, e.code);
      setRecordingKey(null);
      
      document.removeEventListener('keydown', handleKeyPress);
    };
    
    document.addEventListener('keydown', handleKeyPress, { once: true });
    
    setTimeout(() => {
      setRecordingKey(null);
      document.removeEventListener('keydown', handleKeyPress);
    }, 5000);
  };

  const getKeyDisplayName = (keyCode: string) => {
    const keyMap: { [key: string]: string } = {
      'ArrowLeft': '←', 'ArrowRight': '→', 'ArrowUp': '↑', 'ArrowDown': '↓',
      'Space': '空格', 'KeyZ': 'Z', 'KeyX': 'X', 'KeyC': 'C', 'KeyA': 'A',
      'KeyB': 'B', 'Escape': 'Esc'
    };
    return keyMap[keyCode] || keyCode.replace('Key', '');
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">按键设置</CardTitle>
                <CardDescription>点击按钮自定义按键绑定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries({
                  moveLeft: '左移', moveRight: '右移', softDrop: '软降', hardDrop: '硬降',
                  rotateClockwise: '顺时针旋转', rotateCounterclockwise: '逆时针旋转',
                  rotate180: '180°旋转', hold: '暂存', pause: '暂停', backToMenu: '返回菜单'
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="w-32">{label}</Label>
                    <Button
                      variant={recordingKey === key ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => handleKeyRecord(key)}
                      className="min-w-24"
                    >
                      {recordingKey === key ? '按下按键...' : 
                        getKeyDisplayName(tempSettings.controls[key as keyof typeof tempSettings.controls])}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">操控设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>DAS - 延迟自动移位 ({tempSettings.das}ms)</Label>
                  <Slider
                    value={[tempSettings.das]}
                    onValueChange={([value]) => handleSettingChange('das', value)}
                    max={300} min={0} step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ARR - 自动重复速率 ({tempSettings.arr}ms)</Label>
                  <Slider
                    value={[tempSettings.arr]}
                    onValueChange={([value]) => handleSettingChange('arr', value)}
                    max={100} min={0} step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SDF - 软降速度 ({tempSettings.sdf}倍)</Label>
                  <Slider
                    value={[tempSettings.sdf]}
                    onValueChange={([value]) => handleSettingChange('sdf', value)}
                    max={40} min={1} step={1}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="visual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">视觉设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>幽灵方块</Label>
                  <Switch
                    checked={tempSettings.enableGhost}
                    onCheckedChange={(checked) => handleSettingChange('enableGhost', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="audio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">音频设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>启用音效</Label>
                  <Switch
                    checked={tempSettings.enableSound}
                    onCheckedChange={(checked) => handleSettingChange('enableSound', checked)}
                  />
                </div>
                {tempSettings.enableSound && (
                  <div className="space-y-2">
                    <Label>主音量 ({tempSettings.masterVolume}%)</Label>
                    <Slider
                      value={[tempSettings.masterVolume]}
                      onValueChange={([value]) => handleSettingChange('masterVolume', value)}
                      max={100} min={0} step={1}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="music" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">背景音乐</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>选择背景音乐</Label>
                  <Select
                    value={tempSettings.backgroundMusic}
                    onValueChange={(value) => handleSettingChange('backgroundMusic', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择音乐" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">无音乐</SelectItem>
                      {musicTracks.map(track => (
                        <SelectItem key={track.id} value={track.id}>
                          {track.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {tempSettings.backgroundMusic && (
                  <div className="space-y-2">
                    <Label>音乐音量 ({tempSettings.musicVolume || 30}%)</Label>
                    <Slider
                      value={[tempSettings.musicVolume || 30]}
                      onValueChange={([value]) => handleSettingChange('musicVolume', value)}
                      max={100} min={0} step={1}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
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
