import React, { useState } from 'react';
import ResourceManagement from './ResourceManagement';
import LogManagement from './LogManagement';
import GameRecordManagement from './GameRecordManagement';
import RevenueManagement from './RevenueManagement';
import AdvertisingManagement from './AdvertisingManagement';
import DatabaseOptimization from './DatabaseOptimization';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('resources');

  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      <div className="tabs">
        <button 
          className={activeTab === 'resources' ? 'active' : ''}
          onClick={() => setActiveTab('resources')}
        >
          资源管理
        </button>
        <button 
          className={activeTab === 'logs' ? 'active' : ''}
          onClick={() => setActiveTab('logs')}
        >
          系统日志
        </button>
        <button 
          className={activeTab === 'game-records' ? 'active' : ''}
          onClick={() => setActiveTab('game-records')}
        >
          游戏记录
        </button>
        <button 
          className={activeTab === 'revenue' ? 'active' : ''}
          onClick={() => setActiveTab('revenue')}
        >
          收入管理
        </button>
        <button 
          className={activeTab === 'advertising' ? 'active' : ''}
          onClick={() => setActiveTab('advertising')}
        >
          广告管理
        </button>
        <button 
          className={activeTab === 'database' ? 'active' : ''}
          onClick={() => setActiveTab('database')}
        >
          数据结构优化
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'resources' && <ResourceManagement />}
        {activeTab === 'logs' && <LogManagement />}
        {activeTab === 'game-records' && <GameRecordManagement />}
        {activeTab === 'revenue' && <RevenueManagement />}
        {activeTab === 'advertising' && <AdvertisingManagement />}
        {activeTab === 'database' && <DatabaseOptimization />}
      </div>
    </div>
  );
};

export default AdminPanel;