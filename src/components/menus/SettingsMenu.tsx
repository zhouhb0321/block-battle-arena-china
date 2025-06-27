
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Gamepad, Palette } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import UserProfileSettings from '../UserProfileSettings';
import ControlsTab from '../settings/ControlsTab';
import VisualTab from '../settings/VisualTab';

interface SettingsMenuProps {
  onBack: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onBack }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 优化返回按钮 - 更明显的样式 */}
      <div className="flex items-center mb-6">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="mr-4 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 shadow-md px-4 py-2"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回主菜单
        </Button>
        <h2 className="text-3xl font-bold">设置</h2>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            用户资料
          </TabsTrigger>
          <TabsTrigger value="controls" className="flex items-center gap-2">
            <Gamepad className="w-4 h-4" />
            控制设置
          </TabsTrigger>
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            视觉设置
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            主题
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <UserProfileSettings />
        </TabsContent>

        <TabsContent value="controls">
          <ControlsTab />
        </TabsContent>

        <TabsContent value="visual">
          <VisualTab />
        </TabsContent>

        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle>主题设置</CardTitle>
              <CardDescription>选择你喜欢的主题风格</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="h-16 flex flex-col items-center gap-2"
                >
                  <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded"></div>
                  浅色主题
                </Button>
                
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="h-16 flex flex-col items-center gap-2"
                >
                  <div className="w-6 h-6 bg-gray-800 border-2 border-gray-600 rounded"></div>
                  深色主题
                </Button>
                
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  onClick={() => setTheme('system')}
                  className="h-16 flex flex-col items-center gap-2"
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-white to-gray-800 border-2 border-gray-400 rounded"></div>
                  跟随系统
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsMenu;
