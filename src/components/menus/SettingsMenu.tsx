
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Settings, Gamepad2 } from 'lucide-react';

interface SettingsMenuProps {
  onBack: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h2 className="text-3xl font-bold">配置</h2>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            用户配置
          </TabsTrigger>
          <TabsTrigger value="controls" className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" />
            控制设置
          </TabsTrigger>
          <TabsTrigger value="game" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            游戏设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>用户资料</CardTitle>
              <CardDescription>管理您的个人信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">用户名</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="输入用户名"
                  />
                  <Button>修改</Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">普通用户可修改一次用户名</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">头像</label>
                <Button variant="outline">上传头像</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="controls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>键位设置</CardTitle>
              <CardDescription>自定义游戏控制键位</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">左移</label>
                  <Button variant="outline" className="w-full">A</Button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">右移</label>
                  <Button variant="outline" className="w-full">D</Button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">软降</label>
                  <Button variant="outline" className="w-full">S</Button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">硬降</label>
                  <Button variant="outline" className="w-full">W</Button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">顺时针旋转</label>
                  <Button variant="outline" className="w-full">K</Button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">逆时针旋转</label>
                  <Button variant="outline" className="w-full">J</Button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">180度旋转</label>
                  <Button variant="outline" className="w-full">I</Button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">暂存</label>
                  <Button variant="outline" className="w-full">SPACE</Button>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">手感设置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">DAS (ms)</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-md" defaultValue="167" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">ARR (ms)</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-md" defaultValue="33" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">DCD (ms)</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-md" defaultValue="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">SDF (倍数)</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-md" defaultValue="20" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="game" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>视觉设置</CardTitle>
              <CardDescription>调整游戏界面显示效果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">边框透明度</label>
                <input type="range" className="w-full" min="0" max="100" defaultValue="100" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">阴影透明度</label>
                <input type="range" className="w-full" min="0" max="100" defaultValue="50" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="grid" defaultChecked />
                <label htmlFor="grid" className="text-sm font-medium">显示网格</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ghost" defaultChecked />
                <label htmlFor="ghost" className="text-sm font-medium">显示幽灵方块</label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">边缘可视性</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option>正常</option>
                  <option>放大</option>
                  <option>缩小</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsMenu;
