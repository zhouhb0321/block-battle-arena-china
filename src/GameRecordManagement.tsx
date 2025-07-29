<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
=======
import React, { useState } from 'react';
>>>>>>> abf7476 (add wallpaper)

interface GameRecord {
  id: number;
  startTime: string;
  endTime: string;
  gameMode: 'classic' | 'battle' | 'challenge' | 'marathon';
  duration: number; // in seconds
  player: string;
  playerId: string;
  score: number;
  level: number;
  lines: number;
  pps: number; // pieces per second
  apm: number; // actions per minute
  result: 'win' | 'lose' | 'incomplete';
}

const GameRecordManagement: React.FC = () => {
<<<<<<< HEAD
  const [gameRecords, setGameRecords] = useState<GameRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
=======
  const [gameRecords] = useState<GameRecord[]>([
    {
      id: 1,
      startTime: '2023-06-01 10:00:00',
      endTime: '2023-06-01 10:15:30',
      gameMode: 'classic',
      duration: 930,
      player: 'player1',
      playerId: 'user001',
      score: 15000,
      level: 5,
      lines: 42,
      pps: 2.1,
      apm: 120,
      result: 'win'
    },
    {
      id: 2,
      startTime: '2023-06-01 11:30:00',
      endTime: '2023-06-01 11:42:15',
      gameMode: 'battle',
      duration: 735,
      player: 'player2',
      playerId: 'user002',
      score: 22500,
      level: 7,
      lines: 68,
      pps: 3.2,
      apm: 180,
      result: 'win'
    }
  ]);

>>>>>>> abf7476 (add wallpaper)
  const [searchParams, setSearchParams] = useState({
    player: '',
    gameMode: 'all',
    startDate: '',
    endDate: '',
    scoreMin: '',
    scoreMax: ''
  });

<<<<<<< HEAD
  // 模拟从不同表获取游戏数据
  useEffect(() => {
    const fetchGameRecords = async () => {
      setLoading(true);
      
      // 模拟从 game_matches, game_replays, user_session_logs 表整合数据
      // 在实际应用中，这里会是真实的API调用
      const mockRecords: GameRecord[] = [
        {
          id: 1,
          startTime: '2023-06-01 10:00:00',
          endTime: '2023-06-01 10:15:30',
          gameMode: 'classic',
          duration: 930,
          player: 'player1',
          playerId: 'user001',
          score: 15000,
          level: 5,
          lines: 42,
          pps: 2.1,
          apm: 120,
          result: 'win'
        },
        {
          id: 2,
          startTime: '2023-06-01 11:30:00',
          endTime: '2023-06-01 11:42:15',
          gameMode: 'battle',
          duration: 735,
          player: 'player2',
          playerId: 'user002',
          score: 22500,
          level: 7,
          lines: 68,
          pps: 3.2,
          apm: 180,
          result: 'win'
        },
        {
          id: 3,
          startTime: '2023-06-02 14:20:00',
          endTime: '2023-06-02 14:35:45',
          gameMode: 'marathon',
          duration: 945,
          player: 'player3',
          playerId: 'user003',
          score: 31200,
          level: 9,
          lines: 92,
          pps: 2.8,
          apm: 165,
          result: 'win'
        },
        {
          id: 4,
          startTime: '2023-06-02 16:10:00',
          endTime: '2023-06-02 16:22:30',
          gameMode: 'challenge',
          duration: 750,
          player: 'player1',
          playerId: 'user001',
          score: 18750,
          level: 6,
          lines: 55,
          pps: 2.4,
          apm: 140,
          result: 'incomplete'
        },
        {
          id: 5,
          startTime: '2023-06-03 09:45:00',
          endTime: '2023-06-03 10:05:15',
          gameMode: 'classic',
          duration: 1215,
          player: 'player4',
          playerId: 'user004',
          score: 27800,
          level: 8,
          lines: 81,
          pps: 3.0,
          apm: 175,
          result: 'win'
        }
      ];
      
      setGameRecords(mockRecords);
      setFilteredRecords(mockRecords);
      setLoading(false);
    };
    
    fetchGameRecords();
  }, []);

  // 应用筛选条件
  useEffect(() => {
    let result = [...gameRecords];
    
    // 按玩家搜索
    if (searchParams.player) {
      result = result.filter(record => 
        record.player.toLowerCase().includes(searchParams.player.toLowerCase())
      );
    }
    
    // 按游戏模式筛选
    if (searchParams.gameMode !== 'all') {
      result = result.filter(record => record.gameMode === searchParams.gameMode);
    }
    
    // 按时间范围查询
    if (searchParams.startDate && searchParams.endDate) {
      result = result.filter(record => {
        const recordDate = new Date(record.startTime);
        const startDate = new Date(searchParams.startDate);
        const endDate = new Date(searchParams.endDate);
        endDate.setDate(endDate.getDate() + 1); // 包含结束日期当天
        return recordDate >= startDate && recordDate <= endDate;
      });
    }
    
    // 按成绩范围筛选
    if (searchParams.scoreMin) {
      const minScore = parseInt(searchParams.scoreMin);
      result = result.filter(record => record.score >= minScore);
    }
    
    if (searchParams.scoreMax) {
      const maxScore = parseInt(searchParams.scoreMax);
      result = result.filter(record => record.score <= maxScore);
    }
    
    setFilteredRecords(result);
  }, [searchParams, gameRecords]);

=======
>>>>>>> abf7476 (add wallpaper)
  // 游戏模式统计
  const gameModeStats = [
    { mode: '经典模式', count: 42, percentage: 45 },
    { mode: '对战模式', count: 30, percentage: 32 },
    { mode: '挑战模式', count: 15, percentage: 16 },
    { mode: '马拉松模式', count: 7, percentage: 7 }
  ];

  // 游戏时长分布
  const durationStats = [
    { range: '0-5分钟', count: 20 },
    { range: '5-15分钟', count: 45 },
    { range: '15-30分钟', count: 25 },
    { range: '30分钟以上', count: 10 }
  ];

  // 成绩排行榜
  const leaderboard = [
    { player: 'player1', score: 55000, games: 25 },
    { player: 'player2', score: 52300, games: 22 },
    { player: 'player3', score: 48900, games: 30 },
    { player: 'player4', score: 45200, games: 18 }
  ];

  const handleSearch = () => {
<<<<<<< HEAD
    // 搜索逻辑已在useEffect中实现
=======
    // 实际项目中这里会调用API进行搜索
    console.log('搜索游戏记录:', searchParams);
>>>>>>> abf7476 (add wallpaper)
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

<<<<<<< HEAD
  const getGameModeDisplayName = (mode: string) => {
    switch (mode) {
      case 'classic': return '经典模式';
      case 'battle': return '对战模式';
      case 'challenge': return '挑战模式';
      case 'marathon': return '马拉松模式';
      default: return mode;
    }
  };

  const getResultDisplayName = (result: string) => {
    switch (result) {
      case 'win': return '胜利';
      case 'lose': return '失败';
      case 'incomplete': return '未完成';
      default: return result;
    }
  };

  if (loading) {
    return <div>加载游戏记录中...</div>;
  }

=======
>>>>>>> abf7476 (add wallpaper)
  return (
    <div className="game-record-management">
      <h2>游戏记录管理</h2>
      
      {/* 搜索区域 */}
      <div className="game-record-filters">
        <div className="filter-row">
          <input
            type="text"
            name="player"
            placeholder="按玩家搜索"
            value={searchParams.player}
            onChange={handleInputChange}
<<<<<<< HEAD
            className="form-input"
=======
>>>>>>> abf7476 (add wallpaper)
          />
          <select 
            name="gameMode" 
            value={searchParams.gameMode}
            onChange={handleInputChange}
<<<<<<< HEAD
            className="form-select"
=======
>>>>>>> abf7476 (add wallpaper)
          >
            <option value="all">所有游戏模式</option>
            <option value="classic">经典模式</option>
            <option value="battle">对战模式</option>
            <option value="challenge">挑战模式</option>
            <option value="marathon">马拉松模式</option>
          </select>
          <input
            type="date"
            name="startDate"
            value={searchParams.startDate}
            onChange={handleInputChange}
<<<<<<< HEAD
            className="form-input"
=======
>>>>>>> abf7476 (add wallpaper)
          />
          <input
            type="date"
            name="endDate"
            value={searchParams.endDate}
            onChange={handleInputChange}
<<<<<<< HEAD
            className="form-input"
          />
          <button onClick={handleSearch} className="btn btn-primary">搜索</button>
=======
          />
          <button onClick={handleSearch}>搜索</button>
>>>>>>> abf7476 (add wallpaper)
        </div>
        
        <div className="filter-row">
          <input
            type="number"
            name="scoreMin"
            placeholder="最低成绩"
            value={searchParams.scoreMin}
            onChange={handleInputChange}
<<<<<<< HEAD
            className="form-input"
=======
>>>>>>> abf7476 (add wallpaper)
          />
          <input
            type="number"
            name="scoreMax"
            placeholder="最高成绩"
            value={searchParams.scoreMax}
            onChange={handleInputChange}
<<<<<<< HEAD
            className="form-input"
=======
>>>>>>> abf7476 (add wallpaper)
          />
        </div>
      </div>
      
      {/* 游戏记录表格 */}
      <div className="game-record-table-container">
        <h3>游戏记录列表</h3>
        <table className="game-record-table">
          <thead>
            <tr>
              <th>开始时间</th>
              <th>结束时间</th>
              <th>游戏模式</th>
              <th>玩家</th>
              <th>持续时间</th>
              <th>分数</th>
              <th>等级</th>
              <th>消除行数</th>
              <th>PPS</th>
              <th>APM</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
<<<<<<< HEAD
            {filteredRecords.map(record => (
              <tr key={record.id}>
                <td>{record.startTime}</td>
                <td>{record.endTime}</td>
                <td>{getGameModeDisplayName(record.gameMode)}</td>
=======
            {gameRecords.map(record => (
              <tr key={record.id}>
                <td>{record.startTime}</td>
                <td>{record.endTime}</td>
                <td>{record.gameMode}</td>
>>>>>>> abf7476 (add wallpaper)
                <td>{record.player}</td>
                <td>{Math.floor(record.duration / 60)}分{record.duration % 60}秒</td>
                <td>{record.score}</td>
                <td>{record.level}</td>
                <td>{record.lines}</td>
                <td>{record.pps.toFixed(2)}</td>
                <td>{record.apm.toFixed(0)}</td>
<<<<<<< HEAD
                <td>{getResultDisplayName(record.result)}</td>
=======
                <td>{record.result}</td>
>>>>>>> abf7476 (add wallpaper)
              </tr>
            ))}
          </tbody>
        </table>
<<<<<<< HEAD
        
        {filteredRecords.length === 0 && (
          <div className="no-results">未找到匹配的游戏记录</div>
        )}
=======
>>>>>>> abf7476 (add wallpaper)
      </div>
      
      {/* 统计分析区域 */}
      <div className="game-analytics">
        <h3>游戏统计分析</h3>
        
        <div className="analytics-sections">
          {/* 游戏模式统计 */}
          <div className="analytics-section">
            <h4>热门游戏模式</h4>
            <ul>
              {gameModeStats.map((stat, index) => (
                <li key={index}>
                  <span>{stat.mode}</span>
                  <span>{stat.count} 局 ({stat.percentage}%)</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* 游戏时长分布 */}
          <div className="analytics-section">
            <h4>游戏时长分布</h4>
            <ul>
              {durationStats.map((stat, index) => (
                <li key={index}>
                  <span>{stat.range}</span>
                  <span>{stat.count} 局</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* 成绩排行榜 */}
          <div className="analytics-section">
            <h4>成绩排行榜</h4>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>玩家</th>
                  <th>最高分</th>
                  <th>游戏局数</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{entry.player}</td>
                    <td>{entry.score}</td>
                    <td>{entry.games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRecordManagement;