# V4 录像系统测试指南

## 📋 概述

本指南提供了完整的 V4 录像系统测试流程，包括录制、加载、播放和保护机制的测试。

## 🎯 测试前准备

### 1. 环境检查
- ✅ 确保已登录系统
- ✅ 打开浏览器开发者工具（F12）
- ✅ 切换到 Console 标签页
- ✅ 准备记录测试结果

### 2. 清除旧数据（可选）
```sql
-- 在 Supabase SQL 编辑器中执行（如需清空旧录像）
DELETE FROM compressed_replays WHERE user_id = 'your_user_id';
```

---

## 🎮 测试阶段 1：录像录制

### 测试目标
验证游戏过程中的录像录制功能是否正常工作。

### 测试步骤

#### 1.1 启动游戏
1. 点击"开始游戏"
2. 选择任意游戏模式（推荐：40行模式或2分钟模式）
3. 等待倒计时结束

#### 1.2 验证录制开始
**期望的控制台日志：**
```
[useGameLogic] Registering recorder with GameRecordingContext
[useGameLogic] Game active state: true { gameStarted: true, gameOver: false, phase: 'playing' }
[GameRecording] Game active state changed: true
[RecorderV4] 🎬 Recording started
[RecorderV4] Seed: XXXX-XXXX
[RecorderV4] Initial pieces: ["I","O","T",...]
```

**✅ 通过标准：**
- 看到 "Recording started" 日志
- 看到 seed 和初始方块序列
- 没有错误信息

#### 1.3 进行游戏
1. 玩游戏至少**锁定 10 个方块**
2. 观察控制台是否有以下日志：
```
[RecorderV4] 📍 SPAWN event: T at (3, 0)
[RecorderV4] 📍 INPUT event: moveLeft
[RecorderV4] 🔒 LOCK event #1: T at (x,y) rotation:0 lines:0
[RecorderV4] 🔒 LOCK event #2: ...
...
[RecorderV4] 📸 Keyframe #1 recorded at lock #5
```

**✅ 通过标准：**
- 看到 SPAWN、INPUT、LOCK 事件日志
- 看到周期性的 Keyframe 日志（每 5 次锁定）
- 没有错误或警告

#### 1.4 结束游戏
选择以下任一方式结束游戏：
- **选项 A：时间耗尽**（时间模式）
- **选项 B：达到行数目标**（40行模式）
- **选项 C：堆满失败**（任意模式）

