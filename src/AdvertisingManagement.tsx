import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  // 模拟从 advertisements 表获取数据
  useEffect(() => {
    const fetchAds = async () => {
      setLoading(true);
      
      // 模拟从 advertisements 表获取数据
      // 在实际应用中，这里会是真实的API调用
      const mockAds: Advertisement[] = [
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
        },
        {
          id: 'ad002',
          title: '新用户专享',
          content: '新用户注册即送7天VIP体验',
          startTime: '2023-06-10',
          endTime: '2023-07-10',
          position: 'sidebar',
          status: 'active',
          impressions: 8500,
          clicks: 425,
          ctr: 5.0,
          revenue: 0,
          targetRegions: ['全国'],
          languages: ['zh']
        },
        {
          id: 'ad003',
          title: '周年庆典',
          content: '平台上线一周年，多重好礼等你拿',
          startTime: '2023-07-01',
          endTime: '2023-07-07',
          position: 'popup',
          status: 'scheduled',
          impressions: 0,
          clicks: 0,
          ctr: 0,
          revenue: 0,
          targetRegions: ['全国'],
          languages: ['zh', 'en']
        }
      ];
      
      setAds(mockAds);
      setLoading(false);
    };
    
    fetchAds();
  }, []);

  const handleCreateAd = () => {
    if (!newAd.title || !newAd.content || !newAd.startTime || !newAd.endTime) {
      alert('请填写所有必填字段');
      return;
    }
    
    // 实际项目中这里会调用API创建广告
    const newAdWithId: Advertisement = {
      ...newAd,
      id: `ad${String(ads.length + 1).padStart(3, '0')}`,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      revenue: 0
    };
    
    setAds([...ads, newAdWithId]);
    setNewAd({
      title: '',
      content: '',
      startTime: '',
      endTime: '',
      position: 'top',
      status: 'scheduled',
      targetRegions: [],
      languages: ['zh']
    });
    
    console.log('创建新广告:', newAd);
    alert('广告创建成功');
  };

  const handleUpdateAd = (id: string) => {
    // 实际项目中这里会调用API更新广告
    console.log('更新广告:', id);
    alert(`更新广告 ${id}`);
  };

  const handleDeleteAd = (id: string) => {
    // 实际项目中这里会调用API删除广告
    setAds(ads.filter(ad => ad.id !== id));
    console.log('删除广告:', id);
    alert(`删除广告 ${id}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewAd(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTargetRegionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const regions = e.target.value.split(',').map(region => region.trim());
    setNewAd(prev => ({
      ...prev,
      targetRegions: regions
    }));
  };

  const handleLanguagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const languages = e.target.value.split(',').map(lang => lang.trim());
    setNewAd(prev => ({
      ...prev,
      languages: languages
    }));
  };

  const getPositionDisplayName = (position: string) => {
    switch (position) {
      case 'top': return '顶部';
      case 'bottom': return '底部';
      case 'sidebar': return '侧边栏';
      case 'popup': return '弹窗';
      default: return position;
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'paused': return 'status-paused';
      case 'scheduled': return 'status-scheduled';
      case 'expired': return 'status-expired';
      default: return '';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'active': return '投放中';
      case 'paused': return '已暂停';
      case 'scheduled': return '计划中';
      case 'expired': return '已过期';
      default: return status;
    }
  };

  if (loading) {
    return <div>加载广告数据中...</div>;
  }

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
            className="form-input"
          />
          <select 
            name="position" 
            value={newAd.position}
            onChange={handleInputChange}
            className="form-select"
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
            className="form-textarea"
          />
        </div>
        
        <div className="form-row">
          <input
            type="date"
            name="startTime"
            value={newAd.startTime}
            onChange={handleInputChange}
            className="form-input"
          />
          <input
            type="date"
            name="endTime"
            value={newAd.endTime}
            onChange={handleInputChange}
            className="form-input"
          />
        </div>
        
        <div className="form-row">
          <input
            type="text"
            placeholder="目标地区 (用逗号分隔，如: 北京,上海,广州)"
            value={newAd.targetRegions.join(', ')}
            onChange={handleTargetRegionsChange}
            className="form-input"
          />
          <input
            type="text"
            placeholder="语言 (用逗号分隔，如: zh,en)"
            value={newAd.languages.join(', ')}
            onChange={handleLanguagesChange}
            className="form-input"
          />
        </div>
        
        <button onClick={handleCreateAd} className="btn btn-primary">保存广告</button>
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
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {ads.map(ad => (
              <tr key={ad.id}>
                <td>{ad.title}</td>
                <td>{getPositionDisplayName(ad.position)}</td>
                <td>
                  <span className={`status ${getStatusClassName(ad.status)}`}>
                    {getStatusDisplayName(ad.status)}
                  </span>
                </td>
                <td>{ad.impressions.toLocaleString()}</td>
                <td>{ad.clicks.toLocaleString()}</td>
                <td>{ad.ctr}%</td>
                <td>¥{ad.revenue}</td>
                <td>{ad.targetRegions.join(', ')}</td>
                <td>{ad.startTime} 至 {ad.endTime}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => handleUpdateAd(ad.id)}
                      className="btn btn-small btn-primary"
                    >
                      编辑
                    </button>
                    <button 
                      onClick={() => handleDeleteAd(ad.id)}
                      className="btn btn-small btn-danger"
                    >
                      删除
                    </button>
                  </div>
                </td>
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
            <p>收入: ¥1,200</p>
          </div>
          <div className="stat-card">
            <h4>上海市</h4>
            <p>展示: 4,200</p>
            <p>点击: 120</p>
            <p>CTR: 2.86%</p>
            <p>收入: ¥980</p>
          </div>
          <div className="stat-card">
            <h4>广州市</h4>
            <p>展示: 3,800</p>
            <p>点击: 90</p>
            <p>CTR: 2.37%</p>
            <p>收入: ¥750</p>
          </div>
          <div className="stat-card">
            <h4>其他地区</h4>
            <p>展示: 8,500</p>
            <p>点击: 210</p>
            <p>CTR: 2.47%</p>
            <p>收入: ¥1,800</p>
          </div>
        </div>
      </div>
      
      {/* 广告效果分析 */}
      <div className="ad-performance-analysis">
        <h3>广告效果分析</h3>
        <div className="analysis-cards">
          <div className="analysis-card">
            <h4>总体展示次数</h4>
            <p className="analysis-value">21,700</p>
          </div>
          <div className="analysis-card">
            <h4>总体点击次数</h4>
            <p className="analysis-value">570</p>
          </div>
          <div className="analysis-card">
            <h4>平均点击率</h4>
            <p className="analysis-value">2.63%</p>
          </div>
          <div className="analysis-card">
            <h4>总收入</h4>
            <p className="analysis-value">¥3,730</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvertisingManagement;