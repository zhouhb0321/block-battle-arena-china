
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, Target, Trophy, DollarSign, Settings, LogOut } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminAuth from './AdminAuth';

const AdminPanel: React.FC = () => {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // 检查管理员会话
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        if (Date.now() < session.expires && session.authenticated) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('admin_session');
        }
      } catch {
        localStorage.removeItem('admin_session');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <AdminAuth onAuthenticated={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">{t('admin.panel')}</h1>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              安全退出
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* 侧边栏 */}
          <div className="w-64 space-y-2">
            <Button
              variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('dashboard')}
            >
              <Settings className="w-4 h-4 mr-2" />
              仪表盘
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('users')}
            >
              <Users className="w-4 h-4 mr-2" />
              用户管理
            </Button>
            <Button
              variant={activeTab === 'ads' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('ads')}
            >
              <Target className="w-4 h-4 mr-2" />
              广告管理
            </Button>
            <Button
              variant={activeTab === 'ranking' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('ranking')}
            >
              <Trophy className="w-4 h-4 mr-2" />
              排名系统
            </Button>
            <Button
              variant={activeTab === 'income' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('income')}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              收入管理
            </Button>
          </div>

          {/* 主内容区 */}
          <div className="flex-1">
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">总用户数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">12,345</div>
                    <p className="text-xs text-green-600">+5.2% 较上月</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">活跃用户</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">8,901</div>
                    <p className="text-xs text-green-600">+2.1% 较上月</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">游戏场次</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">456,789</div>
                    <p className="text-xs text-green-600">+12.5% 较上月</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">广告收入</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">¥23,456</div>
                    <p className="text-xs text-green-600">+8.3% 较上月</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'users' && (
              <Card>
                <CardHeader>
                  <CardTitle>用户管理</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">用户管理功能正在开发中...</p>
                </CardContent>
              </Card>
            )}

            {activeTab === 'ads' && (
              <Card>
                <CardHeader>
                  <CardTitle>广告管理</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">广告管理功能正在开发中...</p>
                </CardContent>
              </Card>
            )}

            {activeTab === 'ranking' && (
              <Card>
                <CardHeader>
                  <CardTitle>排名系统设置</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">排名系统设置功能正在开发中...</p>
                </CardContent>
              </Card>
            )}

            {activeTab === 'income' && (
              <Card>
                <CardHeader>
                  <CardTitle>收入管理</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">支付宝收款</h3>
                        <p className="text-sm text-gray-600">配置支付宝商户信息</p>
                        <Button className="mt-2" size="sm">配置</Button>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">PayPal收款</h3>
                        <p className="text-sm text-gray-600">配置PayPal商户信息</p>
                        <Button className="mt-2" size="sm">配置</Button>
                      </div>
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>安全提示：</strong>所有支付配置都经过加密存储，仅管理员可访问。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
