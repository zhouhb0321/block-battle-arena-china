import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [logType, setLogType] = useState('all');
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // 模拟从不同表获取日志数据
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      
      // 模拟从 user_session_logs, admin_activity_logs, security_events 表获取数据
      // 在实际应用中，这里会是真实的API调用
      const mockLogs: LogEntry[] = [
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
        },
        {
          id: 5,
          timestamp: '2023-06-01 14:05:00',
          type: 'game',
          userId: 'user001',
          username: 'player1',
          action: '游戏结束',
          ipAddress: '192.168.1.100',
          details: '用户完成经典模式游戏，得分15000',
          severity: 'low'
        },
        {
          id: 6,
          timestamp: '2023-06-01 15:30:00',
          type: 'admin',
          userId: 'admin001',
          username: 'administrator',
          action: '修改配置',
          ipAddress: '192.168.1.200',
          details: '修改游戏服务器配置参数',
          severity: 'medium'
        }
      ];
      
      setLogs(mockLogs);
      setFilteredLogs(mockLogs);
      setLoading(false);
    };
    
    fetchLogs();
  }, []);

  // 应用筛选条件
  useEffect(() => {
    let result = [...logs];
    
    // 关键词搜索
    if (searchTerm) {
      result = result.filter(log => 
        log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress.includes(searchTerm)
      );
    }
    
    // 时间范围筛选
    if (dateRange.start && dateRange.end) {
      result = result.filter(log => {
        const logDate = new Date(log.timestamp);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setDate(endDate.getDate() + 1); // 包含结束日期当天
        return logDate >= startDate && logDate <= endDate;
      });
    }
    
    // 日志类型筛选
    if (logType !== 'all') {
      result = result.filter(log => log.type === logType);
    }
    
    setFilteredLogs(result);
  }, [searchTerm, dateRange, logType, logs]);

  const handleSearch = () => {
    // 搜索逻辑已在useEffect中实现
  };

  const handleExport = (format: 'csv') => {
    if (selectedLogs.length === 0) {
      alert('请先选择要导出的日志记录');
      return;
    }
    
    const logsToExport = logs.filter(log => selectedLogs.includes(log.id));
    
    if (format === 'csv') {
      // 生成CSV内容
      const headers = ['时间', '类型', '用户ID', '用户名', '操作', 'IP地址', '详情', '重要性'];
      const csvContent = [
        headers.join(','),
        ...logsToExport.map(log => [
          log.timestamp,
          log.type,
          log.userId || '',
          log.username || '',
          log.action,
          log.ipAddress,
          log.details,
          log.severity
        ].map(field => `"${field}"`).join(','))
      ].join('\n');
      
      // 创建并下载CSV文件
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `logs_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`成功导出 ${selectedLogs.length} 条日志记录`);
    }
  };

  const toggleLogSelection = (id: number) => {
    if (selectedLogs.includes(id)) {
      setSelectedLogs(selectedLogs.filter(logId => logId !== id));
    } else {
      setSelectedLogs([...selectedLogs, id]);
    }
  };

  const selectAllLogs = () => {
    if (selectedLogs.length === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(filteredLogs.map(log => log.id));
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

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'login': return '登录日志';
      case 'game': return '游戏日志';
      case 'admin': return '管理日志';
      case 'security': return '安全日志';
      default: return type;
    }
  };

  if (loading) {
    return <div>加载日志中...</div>;
  }

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
            className="form-input"
          />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            className="form-input"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            className="form-input"
          />
          <select 
            value={logType} 
            onChange={(e) => setLogType(e.target.value)}
            className="form-select"
          >
            <option value="all">所有日志类型</option>
            <option value="login">登录日志</option>
            <option value="game">游戏日志</option>
            <option value="admin">管理操作日志</option>
            <option value="security">安全事件日志</option>
          </select>
          <button onClick={handleSearch} className="btn btn-primary">搜索</button>
        </div>
        
        <div className="filter-row">
          <input
            type="text"
            placeholder="用户ID精确查找"
            className="form-input"
          />
          <button onClick={() => handleExport('csv')} className="btn btn-secondary">导出CSV</button>
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
                  checked={selectedLogs.length === filteredLogs.length && filteredLogs.length > 0}
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
            {filteredLogs.map(log => (
              <tr key={log.id} className={getSeverityClass(log.severity)}>
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedLogs.includes(log.id)}
                    onChange={() => toggleLogSelection(log.id)}
                  />
                </td>
                <td>{log.timestamp}</td>
                <td>{getTypeDisplayName(log.type)}</td>
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
        <p>筛选后: {filteredLogs.length} 条日志</p>
        <p>已选择: {selectedLogs.length} 条日志</p>
      </div>
    </div>
  );
};

export default LogManagement;