#### 1.5 验证录像保存
**期望的控制台日志：**
```
[useGameLogic] Game over detected, stopping recording
[useGameLogic] Game active state: false
[GameRecording] Game active state changed: false
[RecorderV4] 🎬 Stopping recording
[RecorderV4] Total events: XX
[RecorderV4] - SPAWN: XX
[RecorderV4] - INPUT: XX
[RecorderV4] - LOCK: XX
[RecorderV4] - KEYFRAME: XX
[RecorderV4] - END: 1
[V4 Encoder] Event breakdown: {...}
[V4 Encoder] ✅ Encoding successful
[RecorderV4] 📊 Binary data: XXX bytes
[RecorderV4] 📊 Base64 string: XXXX characters
[RecorderV4] ✅ Round-trip validation passed
[RecorderV4] ✅ Replay saved to database
[RecorderV4] 📊 Replay ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**✅ 通过标准：**
- 看到 "Stopping recording" 日志
- 看到事件统计（LOCK 数量 > 0）
- 看到 "Encoding successful" 日志
- 看到 "Round-trip validation passed" 日志
- 看到 "Replay saved to database" 日志
- **记录 Replay ID** 供下一步使用

**❌ 失败处理：**
如果看到以下错误：
- `❌ Round-trip validation failed`: 编码/解码不一致，查看详细日志
- `❌ Failed to save replay`: 数据库保存失败，检查网络和权限
- `Missing stats or game mode getter`: 回调注册失败，检查代码集成

---

## 📼 测试阶段 2：录像加载

### 测试目标
验证从数据库加载录像并正确解码的功能。

### 测试步骤

#### 2.1 进入录像系统
1. 返回主菜单
2. 点击"录像回放"或"我的录像"
3. 找到刚才保存的录像（使用 Replay ID 搜索）

#### 2.2 点击"观看回放"
**期望的控制台日志：**
```
replayLoader: Loading replay by ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
replayLoader: Decoding V4.0 replay
replayLoader: Raw data type: string
replayLoader: Raw data is Array? false
replayLoader: Raw data is Uint8Array? false
replayLoader: ✅ Processing Base64 string {
  length: XXXX,
  startsWithDataURL: false,
  firstChars: "UlBWNAABeyJtZXRhZGF0Y...",
  hasWhitespace: false,
  hasInvalidBase64Chars: false
}
replayLoader: ✅ Base64 decode successful, binary string length: XXXX
replayLoader: ✅ Uint8Array created, length: XXXX
replayLoader: 🔍 Binary data analysis: {
  totalLength: XXXX,
  firstBytes: [82, 80, 86, 52, 4, ...],
  firstBytesHex: "0x52 0x50 0x56 0x34 0x04 ...",
  firstBytesAscii: "RPV4.",
  expectedMagic: "RPV4",
  expectedMagicBytes: [82, 80, 86, 52],
  magicMatch: true ✅,
  versionByte: 4
}
[V4 Decoder] Starting decode, data length: XXXX
[V4 Decoder] First 16 bytes (hex): 52 50 56 34 04 ...
[V4 Decoder] ✅ Magic bytes verified: RPV4
[V4 Decoder] Version byte: 4
[V4 Decoder] Header size: XXXX
[V4 Decoder] Event count: XX
[V4 Decoder] Events decoded: XX successful, 0 failed
[V4 Decoder] Decoded event breakdown: {
  SPAWN: XX,
  INPUT: XX,
  LOCK: XX,
  KF: XX,
  META: 0,
  END: 1
}
[V4 Decoder] ✅ Checksum verified
[V4 Decoder] ✅ Decode successful
replayLoader: V4.0 decoding completed: {
  eventCount: XX,
  lockCount: XX,
  keyframeCount: XX
}
```

**✅ 通过标准：**
- 看到 "Processing Base64 string" 日志
- `magicMatch: true`（关键！）
- 看到 "Magic bytes verified: RPV4"
- 看到 "Events decoded: X successful, 0 failed"
- 看到 "Checksum verified"
- 看到 "Decode successful"
- 录像开始自动播放

**❌ 失败诊断：**

##### 错误 1：Magic 字节不匹配
```
❌ MAGIC BYTE MISMATCH
expected: [82, 80, 86, 52]
received: [0, 0, 0, 0] 或 [123, 34, ...] 或其他
```
**原因：**
- `[0, 0, 0, 0]`: 存储损坏，数据全为 0
- `[123, 34, ...]` (ASCII `{"`): 数据被存储为 JSON 对象而不是 Base64 字符串
- 其他：数据损坏或格式错误

**解决方案：**
- 删除该录像，重新录制
- 检查 `useReplayRecorderV4.ts` 中的 `btoa()` 调用是否正确
- 检查数据库列类型是否为 `text` 而不是 `jsonb`

##### 错误 2：Base64 解码失败
```
❌ Base64 decode failed: InvalidCharacterError
```
**原因：**
- Base64 字符串包含非法字符
- 字符串被截断或损坏

**解决方案：**
- 检查 `hasInvalidBase64Chars` 日志
- 检查数据库存储大小限制

##### 错误 3：事件解码失败
```
Events decoded: 5 successful, 10 failed
```
**原因：**
- 二进制数据损坏
- 编码/解码版本不匹配

**解决方案：**
- 查看 `[V4 Decoder] ⚠️ Unknown opcode` 警告
- 重新录制录像
- 检查 `codec.ts` 版本是否一致

---

## 🎬 测试阶段 3：录像播放

### 测试目标
验证录像播放器的正常运行。

### 测试步骤

#### 3.1 播放控制
1. **播放/暂停**：点击播放/暂停按钮
2. **速度调节**：尝试 0.5x、1x、2x、5x 速度
3. **进度条**：拖动进度条到不同时间点
4. **跳转到关键帧**：使用关键帧按钮

**✅ 通过标准：**
- 播放流畅，无卡顿
- 速度调节生效
- 进度条跳转正确
- 关键帧恢复准确

#### 3.2 游戏状态验证
对比录像播放与原游戏：
- 方块序列一致
- 得分一致
- 行数一致
- T-Spin 判定一致
- 连击（Combo）一致

**✅ 通过标准：**
- 最终得分误差 < 1%
- 所有方块位置准确
- 特殊清除（Tetris、T-Spin）准确

---

## 🔒 测试阶段 4：注销保护

### 测试目标
验证游戏进行中用户尝试注销时的保护机制。

### 测试步骤

#### 4.1 游戏中注销
1. 开始游戏
2. 玩游戏至少 5 个方块
3. **游戏进行中**点击右上角"注销"按钮

#### 4.2 验证保护提示
**期望行为：**
- 弹出确认对话框：
  ```
  游戏进行中，是否保存录像后退出？
  
  [确定] [取消]
  ```

#### 4.3 测试"确定"选项
1. 点击"确定"
2. **期望的控制台日志：**
```
[GameRecording] saveAndQuit called
[GameRecording] Saving replay before quit
[RecorderV4] 🎬 Stopping recording
[RecorderV4] ✅ Replay saved successfully
[GameRecording] Replay saved successfully
[AuthContext] Signing out...
```

**✅ 通过标准：**
- 看到 "Replay saved successfully"
- 成功注销
- 录像保存到数据库（可通过 Replay ID 验证）

#### 4.4 测试"取消"选项
1. 重新开始游戏
2. 再次点击"注销"
3. 点击"取消"

**期望行为：**
- 不保存录像
- 直接注销
- 游戏数据丢失

---

## ⏱️ 测试阶段 5：会话超时保护

### 测试目标
验证会话超时时的自动续期机制。

### 测试步骤

#### 5.1 修改超时时间（仅测试用）
**临时修改 `useSessionTimeout.ts`：**
```typescript
const SESSION_TIMEOUT = 10 * 1000; // 10 秒（原为 25 分钟）
const WARNING_TIME = 5 * 1000;     // 5 秒（原为 5 分钟）
```

#### 5.2 测试超时续期
1. 开始游戏
2. **不进行任何操作，等待 10 秒**
3. 观察控制台和 Toast 提示

**期望的控制台日志：**
```
[SessionTimeout] Checking session expiry
[SessionTimeout] Session about to expire, game is active
[SessionTimeout] Auto-extending session
Session auto-extended during gameplay. You will not be logged out.
```

**✅ 通过标准：**
- 看到 Toast 提示："Session auto-extended during gameplay"
- 用户**不会**被强制注销
- 游戏继续进行

#### 5.3 测试非游戏状态超时
1. **不开始游戏**，停留在主菜单
2. 等待 10 秒

**期望行为：**
- 5 秒时：Toast 警告 "Your session will expire in 5 minutes"
- 10 秒时：Toast 错误 "Session expired. Please log in again"
- 自动跳转到登录页

**✅ 通过标准：**
- 非游戏状态下正常超时注销
- 游戏状态下自动续期不注销

#### 5.4 恢复原设置
**测试完成后，恢复 `useSessionTimeout.ts`：**
```typescript
const SESSION_TIMEOUT = 25 * 60 * 1000; // 25 分钟
const WARNING_TIME = 5 * 60 * 1000;     // 5 分钟
```

---

## 📊 测试结果记录表

### 阶段 1：录像录制
| 测试项 | 状态 | 备注 |
|--------|------|------|
| 录制开始日志 | ⬜ | |
| SPAWN 事件 | ⬜ | |
| INPUT 事件 | ⬜ | |
| LOCK 事件 | ⬜ | |
| Keyframe 记录 | ⬜ | |
| 录像保存成功 | ⬜ | Replay ID: _______ |
| Round-trip 验证 | ⬜ | |

### 阶段 2：录像加载
| 测试项 | 状态 | 备注 |
|--------|------|------|
| Base64 解码 | ⬜ | |
| Magic 字节验证 | ⬜ | |
| 事件解码 | ⬜ | 成功/失败: _/_  |
| Checksum 验证 | ⬜ | |
| 解码成功 | ⬜ | |

### 阶段 3：录像播放
| 测试项 | 状态 | 备注 |
|--------|------|------|
| 自动播放 | ⬜ | |
| 播放/暂停 | ⬜ | |
| 速度调节 | ⬜ | |
| 进度条跳转 | ⬜ | |
| 关键帧恢复 | ⬜ | |
| 得分一致性 | ⬜ | 误差: _____% |

### 阶段 4：注销保护
| 测试项 | 状态 | 备注 |
|--------|------|------|
| 保护提示弹出 | ⬜ | |
| "确定"保存录像 | ⬜ | |
| "取消"放弃录像 | ⬜ | |

### 阶段 5：会话超时保护
| 测试项 | 状态 | 备注 |
|--------|------|------|
| 游戏中自动续期 | ⬜ | |
| Toast 提示正确 | ⬜ | |
| 非游戏状态正常注销 | ⬜ | |

---

## 🐛 常见问题排查

### Q1: 录像未保存到数据库
**检查项：**
1. 用户是否已登录？
2. `user.id` 是否有效？
3. 数据库 RLS 策略是否正确？
4. 网络请求是否成功（Network 标签页）？

### Q2: Magic 字节验证失败
**可能原因：**
1. 数据库列类型错误（应为 `text`）
2. Base64 编码/解码不一致
3. 数据存储时被 JSON 序列化

**修复方法：**
```sql
-- 检查列类型
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'compressed_replays' 
  AND column_name = 'compressed_actions';

-- 应返回 'text' 或 'character varying'
```

### Q3: 事件丢失或解码失败
**检查项：**
1. 查看 `[V4 Decoder] Events decoded: X successful, Y failed`
2. 如果 `Y > 0`，查看 `Unknown opcode` 警告
3. 检查编码/解码版本是否一致
4. 尝试重新录制

### Q4: 播放不流畅或卡顿
**可能原因：**
1. 关键帧间隔过大（默认 5）
2. 浏览器性能不足
3. 播放速度过高

**优化方法：**
- 降低关键帧间隔至 3
- 降低播放速度
- 使用性能更好的浏览器

---

## ✅ 完整测试通过标准

所有测试项均标记为 ✅ 时，V4 录像系统可以认为已完成并通过验证。

**核心功能：**
- ✅ 录制：能够完整记录游戏过程
- ✅ 保存：能够正确编码并保存到数据库
- ✅ 加载：能够正确解码并验证 Magic 字节
- ✅ 播放：能够准确还原游戏过程
- ✅ 保护：会话超时和注销时的保护机制有效

---

## 📝 测试报告模板

```markdown
# V4 录像系统测试报告

**测试日期：** YYYY-MM-DD  
**测试人员：** ___________  
**测试环境：** 浏览器 ________ 版本 ________

## 测试结果概览
- 阶段 1（录像录制）：✅ / ❌
- 阶段 2（录像加载）：✅ / ❌
- 阶段 3（录像播放）：✅ / ❌
- 阶段 4（注销保护）：✅ / ❌
- 阶段 5（会话超时）：✅ / ❌

## 发现的问题
1. [问题描述]
   - 重现步骤：
   - 期望行为：
   - 实际行为：
   - 日志截图：

## 建议改进
1. [改进建议]

## 总体评价
[系统是否可以投入生产使用]
```

---

**测试愉快！如有任何问题，请查看控制台日志或联系开发团队。**
