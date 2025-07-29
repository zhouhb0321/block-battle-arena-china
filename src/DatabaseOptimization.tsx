import React from 'react';

const DatabaseOptimization: React.FC = () => {
  return (
    <div className="database-optimization">
      <h2>数据表结构优化</h2>
      
      {/* 游戏会话详细记录表 */}
      <div className="optimization-section">
        <h3>游戏会话详细记录表</h3>
        <div className="table-design">
          <h4>game_session_details 表结构</h4>
          <table className="schema-table">
            <thead>
              <tr>
                <th>字段名</th>
                <th>类型</th>
                <th>描述</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>id</td>
                <td>BIGINT (PK)</td>
                <td>会话ID</td>
              </tr>
              <tr>
                <td>user_id</td>
                <td>VARCHAR(50)</td>
                <td>用户ID</td>
              </tr>
              <tr>
                <td>session_start</td>
                <td>DATETIME</td>
                <td>会话开始时间</td>
              </tr>
              <tr>
                <td>session_end</td>
                <td>DATETIME</td>
                <td>会话结束时间</td>
              </tr>
              <tr>
                <td>game_mode</td>
                <td>VARCHAR(20)</td>
                <td>游戏模式</td>
              </tr>
              <tr>
                <td>events</td>
                <td>JSON</td>
                <td>游戏中的关键事件记录</td>
              </tr>
              <tr>
                <td>user_actions</td>
                <td>JSON</td>
                <td>用户操作行为分析数据</td>
              </tr>
              <tr>
                <td>score</td>
                <td>INT</td>
                <td>最终得分</td>
              </tr>
              <tr>
                <td>level</td>
                <td>INT</td>
                <td>达到等级</td>
              </tr>
              <tr>
                <td>lines_cleared</td>
                <td>INT</td>
                <td>清除行数</td>
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
  "session_start": "2023-06-01 10:00:00",
  "session_end": "2023-06-01 10:15:30",
  "game_mode": "classic",
  "events": [
    {"time": "2023-06-01 10:02:15", "type": "level_up", "level": 2},
    {"time": "2023-06-01 10:05:30", "type": "line_cleared", "count": 4},
    {"time": "2023-06-01 10:10:45", "type": "level_up", "level": 3}
  ],
  "user_actions": {
    "total_moves": 1250,
    "rotations": 320,
    "drops": 480,
    "holds": 15
  },
  "score": 15000,
  "level": 5,
  "lines_cleared": 42
}`}
          </pre>
        </div>
      </div>
      
      {/* 广告数据结构优化 */}
      <div className="optimization-section">
        <h3>广告数据结构优化</h3>
        <div className="table-design">
          <h4>advertisements 表结构增强</h4>
          <table className="schema-table">
            <thead>
              <tr>
                <th>字段名</th>
                <th>类型</th>
                <th>描述</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>id</td>
                <td>VARCHAR(50) (PK)</td>
                <td>广告ID</td>
              </tr>
              <tr>
                <td>title</td>
                <td>VARCHAR(100)</td>
                <td>广告标题</td>
              </tr>
              <tr>
                <td>content</td>
                <td>TEXT</td>
                <td>广告内容</td>
              </tr>
              <tr>
                <td>start_time</td>
                <td>DATETIME</td>
                <td>开始展示时间</td>
              </tr>
              <tr>
                <td>end_time</td>
                <td>DATETIME</td>
                <td>结束展示时间</td>
              </tr>
              <tr>
                <td>position</td>
                <td>VARCHAR(20)</td>
                <td>广告位置</td>
              </tr>
              <tr>
                <td>geolocation</td>
                <td>JSON</td>
                <td>地理位置字段</td>
              </tr>
              <tr>
                <td>target_regions</td>
                <td>JSON</td>
                <td>目标地区</td>
              </tr>
              <tr>
                <td>languages</td>
                <td>JSON</td>
                <td>支持的语言</td>
              </tr>
              <tr>
                <td>ab_test_group</td>
                <td>VARCHAR(20)</td>
                <td>A/B测试组</td>
              </tr>
              <tr>
                <td>performance_data</td>
                <td>JSON</td>
                <td>广告效果数据</td>
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
  "start_time": "2023-06-01 00:00:00",
  "end_time": "2023-06-30 23:59:59",
  "position": "top",
  "geolocation": {
    "type": "MultiPolygon",
    "coordinates": [[[...]]]
  },
  "target_regions": ["北京", "上海", "广州"],
  "languages": ["zh", "en"],
  "ab_test_group": "A",
  "performance_data": {
    "impressions": 15000,
    "clicks": 300,
    "ctr": 2.0,
    "revenue": 1200
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DatabaseOptimization;