<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
=======
import React, { useState } from 'react';
>>>>>>> abf7476 (add wallpaper)

interface Subscriber {
  id: string;
  username: string;
  email: string;
  subscriptionLevel: 'basic' | 'premium' | 'vip';
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  lastPayment: string;
  totalSpent: number;
}

const RevenueManagement: React.FC = () => {
<<<<<<< HEAD
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  
=======
  const [subscribers] = useState<Subscriber[]>([
    {
      id: 'sub001',
      username: 'player1',
      email: 'player1@example.com',
      subscriptionLevel: 'premium',
      status: 'active',
      startDate: '2023-01-15',
      endDate: '2023-07-15',
      lastPayment: '2023-06-15',
      totalSpent: 60
    },
    {
      id: 'sub002',
      username: 'player2',
      email: 'player2@example.com',
      subscriptionLevel: 'vip',
      status: 'active',
      startDate: '2023-03-20',
      endDate: '2023-09-20',
      lastPayment: '2023-06-20',
      totalSpent: 150
    }
  ]);

>>>>>>> abf7476 (add wallpaper)
  const [revenueData] = useState({
    monthly: [
      { month: '2023-01', revenue: 12000 },
      { month: '2023-02', revenue: 15000 },
      { month: '2023-03', revenue: 18000 },
      { month: '2023-04', revenue: 14000 },
      { month: '2023-05', revenue: 21000 },
      { month: '2023-06', revenue: 19000 }
    ],
    sources: [
      { source: '基础订阅', percentage: 40, amount: 8000 },
      { source: '高级订阅', percentage: 35, amount: 7000 },
      { source: 'VIP订阅', percentage: 20, amount: 4000 },
      { source: '其他', percentage: 5, amount: 1000 }
    ]
  });

  const [subscriptionStats] = useState({
    totalSubscribers: 1240,
    activeSubscribers: 980,
    churnRate: 5.2,
    conversionRate: 12.5
  });

<<<<<<< HEAD
  // 模拟从 subscribers 表获取数据
  useEffect(() => {
    const fetchSubscribers = async () => {
      setLoading(true);
      
      // 模拟从 subscribers 表获取数据
      // 在实际应用中，这里会是真实的API调用
      const mockSubscribers: Subscriber[] = [
        {
          id: 'sub001',
          username: 'player1',
          email: 'player1@example.com',
          subscriptionLevel: 'premium',
          status: 'active',
          startDate: '2023-01-15',
          endDate: '2023-07-15',
          lastPayment: '2023-06-15',
          totalSpent: 60
        },
        {
          id: 'sub002',
          username: 'player2',
          email: 'player2@example.com',
          subscriptionLevel: 'vip',
          status: 'active',
          startDate: '2023-03-20',
          endDate: '2023-09-20',
          lastPayment: '2023-06-20',
          totalSpent: 150
        },
        {
          id: 'sub003',
          username: 'player3',
          email: 'player3@example.com',
          subscriptionLevel: 'basic',
          status: 'expired',
          startDate: '2023-01-10',
          endDate: '2023-04-10',
          lastPayment: '2023-03-10',
          totalSpent: 30
        },
        {
          id: 'sub004',
          username: 'player4',
          email: 'player4@example.com',
          subscriptionLevel: 'premium',
          status: 'cancelled',
          startDate: '2022-12-01',
          endDate: '2023-03-01',
          lastPayment: '2023-02-01',
          totalSpent: 90
        }
      ];
      
      setSubscribers(mockSubscribers);
      setFilteredSubscribers(mockSubscribers);
      setLoading(false);
    };
    
    fetchSubscribers();
  }, []);

=======
>>>>>>> abf7476 (add wallpaper)
  const handleAdjustSubscription = (userId: string) => {
    // 实际项目中这里会调用API调整用户订阅状态
    console.log('调整用户订阅状态:', userId);
    alert(`调整用户 ${userId} 的订阅状态`);
  };

  const handleBatchOperation = () => {
    // 实际项目中这里会执行批量操作
    console.log('执行批量操作');
    alert('执行批量操作');
  };

<<<<<<< HEAD
  const handleRenewalReminder = (userId: string) => {
    // 实际项目中这里会发送续费提醒
    console.log('发送续费提醒给用户:', userId);
    alert(`已向用户 ${userId} 发送续费提醒`);
  };

  const getSubscriptionLevelName = (level: string) => {
    switch (level) {
      case 'basic': return '基础版';
      case 'premium': return '高级版';
      case 'vip': return 'VIP版';
      default: return level;
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'expired': return 'status-expired';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'expired': return '已过期';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  if (loading) {
    return <div>加载订阅用户数据中...</div>;
  }

=======
>>>>>>> abf7476 (add wallpaper)
  return (
    <div className="revenue-management">
      <h2>收入管理</h2>
      
      {/* 订阅用户管理 */}
      <div className="subscriber-management">
        <h3>订阅用户管理</h3>
        <div className="subscriber-stats">
          <div className="stat-card">
            <h4>总订阅用户</h4>
            <p>{subscriptionStats.totalSubscribers}</p>
          </div>
          <div className="stat-card">
            <h4>活跃用户</h4>
            <p>{subscriptionStats.activeSubscribers}</p>
          </div>
          <div className="stat-card">
            <h4>流失率</h4>
            <p>{subscriptionStats.churnRate}%</p>
          </div>
          <div className="stat-card">
            <h4>转化率</h4>
            <p>{subscriptionStats.conversionRate}%</p>
          </div>
        </div>
        
        <table className="subscriber-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>邮箱</th>
              <th>订阅等级</th>
              <th>状态</th>
              <th>开始日期</th>
              <th>结束日期</th>
              <th>最后付款</th>
              <th>总消费</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
<<<<<<< HEAD
            {filteredSubscribers.map(subscriber => (
              <tr key={subscriber.id}>
                <td>{subscriber.username}</td>
                <td>{subscriber.email}</td>
                <td>{getSubscriptionLevelName(subscriber.subscriptionLevel)}</td>
                <td>
                  <span className={`status ${getStatusClassName(subscriber.status)}`}>
                    {getStatusDisplayName(subscriber.status)}
=======
            {subscribers.map(subscriber => (
              <tr key={subscriber.id}>
                <td>{subscriber.username}</td>
                <td>{subscriber.email}</td>
                <td>{subscriber.subscriptionLevel}</td>
                <td>
                  <span className={`status ${subscriber.status}`}>
                    {subscriber.status}
>>>>>>> abf7476 (add wallpaper)
                  </span>
                </td>
                <td>{subscriber.startDate}</td>
                <td>{subscriber.endDate}</td>
                <td>{subscriber.lastPayment}</td>
                <td>¥{subscriber.totalSpent}</td>
                <td>
<<<<<<< HEAD
                  <div className="action-buttons">
                    <button 
                      onClick={() => handleAdjustSubscription(subscriber.id)}
                      className="btn btn-small btn-primary"
                    >
                      调整权益
                    </button>
                    <button 
                      onClick={() => handleRenewalReminder(subscriber.id)}
                      className="btn btn-small btn-secondary"
                    >
                      续费提醒
                    </button>
                  </div>
=======
                  <button onClick={() => handleAdjustSubscription(subscriber.id)}>
                    调整权益
                  </button>
>>>>>>> abf7476 (add wallpaper)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="batch-operations">
<<<<<<< HEAD
          <button onClick={handleBatchOperation} className="btn btn-primary">批量操作用户权益</button>
=======
          <button onClick={handleBatchOperation}>批量操作用户权益</button>
>>>>>>> abf7476 (add wallpaper)
        </div>
      </div>
      
      {/* 收入统计 */}
      <div className="revenue-analytics">
        <h3>收入统计</h3>
        
        <div className="revenue-charts">
          <div className="chart-container">
            <h4>月度收入趋势</h4>
            <div className="chart-placeholder">
              {/* 实际项目中这里会是一个图表组件 */}
<<<<<<< HEAD
              <div className="chart-bars">
                {revenueData.monthly.map((data, index) => (
                  <div key={index} className="chart-bar">
                    <div 
                      className="bar-fill" 
                      style={{ height: `${(data.revenue / 25000) * 100}%` }}
                    ></div>
                    <div className="bar-label">{data.month}</div>
                    <div className="bar-value">¥{data.revenue}</div>
                  </div>
                ))}
              </div>
=======
              <p>月度收入趋势图 (占位符)</p>
              <ul>
                {revenueData.monthly.map((data, index) => (
                  <li key={index}>{data.month}: ¥{data.revenue}</li>
                ))}
              </ul>
>>>>>>> abf7476 (add wallpaper)
            </div>
          </div>
          
          <div className="chart-container">
            <h4>收入来源分布</h4>
            <div className="chart-placeholder">
              {/* 实际项目中这里会是一个图表组件 */}
<<<<<<< HEAD
              <div className="pie-chart">
                {revenueData.sources.map((source, index) => (
                  <div key={index} className="pie-slice">
                    <div className="slice-info">
                      <span className="slice-name">{source.source}</span>
                      <span className="slice-value">{source.percentage}% (¥{source.amount})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="revenue-stats">
          <h4>用户付费行为分析</h4>
          <div className="behavior-stats">
            <div className="stat-item">
              <h5>平均订阅时长</h5>
              <p>4.2个月</p>
            </div>
            <div className="stat-item">
              <h5>付费用户占比</h5>
              <p>24.5%</p>
            </div>
            <div className="stat-item">
              <h5>月活跃付费用户</h5>
              <p>890人</p>
            </div>
            <div className="stat-item">
              <h5>客单价</h5>
              <p>¥78.5</p>
=======
              <p>收入来源分布图 (占位符)</p>
              <ul>
                {revenueData.sources.map((source, index) => (
                  <li key={index}>{source.source}: {source.percentage}% (¥{source.amount})</li>
                ))}
              </ul>
>>>>>>> abf7476 (add wallpaper)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueManagement;