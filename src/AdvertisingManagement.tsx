import React, { useState } from 'react';

interface Advertisement {
  id: string;
  title: string;
  content: string;
  startTime: string;
  endTime: string;
  position: 'top' | 'bottom' | 'sidebar' | 'popup';
  status: 'active' | 'paused' | 'scheduled' | 'expired';
  impressions: number;
  clicks: number;
  ctr: number; // Click-through rate
  revenue: number;
  targetRegions: string[];
  languages: string[];
}

const AdvertisingManagement: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([
    {
      id: 'ad001',
      title: '夏季特惠',
      content: '限时优惠，升级VIP仅需¥99/月',
      startTime: '2023-06-01',
      endTime: '2023-06-30',
      position: 'top',
      status: 'active',
      impressions: 15000,
      clicks: 300,
      ctr: 2.0,
      revenue: 1200,
      targetRegions: ['北京', '上海', '广州'],
      languages: ['zh']
    }
  ]);

  const [newAd, setNewAd] = useState<Omit<Advertisement, 'id' | 'impressions' | 'clicks' | 'ctr' | 'revenue'>>({
    title: '',
    content: '',
    startTime: '',
    endTime: '',
    position: 'top',
    status: 'scheduled',
    targetRegions: [],
    languages: ['zh']
  });

  const handleCreateAd = () => {
    // 实际项目中这里会调用API创建广告
    console.log('创建新广告:', newAd);
    alert('创建新广告');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewAd(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePositionChange = (position: Advertisement['position']) => {
    setNewAd(prev => ({
      ...prev,
      position
    }));
  };

  return (
    <div className="advertising-management">
      <h2>广告管理</h2>
      
      {/* 广告创建/编辑表单 */}
      <div className="ad-form">
        <h3>创建/编辑广告</h3>
        <div className="form-row">
          <input
            type="text"
            name="title"
            placeholder="广告标题"
            value={newAd.title}
            onChange={handleInputChange}
          />
          <select 
            name="position" 
            value={newAd.position}
            onChange={(e) => handlePositionChange(e.target.value as Advertisement['position'])}
          >
            <option value="top">顶部</option>
            <option value="bottom">底部</option>
            <option value="sidebar">侧边栏</option>
            <option value="popup">弹窗</option>
          </select>
        </div>
        
        <div className="form-row">
          <textarea
            name="content"
            placeholder="广告内容"
            value={newAd.content}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-row">
          <input
            type="date"
            name="startTime"
            value={newAd.startTime}
            onChange={handleInputChange}
          />
          <input
            type="date"
            name="endTime"
            value={newAd.endTime}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-row">
          <input
            type="text"
            placeholder="目标地区 (用逗号分隔)"
            onChange={(e) => setNewAd(prev => ({
              ...prev,
              targetRegions: e.target.value.split(',').map(region => region.trim())
            }))}
          />
          <input
            type="text"
            placeholder="语言 (用逗号分隔)"
            defaultValue="zh"
            onChange={(e) => setNewAd(prev => ({
              ...prev,
              languages: e.target.value.split(',').map(lang => lang.trim())
            }))}
          />
        </div>
        
        <button onClick={handleCreateAd}>保存广告</button>
      </div>
      
      {/* 广告列表和效果分析 */}
      <div className="ad-list">
        <h3>广告列表与效果分析</h3>
        <table className="ad-table">
          <thead>
            <tr>
              <th>广告标题</th>
              <th>展示位置</th>
              <th>状态</th>
              <th>展示次数</th>
              <th>点击次数</th>
              <th>点击率 (CTR)</th>
              <th>收入</th>
              <th>目标地区</th>
              <th>时间段</th>
            </tr>
          </thead>
          <tbody>
            {ads.map(ad => (
              <tr key={ad.id}>
                <td>{ad.title}</td>
                <td>{ad.position}</td>
                <td>
                  <span className={`status ${ad.status}`}>
                    {ad.status}
                  </span>
                </td>
                <td>{ad.impressions}</td>
                <td>{ad.clicks}</td>
                <td>{ad.ctr}%</td>
                <td>¥{ad.revenue}</td>
                <td>{ad.targetRegions.join(', ')}</td>
                <td>{ad.startTime} 至 {ad.endTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 地区广告效果统计 */}
      <div className="ad-regional-stats">
        <h3>地区广告效果统计</h3>
        <div className="stats-container">
          <div className="stat-card">
            <h4>北京市</h4>
            <p>展示: 5,000</p>
            <p>点击: 150</p>
            <p>CTR: 3.0%</p>
          </div>
          <div className="stat-card">
            <h4>上海市</h4>
            <p>展示: 4,200</p>
            <p>点击: 120</p>
            <p>CTR: 2.86%</p>
          </div>
          <div className="stat-card">
            <h4>广州市</h4>
            <p>展示: 3,800</p>
            <p>点击: 90</p>
            <p>CTR: 2.37%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvertisingManagement;