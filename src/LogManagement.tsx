import React, { useState } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'login' | 'game' | 'admin' | 'security';
  userId?: string;
  username?: string;
  action: string;
  ipAddress: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const LogManagement: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 1,
      timestamp: '2023-06-01 10:30:00',
      type: 'login',
      userId: 'user001',
      username: 'player1',
      action: '用户登录',
      ipAddress: '192.168.1.100',
      details: '用户成功登录系统',
      severity: 'low'
    },
    {
      id: 2,
      timestamp: '2023-06-01 11:15:00',
      type: 'game',
      userId: 'user002',
      username: 'player2',
      action: '开始游戏',
      ipAddress: '192.168.1.101',
      details: '用户开始一局经典模式游戏',
      severity: 'low'
    },
    {
      id: 3,
      timestamp: '2023-06-01 12:45:00',
      type: 'admin',
      userId: 'admin001',
      username: 'administrator',
      action: '删除用户',
      ipAddress: '192.168.1.200',
      details: '删除违规用户user003',
      severity: 'high'
    },
    {
      id: 4,
      timestamp: '2023-06-01 13:20:00',
      type: 'security',
      userId: 'user004',
      username: 'player4',
      action: '多次登录失败',
      ipAddress: '192.168.1.102',
      details: '用户在短时间内登录失败5次',
      severity: 'critical'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [logType, setLogType] = useState('all');
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);

  const handleSearch = () => {
    // 实际项目中这里会调用API进行搜索
    console.log('搜索日志:', { searchTerm, dateRange, logType });
  };

  const handleExport = (format: 'csv') => {
    // 实际项目中这里会导出选定的日志记录
    console.log('导出日志为', format, '格式');
    alert(`导出${selectedLogs.length}条日志记录为${format.toUpperCase()}格式`);
  };

  const toggleLogSelection = (id: number) => {
    if (selectedLogs.includes(id)) {
      setSelectedLogs(selectedLogs.filter(logId => logId !== id));
    } else {
      setSelectedLogs([...selectedLogs, id]);
    }
  };

  const selectAllLogs = () => {
    if (selectedLogs.length === logs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(logs.map(log => log.id));
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'severity-critical';
      case 'high': return 'severity-high';
      case 'medium': return 'severity-medium';
      case 'low': return 'severity-low';
      default: return '';
    }
  };

  return (
    <div className="log-management">
      <h2>系统日志管理</h2>
      
      {/* 搜索和筛选区域 */}
      <div className="log-filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="关键词搜索（用户名、操作类型、IP地址）"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
          />
          <select value={logType} onChange={(e) => setLogType(e.target.value)}>
            <option value="all">所有日志类型</option>
            <option value="login">登录日志</option>
            <option value="game">游戏日志</option>
            <option value="admin">管理操作日志</option>
            <option value="security">安全事件日志</option>
          </select>
          <button onClick={handleSearch}>搜索</button>
        </div>
        
        <div className="filter-row">
          <input
            type="text"
            placeholder="用户ID精确查找"
          />
          <button onClick={() => handleExport('csv')}>导出CSV</button>
        </div>
      </div>
      
      {/* 日志表格 */}
      <div className="log-table-container">
        <table className="log-table">
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox" 
                  checked={selectedLogs.length === logs.length && logs.length > 0}
                  onChange={selectAllLogs}
                />
              </th>
              <th>时间</th>
              <th>类型</th>
              <th>用户</th>
              <th>操作</th>
              <th>IP地址</th>
              <th>详情</th>
              <th>重要性</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className={getSeverityClass(log.severity)}>
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedLogs.includes(log.id)}
                    onChange={() => toggleLogSelection(log.id)}
                  />
                </td>
                <td>{log.timestamp}</td>
                <td>{log.type}</td>
                <td>{log.username} ({log.userId})</td>
                <td>{log.action}</td>
                <td>{log.ipAddress}</td>
                <td>{log.details}</td>
                <td>{log.severity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="log-stats">
        <p>总计: {logs.length} 条日志</p>
        <p>已选择: {selectedLogs.length} 条日志</p>
      </div>
    </div>
  );
};

export default LogManagement;