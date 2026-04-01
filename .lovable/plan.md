

# 发布就绪检查清单与用户数据保护方案

---

## 一、当前功能状态总览

### 已就绪 (可发布)
| 功能 | 状态 |
|------|------|
| 单人游戏 (无尽、40行竞速、2分钟计时) | 完成 |
| 用户注册/登录/密码重置/邮箱验证 | 完成 |
| 游客登录 | 完成 |
| 键位/手感设置 (DAS/ARR/SDF) 云同步 | 完成 |
| 6语言国际化 (英/中简/中繁/日/韩/西) | 完成 |
| 排行榜 | 完成 |
| 好友系统 + 私信 | 完成 |
| V4 录像系统 (录制/回放) | 完成 |
| 管理员面板 (用户管理/日志/广告) | 完成 |
| 主题切换 / 壁纸 | 完成 |
| 音乐播放器 | 完成 |
| 移动端响应式布局 + 触屏控制 | 完成 |
| PWA + Service Worker 离线缓存 | 完成 |
| 数据库 Keep-Alive (每2天心跳) | 完成 |
| RLS 安全加固 | 完成 |
| 新手引导教程 | 完成 |

### 功能完成但需观察
| 功能 | 备注 |
|------|------|
| 多人对战 (1v1/团队) | 代码完成，依赖 WebSocket Edge Function，需真实用户测试连接稳定性 |
| 排位系统 (Glicko-2) | 逻辑完成，需足够玩家基数才能验证匹配质量 |
| AI 对战 | 完成，但 AI 难度平衡需根据用户反馈调整 |
| Stripe 订阅支付 | 代码完成，需确认 Stripe 账户已激活并设置了正确的产品/价格 |

### 缺失：用户反馈收集机制
目前项目中**没有任何用户反馈入口**——没有 Bug 报告按钮、意见反馈表单或满意度调查。这是发布后最关键的缺失。

---

## 二、用户数据保护策略

### 现有保护措施
- RLS 策略已加固，防止数据篡改
- 会话超时管理 (4小时)
- 数据库 Keep-Alive 防暂停
- 校验和验证录像完整性

### 发布后更新时的数据安全

**核心原则**：前端代码更新不影响数据库数据。

```text
┌─────────────────────────────────────────┐
│ 用户数据 (Supabase PostgreSQL)          │
│ ├── user_profiles (永久保存)            │
│ ├── user_settings (键位/手感)           │
│ ├── compressed_replays (录像)           │
│ ├── league_rankings (排位分)            │
│ └── ... 其他30+张表                     │
│                                         │
│ ✅ 前端更新 → 数据不受影响              │
│ ✅ Edge Function 更新 → 自动部署        │
│ ⚠️ 数据库迁移 → 需谨慎：仅 ADD 不 DROP │
└─────────────────────────────────────────┘
```

**需要新增的保障措施**：

1. **数据库备份策略** — Supabase 免费版提供每日自动备份（7天保留）。升级到 Pro 可获得时间点恢复（PITR）。在 Supabase Dashboard → Settings → Database → Backups 确认已开启。

2. **迁移纪律** — 所有数据库结构变更必须通过 `ALTER TABLE ADD COLUMN`，禁止 `DROP TABLE/COLUMN`。修改列类型前先建新列、迁移数据、再删旧列。

3. **版本兼容** — 前端代码应向后兼容，新字段使用 `DEFAULT` 值，旧客户端缓存不会崩溃。

---

## 三、实施计划：用户反馈系统

这是发布前最需要新增的功能。

### 方案设计

1. **新建 `user_feedback` 数据库表**
   - `id`, `user_id`, `type` (bug/suggestion/other), `content`, `screenshot_url`, `page`, `user_agent`, `created_at`, `status` (new/reviewed/resolved)
   - RLS: 用户可插入自己的反馈，管理员可查看所有

2. **新建 `FeedbackButton` 组件**
   - 固定在页面右下角（不遮挡游戏区域）
   - 点击弹出简洁表单：类型选择 + 文本输入 + 可选截图上传
   - 支持匿名提交（游客模式）
   - 国际化支持

3. **管理员面板新增反馈查看页**
   - 列表展示所有反馈，按类型/状态筛选
   - 标记已处理/已解决

4. **版本号显示**
   - 在设置页或页脚显示当前版本号（如 `v1.0.0`）
   - 帮助定位用户报告的问题所在版本

### 技术实现

| 文件 | 操作 |
|------|------|
| SQL Migration | 创建 `user_feedback` 表 + RLS |
| `src/components/FeedbackButton.tsx` | 新建：浮动反馈按钮 + 表单 |
| `src/components/admin/FeedbackPanel.tsx` | 新建：管理员反馈面板 |
| `src/pages/Index.tsx` | 引入 FeedbackButton |
| `src/components/AdminPanel.tsx` | 添加反馈管理 Tab |
| `src/utils/translations.ts` | 添加反馈相关翻译 |

---

## 四、发布前检查清单

- [ ] 确认 Stripe 产品/价格已在 Dashboard 配置
- [ ] 确认 Supabase 数据库备份已开启
- [ ] 确认 `keep-alive` Edge Function 已部署
- [ ] 确认发布可见性为 `public`（已确认 ✅）
- [ ] 添加用户反馈收集功能（上述计划）
- [ ] 在 Supabase Dashboard 启用泄露密码保护
- [ ] 考虑自定义域名（当前为 `block-battle.lovable.app`）

