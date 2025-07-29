import React, { useState } from 'react';

const DatabaseOptimization: React.FC = () => {
  const [activeTab, setActiveTab] = useState('game-session');

  return (
    <div className="database-optimization">
      <h2>数据表结构优化</h2>
      
      <div className="tabs">
        <button 
          className={activeTab === 'game-session' ? 'active' : ''}
          onClick={() => setActiveTab('game-session')}
        >
          游戏会话记录
        </button>
        <button 
          className={activeTab === 'ad-structure' ? 'active' : ''}
          onClick={() => setActiveTab('ad-structure')}
        >
          广告数据结构
        </button>
      </div>
      
      {activeTab === 'game-session' ? (
        <div className="optimization-section">
          <h3>游戏会话详细记录表</h3>
          <div className="table-design">
            <h4>game_session_details 表结构</h4>
            <table className="schema-table">
              <thead>
                <tr>
                  <th>字段名</th>
                  <th>类型</th>
                  <th>约束</th>
                  <th>描述</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>id</td>
                  <td>BIGINT</td>
                  <td>PK, AUTO_INCREMENT</td>
                  <td>会话ID</td>
                </tr>
                <tr>
                  <td>user_id</td>
                  <td>VARCHAR(50)</td>
                  <td>FK to users.id</td>
                  <td>用户ID</td>
                </tr>
                <tr>
                  <td>session_start</td>
                  <td>TIMESTAMP</td>
                  <td>NOT NULL</td>
                  <td>会话开始时间</td>
                </tr>
                <tr>
                  <td>session_end</td>
                  <td>TIMESTAMP</td>
                  <td>NULL</td>
                  <td>会话结束时间</td>
                </tr>
                <tr>
                  <td>game_mode</td>
                  <td>VARCHAR(20)</td>
                  <td>NOT NULL</td>
                  <td>游戏模式</td>
                </tr>
                <tr>
                  <td>events</td>
                  <td>JSON</td>
                  <td>NULL</td>
                  <td>游戏中的关键事件记录</td>
                </tr>
                <tr>
                  <td>user_actions</td>
                  <td>JSON</td>
                  <td>NULL</td>
                  <td>用户操作行为分析数据</td>
                </tr>
                <tr>
                  <td>score</td>
                  <td>INT</td>
                  <td>DEFAULT 0</td>
                  <td>最终得分</td>
                </tr>
                <tr>
                  <td>level</td>
                  <td>INT</td>
                  <td>DEFAULT 1</td>
                  <td>达到等级</td>
                </tr>
                <tr>
                  <td>lines_cleared</td>
                  <td>INT</td>
                  <td>DEFAULT 0</td>
                  <td>清除行数</td>
                </tr>
                <tr>
                  <td>duration_seconds</td>
                  <td>INT</td>
                  <td>DEFAULT 0</td>
                  <td>游戏时长(秒)</td>
                </tr>
                <tr>
                  <td>pps</td>
                  <td>DECIMAL(5,2)</td>
                  <td>DEFAULT 0.00</td>
                  <td>每秒放置方块数</td>
                </tr>
                <tr>
                  <td>apm</td>
                  <td>DECIMAL(5,2)</td>
                  <td>DEFAULT 0.00</td>
                  <td>每分钟操作数</td>
                </tr>
                <tr>
                  <td>created_at</td>
                  <td>TIMESTAMP</td>
                  <td>DEFAULT CURRENT_TIMESTAMP</td>
                  <td>记录创建时间</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="sample-data">
            <h4>示例数据</h4>
            <pre>
{`{
  "id": 1000001,
  "user_id": "user001",
  "session_start": "2023-06-01T10:00:00Z",
  "session_end": "2023-06-01T10:15:30Z",
  "game_mode": "classic",
  "events": [
    {
      "time": "2023-06-01T10:02:15Z",
      "type": "level_up",
      "level": 2,
      "score": 500
    },
    {
      "time": "2023-06-01T10:05:30Z",
      "type": "line_cleared",
      "count": 4,
      "combo": 1,
      "score": 1200
    },
    {
      "time": "2023-06-01T10:10:45Z",
      "type": "level_up",
      "level": 3,
      "score": 2000
    }
  ],
  "user_actions": {
    "total_moves": 1250,
    "rotations": 320,
    "drops": 480,
    "holds": 15,
    "soft_drops": 310,
    "hard_drops": 170
  },
  "score": 15000,
  "level": 5,
  "lines_cleared": 42,
  "duration_seconds": 930,
  "pps": 2.10,
  "apm": 120.50,
  "created_at": "2023-06-01T10:15:30Z"
}`}
            </pre>
          </div>
          
          <div className="optimization-benefits">
            <h4>优化优势</h4>
            <ul>
              <li>完整记录游戏会话的开始和结束时间，便于分析用户游戏时长</li>
              <li>通过JSON字段存储关键事件和用户操作，提供灵活的数据结构</li>
              <li>包含详细的游戏统计数据，便于后续分析和用户行为研究</li>
              <li>支持实时数据分析和离线数据挖掘</li>
              <li>为个性化推荐和智能匹配提供数据基础</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="optimization-section">
          <h3>广告数据结构优化</h3>
          <div className="table-design">
            <h4>advertisements 表结构增强</h4>
            <table className="schema-table">
              <thead>
                <tr>
                  <th>字段名</th>
                  <th>类型</th>
                  <th>约束</th>
                  <th>描述</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>id</td>
                  <td>VARCHAR(50)</td>
                  <td>PK</td>
                  <td>广告ID</td>
                </tr>
                <tr>
                  <td>title</td>
                  <td>VARCHAR(100)</td>
                  <td>NOT NULL</td>
                  <td>广告标题</td>
                </tr>
                <tr>
                  <td>content</td>
                  <td>TEXT</td>
                  <td>NOT NULL</td>
                  <td>广告内容</td>
                </tr>
                <tr>
                  <td>start_time</td>
                  <td>TIMESTAMP</td>
                  <td>NOT NULL</td>
                  <td>开始展示时间</td>
                </tr>
                <tr>
                  <td>end_time</td>
                  <td>TIMESTAMP</td>
                  <td>NOT NULL</td>
                  <td>结束展示时间</td>
                </tr>
                <tr>
                  <td>position</td>
                  <td>VARCHAR(20)</td>
                  <td>NOT NULL</td>
                  <td>广告位置</td>
                </tr>
                <tr>
                  <td>geolocation</td>
                  <td>JSON</td>
                  <td>NULL</td>
                  <td>地理位置字段</td>
                </tr>
                <tr>
                  <td>target_regions</td>
                  <td>JSON</td>
                  <td>NULL</td>
                  <td>目标地区</td>
                </tr>
                <tr>
                  <td>languages</td>
                  <td>JSON</td>
                  <td>NULL</td>
                  <td>支持的语言</td>
                </tr>
                <tr>
                  <td>ab_test_group</td>
                  <td>VARCHAR(20)</td>
                  <td>NULL</td>
                  <td>A/B测试组</td>
                </tr>
                <tr>
                  <td>performance_data</td>
                  <td>JSON</td>
                  <td>NULL</td>
                  <td>广告效果数据</td>
                </tr>
                <tr>
                  <td>created_at</td>
                  <td>TIMESTAMP</td>
                  <td>DEFAULT CURRENT_TIMESTAMP</td>
                  <td>创建时间</td>
                </tr>
                <tr>
                  <td>updated_at</td>
                  <td>TIMESTAMP</td>
                  <td>DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP</td>
                  <td>更新时间</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="sample-data">
            <h4>示例数据</h4>
            <pre>
{`{
  "id": "ad001",
  "title": "夏季特惠",
  "content": "限时优惠，升级VIP仅需¥99/月",
  "start_time": "2023-06-01T00:00:00Z",
  "end_time": "2023-06-30T23:59:59Z",
  "position": "top",
  "geolocation": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [116.405, 39.905],
              [116.415, 39.905],
              [116.415, 39.915],
              [116.405, 39.915],
              [116.405, 39.905]
            ]
          ]
        },
        "properties": {
          "name": "北京市"
        }
      }
    ]
  },
  "target_regions": ["北京", "上海", "广州"],
  "languages": ["zh", "en"],
  "ab_test_group": "A",
  "performance_data": {
    "impressions": 15000,
    "clicks": 300,
    "ctr": 2.0,
    "revenue": 1200,
    "conversions": 25,
    "conversion_rate": 8.33
  },
  "created_at": "2023-05-30T10:30:00Z",
  "updated_at": "2023-06-15T14:22:45Z"
}`}
            </pre>
          </div>
          
          <div className="optimization-benefits">
            <h4>优化优势</h4>
            <ul>
              <li>增强地理位置字段，支持更精确的地域定向功能</li>
              <li>细化广告效果数据，支持更全面的效果分析</li>
              <li>添加A/B测试支持字段，便于进行广告优化实验</li>
              <li>使用JSON字段存储复杂数据结构，保持表结构的灵活性</li>
              <li>增加时间戳字段，便于跟踪广告的创建和更新时间</li>
              <li>支持多语言广告内容，提升国际化能力</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseOptimization;