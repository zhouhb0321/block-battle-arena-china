import React, { useState } from 'react';

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
            {subscribers.map(subscriber => (
              <tr key={subscriber.id}>
                <td>{subscriber.username}</td>
                <td>{subscriber.email}</td>
                <td>{subscriber.subscriptionLevel}</td>
                <td>
                  <span className={`status ${subscriber.status}`}>
                    {subscriber.status}
                  </span>
                </td>
                <td>{subscriber.startDate}</td>
                <td>{subscriber.endDate}</td>
                <td>{subscriber.lastPayment}</td>
                <td>¥{subscriber.totalSpent}</td>
                <td>
                  <button onClick={() => handleAdjustSubscription(subscriber.id)}>
                    调整权益
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="batch-operations">
          <button onClick={handleBatchOperation}>批量操作用户权益</button>
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
              <p>月度收入趋势图 (占位符)</p>
              <ul>
                {revenueData.monthly.map((data, index) => (
                  <li key={index}>{data.month}: ¥{data.revenue}</li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="chart-container">
            <h4>收入来源分布</h4>
            <div className="chart-placeholder">
              {/* 实际项目中这里会是一个图表组件 */}
              <p>收入来源分布图 (占位符)</p>
              <ul>
                {revenueData.sources.map((source, index) => (
                  <li key={index}>{source.source}: {source.percentage}% (¥{source.amount})</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueManagement;