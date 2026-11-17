# My Becoming Journal — 实施规划与阶段路线图

> **状态：规划与规格整合文档（2025-11-09 最终决策更新）。本次仅为文档更新，不含代码改动。**
> 保留原四阶段结构与顺序，不重组、不合并、不重命名、不重排。
> 本版纳入用户最终产品决策（Final Product Decisions），所有先前与此冲突的指令均已修正。
> **两处先前待确认决策（自然时长输入、History 行格式）已由用户最终拍板，不再待定。**

---

## 一、现有实现盘点（截至本次更新）

Phase 1（核心基础）+ Phase 1 修订（规格校准）已实施完毕，通过 20 项 Playwright 测试。用户数据完好。

### 1.1 已完成并稳定运行的功能

| 模块 | 文件 | 状态 |
|---|---|---|
| 应用入口与路由 | `src/app.js`、`src/utils/router.js` | 7 条路由，Hash 路由，切换时清理模态框 |
| 底部导航 | `src/components/bottom-nav.js` | **4 项**（Home/Calendar/Projects/Statistics） |
| Home 齿轮入口 | `src/views/home.js` | 右上角齿轮 → `#/settings`；Settings 路由保留 |
| IndexedDB 数据层 | `src/db/database.js` | 四仓库（projects/records/timerSessions/settings），版本 1，含导入导出 |
| 设计系统 | `src/styles/base.css` | Vintage Journal 完整 token，含暗色 |
| i18n | `src/i18n/index.js` | 英文/简体中文，首启语言检测 |
| Home 视图 | `src/views/home.js` | 品牌标题+齿轮 + 双统计块 + **单行内联项目行** + 快捷操作 |
| 项目表单 | `src/components/project-form.js` | 创建/编辑，12 色预设，名称+颜色必填；**改名/改色保留同一 ID 与全部记录** |
| 记录表单 | `src/components/record-form.js` | 项目选择 + 日期 + **分离小时+分钟数字输入** + 笔记 |
| 项目列表 | `src/views/projects.js` | 列表 + 拖拽排序（Pointer Events）+ 归档 + 删除 |
| 项目详情 | `src/views/project-detail.js` | 概览 + 时间统计 + 历史按日分组 + 操作 |
| Calendar | `src/views/calendar.js` | 已记录日列表 + Daily Detail 页面（展开式编辑/删除） |
| Statistics | `src/views/statistics.js` | 占位符 |
| Settings | `src/views/settings.js` | 占位符（独立路由，齿轮入口） |
| 模态框/Toast/确认框 | `src/components/ui.js` | 全局管理，`closeAllModals()` |

### 1.2 现有数据结构

```js
// Project（当前）
{ id, name, colourHex, category, sortOrder, isArchived, createdAt, updatedAt }

// Record（当前）
{ id, projectId, date: 'YYYY-MM-DD', durationMinutes, note, createdAt, updatedAt }

// TimerSession（已定义结构，Phase 3 启用）
{ id, projectId, plannedDurationMinutes, startTimestamp,
  accumulatedElapsedMilliseconds, status, createdAt, updatedAt }

// Settings（单例）
{ id: 'app', language, appearance, lastSelectedProjectId, lastTimerDuration }
```

> **记录的 `projectId` 设计说明**：虽然 IndexedDB 索引允许 `projectId` 为 null（技术上可存 unassigned records），但**产品规格明确禁止产生 unassigned records**。删除项目时必须级联删除其全部记录，绝不保留为 unassigned。此约束在 Phase 1 修订收尾中通过删除流程修正落实。

> **可扩展性说明**：Record 结构未含时段/起止时间字段，但保持扁平可扩展——未来增加 `timeOfDay` 或 `timeRange` 可选字段时，旧记录无须回填，新老记录在历史与统计中正确共存。V1 不实现该 UI。

---

## 二、最终产品决策核对清单

以下为用户最终拍板的决策，所有先前与此冲突的指令或建议均已作废。

### 2.1 时长输入 — 保留分离小时/分钟字段（最终决策）

**决策：保留两个简单数字输入字段（Hours / Minutes），不实现自然语言时长输入。**

| 需求 | 当前状态 | 阶段 |
|---|---|---|
| 两个数字输入字段：Hours、Minutes | ✅ 已实现 | Phase 1（已完成） |
| 用户只需输入数字，无需输入单位（`hr`/`min`） | ✅ 已实现 | Phase 1（已完成） |
| 可只填小时、只填分钟、或都填 | ✅ 已实现 | Phase 1（已完成） |
| 内部转换为 `durationMinutes` | ✅ 已实现 | Phase 1（已完成） |
| 布局简单直观 | ✅ 已实现 | Phase 1（已完成） |
| 分钟级精度，不取整 | ✅ 已实现 | Phase 1（已完成） |
| 显示统一可读格式（`21m`/`1h`/`2h 32m`） | ✅ `formatDuration` 已符合 | Phase 1（已完成） |

**示例（当前已符合）**：
- 45 分钟：Hours = 0, Minutes = 45
- 2 小时：Hours = 2, Minutes = 0
- 2 小时 30 分钟：Hours = 2, Minutes = 30

> **作废项**：先前曾提出"自然时长输入（`21 min`/`45m`/`2hr`/`2hr32min`）"作为 Phase 2 升级。**用户最终决定不实现该功能**，V1 保持分离字段。此需求已从路线图移除，不分配到任何阶段。

### 2.2 Project History — 双列行布局（最终决策）

**决策：Project Detail 内的 History 区使用左右双列布局。日期左对齐，时长右对齐，同行显示，无 dash 分隔。**

```
History

Nov 10, 2026                         2h 15m
Nov 09, 2026                         1h 30m
Nov 08, 2026                           45m
```

| 需求 | 当前状态 | 阶段 |
|---|---|---|
| 日期左对齐，所有日期沿同一左边缘垂直对齐 | ✅ 已实现（`list-row__name` 左对齐） | Phase 1（已完成） |
| 时长右对齐，所有时长沿同一右边缘垂直对齐 | ✅ 已实现（`list-row__times` 右对齐） | Phase 1（已完成） |
| 日期与对应时长在同一行 | ✅ 已实现（flex-between 同行） | Phase 1（已完成） |
| 各行使用一致的左右对齐 | ✅ 已实现 | Phase 1（已完成） |
| 行间细分隔线 | ✅ 已实现（list-row border-bottom） | Phase 1（已完成） |
| **日期与时长之间不放置 dash** | ⚠️ **需核查** | Phase 2（视觉格式打磨时确认） |
| 时长视觉清晰易扫读 | ✅ 已实现（`time-main` 加粗） | Phase 1（已完成） |
| History 列表不显示每条单独原始记录 | ✅ 已实现（按日汇总） | Phase 1（已完成） |
| 不引入不必要的中间页 | ✅ 已实现 | Phase 1（已完成） |
| 点击日期打开当日 Daily Detail | ✅ 已实现 | Phase 1（已完成） |
| 进入/离开 Daily Detail 保留导航上下文 | ❌ 未实现 | Phase 2 |

**说明**：当前 History 行已采用双列布局（日期左、时长右），与最终决策一致。Phase 2 仅需在视觉打磨时确认无 dash、无多余 `N records` 副标签干扰（当前多记录时显示 `N records` 副标签，Phase 2 评估是否移除以保持纯净双列）。

### 2.3 项目改名 — 保留全部记录（最终决策）

**决策：改名/改色是普通编辑操作，不是记录重分配。保持同一项目 ID，保留全部关联记录、笔记、项目项、历史数据。**

| 需求 | 当前状态 | 阶段 |
|---|---|---|
| 改名/改色保持同一项目 ID | ✅ 已实现（`saveProject` 按 ID 更新，不新建） | Phase 1（已完成） |
| 保留全部关联记录 | ✅ 已实现（记录按 `projectId` 关联，改名不影响） | Phase 1（已完成） |
| 历史记录继续属于同一项目 | ✅ 已实现 | Phase 1（已完成） |
| 所有相关显示反映更新后的名称 | ✅ 已实现（实时读取 project.name） | Phase 1（已完成） |
| 历史统计保持完整 | ✅ 已实现（统计按 projectId 聚合，不依赖名称） | Phase 1（已完成） |
| 改名/改色绝不创建新项目或断开记录 | ✅ 已实现 | Phase 1（已完成） |

**此节全部符合，无修正项。** 现有 `project-form.js` 编辑流程已正确：加载现有 project → 修改 name/colourHex → `saveProject({...project, ...})` 保持原 ID。

### 2.4 项目删除与记录重分配（最终决策）

**决策：不引入记录重分配工作流。删除 = 永久级联删除项目及全部关联数据，禁止 unassigned records。**

#### Archive（归档）

| 需求 | 当前状态 | 阶段 |
|---|---|---|
| 隐藏项目不出现在活动列表 | ✅ 已实现（`isArchived` 标记） | Phase 1（已完成） |
| 保留全部记录/笔记/项目项/计时器会话/历史统计 | ✅ 已实现（仅标记，不删数据） | Phase 1（已完成） |
| 允许恢复归档项目 | ✅ 已实现 | Phase 1（已完成） |
| 独立 Archived Projects 列表 | ✅ 已实现 | Phase 1（已完成） |

#### Permanent Delete（永久删除）

| 需求 | 当前状态 | 差异 | 阶段 |
|---|---|---|---|
| 永久删除项目及全部关联数据 | ⚠️ **部分实现，需修正** | 当前删除项目记录，但**流程含"保留记录为 unassigned"选项** | Phase 1 修订收尾 |
| 删除前显示明确确认对话框 | ❌ **不符合规格** | 当前是二选一弹窗（保留 vs 全删），非规格要求的单确认对话框 | Phase 1 修订收尾 |
| **禁止 unassigned records** | ❌ **违反规格** | 当前"keep records"选项将 `projectId` 置 null | **Phase 1 修订收尾（须移除）** |
| 级联删除 records / notes / project items / timer sessions | ⚠️ **部分** | 当前删 records；timer sessions 待 Phase 3；project items 尚不存在 | records: Phase 1 修订；timer sessions: Phase 3 |
| 不自动转移记录到其他项目 | ✅ 将随修正落实 | — | Phase 1 修订收尾 |
| 不引入复杂恢复/调整系统 | ✅ 已符合 | — | Phase 1（已完成） |
| 不在项目行常驻删除图标 | ✅ 已符合（右键菜单/操作区） | — | Phase 1（已完成） |
| Home My Projects 无管理功能 | ✅ 已符合 | — | Phase 1（已完成） |

**确认对话框格式（Phase 1 修订收尾须实现）**：

- 标题：`Delete {projectName}?`
- 消息正文：`This will permanently delete this project and all its associated data, including:`
  - All learning records.
  - Record notes.
  - Project history.
  - Related project items.
  - Associated timer sessions.
- 末尾：`This action cannot be undone.`
- 按钮：`Cancel` / `Delete Project`
- 用户必须显式选择 Delete Project 才执行；**不**在点击删除菜单项后立即删除。

**删除执行时（Phase 1 修订收尾）**：
1. 永久删除项目本身（`deleteProject`）。
2. 永久删除该项目的全部 records（`getRecordsByProject` → `deleteRecord`）。
3. 删除关联 notes（当前 notes 内嵌于 records，随 records 删除；未来独立 notes 表时补）。
4. 删除关联 project items（Phase 3 才有此数据，预留调用点）。
5. 删除关联 timer sessions（Phase 3 才有此数据，预留调用点）。
6. 从 Calendar 移除其记录（随 records 删除自动生效，Calendar 实时读取）。
7. 重算所有派生统计（实时计算，删除后自动反映）。

**统计重算（Phase 3 UI 落地，逻辑已就绪）**：
- Home This Month / All Time、Statistics Overview、Learning Days、Time by Project、Learning Trends 等均由 records 实时派生，删除后自动更新。
- 当前无统计缓存；若未来引入缓存，须在删除后失效并刷新相关缓存值。
- 删除一个项目不影响其他项目或其记录。

**活动计时器保护（Phase 3）**：
- 项目有 running/paused timer session 时，不静默删除。
- 要求用户先结束或取消关联计时器会话，才允许永久删除。
- 此保护在 Phase 3 计时器功能实现时落实。

### 2.5 阻止未来日期记录

| 需求 | 当前状态 | 阶段 |
|---|---|---|
| 日期选择器禁用未来日期（UI 层） | ✅ 已实现：`dateInput.max = todayKey()` | Phase 1（已完成） |
| 业务逻辑层也强制阻止未来日期 | ❌ **未实现**：`saveRecord` 未校验 date ≤ today | **Phase 1 修订收尾** |

**需补项**：在 `database.js` 的 `saveRecord` 中加校验：若 `record.date > todayKey()` 则拒绝保存（抛错或返回失败），不仅依赖 UI。

### 2.6 保留导航上下文

| 需求 | 当前状态 | 阶段 |
|---|---|---|
| Back 返回进入来源页，而非固定默认页 | ❌ **未实现** | **Phase 2** |

当前 Back 按钮硬编码：Project Detail → `/projects`，Daily Detail → `/calendar`。规格要求：
- Home → Project Detail → Back 应回 Home
- Projects → Project Detail → Back 应回 Projects
- Calendar → Daily Detail → Back 应回 Calendar
- Project Detail → History date → Daily Detail → Back 应回**该 Project Detail**

**实现方案（Phase 2）**：引入轻量导航历史栈（`navigate()` 记录来源），Back 按钮读取来源而非硬编码路由。

### 2.7 Home My Projects 显示

| 需求 | 当前状态 | 差异 | 阶段 |
|---|---|---|---|
| 单行布局：项目名左 + 时间描述右 | ✅ 已实现 | — | Phase 1（已完成） |
| 项目名字号大于时间描述 | ⚠️ **未明确区分** | 当前两者字号相近 | **Phase 1 修订收尾** |
| 时间值视觉强调（semibold 或更深文字） | ❌ 未实现 | 当前时间描述为常规 meta 样式 | **Phase 1 修订收尾** |
| 措辞：`{时长} this month · {时长} total` | ⚠️ **措辞不符** | 当前为 `in total`，规格要求 `total` | **Phase 1 修订收尾** |
| 名称左对齐、时间右对齐，清晰分离 | ✅ 已实现（flex-between） | — | Phase 1（已完成） |
| 窄屏调整间距字号，避免不必要换行 | ✅ 已实现 | — | Phase 1（已完成） |
| 简单连续列表 + 细分隔线，非大卡片 | ✅ 已实现 | — | Phase 1（已完成） |
| Home 仅概览，无管理功能 | ✅ 已实现 | — | Phase 1（已完成） |
| 点击项目进 Project Detail | ✅ 已实现 | — | Phase 1（已完成） |
| Home 与 Projects 共享同一排序 | ✅ 已实现（均按 sortOrder） | — | Phase 1（已完成） |
| 无百分比/进度条 | ✅ 已实现 | — | Phase 1（已完成） |

**需修正项（Phase 1 修订收尾）**：
1. CSS：项目名用更大字号（如 `1rem`），时间描述用较小字号 + semibold 或更深色。
2. i18n：`home_in_total` 由 `'in total'` 改为 `'total'`（英文），中文保持 `'累计'`。

### 2.8 Projects 页面显示

| 需求 | 当前状态 | 差异 | 阶段 |
|---|---|---|---|
| 双列时间布局：左名称，右 This Month + All Time | ⚠️ **部分** | 当前右侧双数值堆叠，但无顶部列标签 | **Phase 2** |
| 顶部仅一次显示 THIS MONTH / ALL TIME 列标签 | ❌ 未实现 | — | Phase 2 |
| 各列数值一致对齐 | ❌ 未实现 | — | Phase 2 |
| 项目名与时间值保持一行 | ✅ 已实现 | — | Phase 1 |
| 细分隔线，非大卡片 | ✅ 已实现 | — | Phase 1 |
| Projects 页保持为项目管理主入口 | ✅ 已实现 | — | Phase 1 |

**说明**：Projects 页双列对齐布局属页面视觉打磨，归入 Phase 2。当前功能完整（CRUD/归档/删除/排序）。

### 2.9 记录存储与 History 逻辑

| 需求 | 当前状态 | 阶段 |
|---|---|---|
| 每次 Add Record 存为独立记录，不合并覆盖 | ✅ 已实现 | Phase 1（已完成） |
| Project History 按项目+日期分组汇总 | ✅ 已实现 | Phase 1（已完成） |
| Daily Detail 显示当日各条单独记录，可编辑/删除 | ✅ 已实现（展开式操作） | Phase 1（已完成） |
| 编辑/删除单条后所有日总计与统计自动更新 | ✅ 已实现（实时计算） | Phase 1（已完成） |
| 不直接编辑汇总总计 | ✅ 已实现（编辑走底层记录） | Phase 1（已完成） |
| 不引入 Adjustment/差异记录系统 | ✅ 未引入 | Phase 1（已完成） |
| Projects 与 Calendar 共用同一 records 数据，无副本 | ✅ 已实现（均读 IndexedDB） | Phase 1（已完成） |

**此节全部符合，无修正项。**

### 2.10 未来时段记录的可扩展性

| 需求 | 当前状态 | 阶段 |
|---|---|---|
| V1 不要求时段/起止时间 | ✅ 已符合 | Phase 1（已完成） |
| 数据模型保持可扩展 | ✅ Record 结构扁平可加字段 | 架构层（已完成） |
| 旧记录无须回填、新老共存 | ✅ 将通过可选字段实现 | 未来版本 |
| 不实现时段选择 UI | ✅ 未实现 | 未来版本 |

**此节全部符合。** 未来时段兼容性由数据架构支持，V1 不实现时段 UI。

### 2.11 既有产品需求保持不变

| 需求 | 当前状态 |
|---|---|
| 无强制登录 | ✅ |
| IndexedDB 为主本地库 | ✅ |
| 保护现有用户数据 | ✅ |
| 不用 mock 替换真实数据 | ✅ |
| 项目 ID 稳定（改名/改色不破坏历史） | ✅ |
| Home 与 Projects 排序同步 | ✅ |
| 新项目默认出现在顶部 | ✅（`getNextSortOrder` 取 min-1） |
| 项目创建需名称+颜色 | ✅ |
| Category UI 不做，数据模型保留可选字段 | ✅（`category: null`） |
| 归档项目保留历史可恢复 | ✅ |
| 暖纸/复古日记设计方向 | ✅ |
| 英文+简体中文 | ✅ |
| 暗色模式在 Settings 阶段支持 | ✅（Phase 4） |
| 不加 streaks/目标/失败指示/惩罚提醒/激励/Recent Entries/百分比 | ✅ 均未加 |

**此节全部符合。**

---

## 三、阶段开发路线图（全应用，保留原四阶段结构）

> 原则：保持阶段粒度实用，不过度拆分。每个阶段结束有明确测试门槛。现有实现尽量保留，受影响部分做回归测试。**每个阶段都做响应式测试，不全部推迟到 Phase 4。**
> 不将后续阶段功能提前到当前阶段：计时器保护、统计重算 UI、ProjectItem UI 均在各自阶段实现，仅在数据/业务逻辑层于合适阶段建立基础。

### Phase 1 修订收尾 —— 规格校准补全（当前待执行）

**目标**：补全 Phase 1 修订中尚未符合最新规格的修正项。不引入新能力。

**任务清单**：

1. **项目删除流程修正（Section 2.4）**
   - 移除 `openDeleteWithRecordsDialog` 中的"keep records (become unassigned)"选项——**禁止 unassigned records**。
   - 改为规格要求的**单一确认对话框**：标题 `Delete {name}?`，消息列出将删除的内容（learning records / notes / project history / project items / timer sessions）+ "This action cannot be undone."，按钮 Cancel / Delete Project。
   - 统一删除入口：无论项目是否有记录，都走同一确认对话框（移除当前"无记录走简单 confirmDialog"的分支）。
   - 删除执行：级联删除该项目的全部 records（已有），预留 timer sessions / project items 级联调用点（Phase 3 补充实现）。
   - 更新对应测试：删除项目测试须验证新对话框格式与级联删除、无 unassigned records。

2. **业务逻辑层阻止未来日期（Section 2.5）**
   - `database.js` 的 `saveRecord` 中加校验：`record.date > todayKey()` 时拒绝保存。
   - 新增测试：尝试保存未来日期记录应失败。

3. **Home 项目行视觉层级与措辞（Section 2.7）**
   - CSS：项目名字号加大（如 `1rem`），时间描述较小字号 + semibold 或更深色。
   - i18n：`home_in_total` 由 `'in total'` 改为 `'total'`（英文），中文保持 `'累计'`。
   - 更新测试：验证措辞 `total` 而非 `in total`。

**保留与回归**：
- 数据层结构不变（DB 版本仍为 1），用户数据完好。
- 项目改名/改色保留记录的逻辑已正确，不动。
- 分离小时/分钟输入已符合最终决策，不动。
- 回归：20 项既有测试中受影响项更新，未受影响项保持通过。

**测试门槛**：
- 删除项目对话框格式符合规格，无"keep records"选项，级联删除 records，无 unassigned records 产生。
- 未来日期记录在业务逻辑层被拒绝。
- Home 项目行措辞为 `total`，项目名字号大于时间描述。
- 既有功能回归通过。

**依赖**：无前置依赖。

---

### Phase 2 —— 主体验打磨

**目标**：把日历与详情体验从"可用占位"提升到完整，并完成页面视觉对齐。

**任务清单**：

1. **月历网格视图**
   - 月切换、周一为周首、活动点/强度色。
   - 点击日期进 Daily Detail。
2. **Daily Detail 打磨**
   - 当日总计、按项目分组、空态、返回交互。
3. **Home 扩展打磨**
   - 欢迎语、本月聚焦，**不含** Recent Entries/streaks/目标/激励/百分比。
4. **Project Detail 历史打磨（Section 2.2）**
   - 确认 History 双列布局无 dash 分隔。
   - 评估多记录时的 `N records` 副标签是否移除以保持纯净双列。
   - 分页/展开、按月分组导航。
5. **Projects 页双列对齐布局（Section 2.8）**
   - 顶部列标签 THIS MONTH / ALL TIME（仅一次）。
   - 各列数值一致对齐。
   - 项目名左、时间右，一行布局。
6. **导航上下文保留（Section 2.6）**
   - 引入轻量导航历史栈，Back 按钮返回来源页而非固定默认。
   - 覆盖：Home↔Project Detail、Projects↔Project Detail、Calendar↔Daily Detail、Project Detail→History→Daily Detail→Back 回 Project Detail。
7. **Calendar 与记录删除一致性**
   - 删除记录后 Calendar 数据实时刷新（当前已实时读取，Phase 2 验证打磨）。
8. **响应式打磨**（本阶段相关页面）
   - 月历、Daily Detail、Projects 双列在移动端/平板/桌面断点检查。

> **注**：先前曾列入 Phase 2 的"自然时长输入"已由用户最终决策移除——V1 保持分离小时/分钟字段，不实现自然语言解析。此任务已从 Phase 2 删除。

**保留与回归**：
- Phase 1 修订收尾后的删除流程、未来日期校验、Home 单行格式、小时分钟输入：保留。
- 回归：项目/记录 CRUD、拖拽排序、Daily Detail 编辑删除、归档恢复。

**测试门槛**：
- 月历正确渲染当月、周一为首、活动点对应有记录的日期。
- 月历点击进 Daily Detail，编辑后返回月历数据刷新。
- Home 与 Project Detail 数据一致。
- 跨月切换不丢数据。
- Projects 双列对齐，列标签仅一次。
- 导航 Back 从不同入口返回正确来源页。
- History 双列无 dash，日期左、时长右对齐一致。
- 响应式各断点无溢出。

**依赖**：Phase 1 修订收尾完成（格式与交互基线稳定）。

---

### Phase 3 —— 时间与统计（含 ProjectItem UI）

**目标**：计时器落地、统计可视化，并在此阶段启用 ProjectItem 的 UI 与 Video Editing 专项。

**任务清单**：

1. **计时器**
   - 基于 `Date.now()` 时间戳增量，不依赖计数定时器。
   - 持久化到 `timerSessions`，刷新可恢复。
   - 结束生成 record。
2. **活动计时器保护（Section 2.4）**
   - 项目有 running/paused session 时阻止删除，要求先结束/取消计时器。
   - 补全删除级联：删除项目时级联删除其 timer sessions（落实 Phase 1 预留的调用点）。
3. **ProjectItem 数据结构落地**
   - DB 新仓库 `projectItems`（或复用扩展），通用结构：`{ id, projectId, title, status, ..., createdAt, updatedAt }`。
   - 通用 CRUD。
   - **非 Reading/Video 专属**，通用可扩展。
   - 落实删除级联：删除项目时级联删除其 project items。
4. **Video Editing 专项 UI**（基于通用 ProjectItem）
   - 单个视频条目创建/列出。
   - 每个视频可独立计时（复用计时器或记录）。
   - 标记完成。
   - 统计已完成数量。
5. **统计概览页**
   - 本月总时长、学习天数、按项目时长分布。
   - 删除项目/记录后自动重算（实时计算，无缓存 stale 问题）。
6. **趋势图表**
   - 周/月/年（周一为周首，仅选定月内日期计入该月）。

**保留与回归**：
- 计时器不破坏既有手动记录流程。
- ProjectItem 为通用结构，Video Editing 是其一种用法，不硬编码成专属表。
- 回归：手动记录、项目列表、Daily Detail、删除流程。

**测试门槛**：
- 计时器启动/暂停/停止生成正确时长，刷新后可恢复。
- 有活动计时器的项目无法删除，提示先结束/取消。
- 删除项目级联删除 timer sessions 与 project items。
- 视频条目可创建、计时、标记完成、计数正确。
- 统计数字与 records 汇总一致；删除后自动更新。
- 趋势图表跨月/年正确。

**依赖**：Phase 2 完成（Daily Detail 与月历稳定，便于计时器与统计对接）。

---

### Phase 4 —— 设置与可靠性

**目标**：设置页落地、外观与语言可控、数据可迁移、整体健壮性收尾。

**任务清单**：

1. **Settings 页实现**
   - 外观（light/dark/system）。
   - 语言切换（English / 简体中文，覆盖首启检测）。
2. **数据导出/导入 UI**
   - 导出调 `exportAllData()`。
   - 导入调 `importData()`（按 ID 合并，冲突提示）。
3. **响应式收尾**
   - 移动端/平板/桌面断点全应用检查。
4. **错误处理**
   - IndexedDB 失败、空数据、异常输入的兜底。
5. **关于信息**
   - 版本、本地优先说明。

**保留与回归**：
- 数据层导入导出逻辑已实现，此处仅接 UI。
- 全量回归：导航、CRUD、计时器、统计、ProjectItem。

**测试门槛**：
- 语言/外观切换即时生效并持久化。
- 导出文件可重新导入且不丢/不覆盖既有记录。
- 各断点布局可用。
- 异常输入有合理提示不崩溃。

**依赖**：Phase 3 完成（功能集稳定后再做可靠性收尾）。

---

### 阶段总览

| 阶段 | 主题 | 主要产出 | 依赖 |
|---|---|---|---|
| Phase 1 修订收尾 | 规格校准补全 | 删除流程修正（禁 unassigned + 单确认对话框）、未来日期业务校验、Home 视觉层级与措辞 | 无 |
| Phase 2 | 主体验打磨 | 月历网格、Daily/Home/Detail 打磨、History 双列确认、Projects 双列、导航上下文、Calendar 删除一致性 | Phase 1 修订收尾 |
| Phase 3 | 时间与统计 + ProjectItem UI | 计时器、统计、趋势、通用子项与 Video Editing、计时器删除保护、timer session/project item 级联删除 | Phase 2 |
| Phase 4 | 设置与可靠性 | 外观/语言/导出导入 UI、响应式、错误处理 | Phase 3 |

---

## 四、先前遗漏需求恢复清单（本次最终决策纳入）

以下需求在原始产品讨论中存在但此前实现指令中遗漏，现已恢复并分配到对应阶段：

| # | 需求 | 阶段归属 | 当前状态 |
|---|---|---|---|
| 1 | 项目删除为永久删除+级联，禁止 unassigned records | Phase 1 修订收尾 | ⚠️ 需修正 |
| 2 | 删除确认对话框格式（标题/后果列表/取消+确认） | Phase 1 修订收尾 | ⚠️ 需修正 |
| 3 | 业务逻辑层阻止未来日期 | Phase 1 修订收尾 | ❌ 需新增 |
| 4 | 导航上下文保留（Back 返回来源页） | Phase 2 | ❌ 需新增 |
| 5 | Home 项目名字号大于时间描述、时间值视觉强调 | Phase 1 修订收尾 | ⚠️ 需修正 |
| 6 | Home 措辞 `total`（非 `in total`） | Phase 1 修订收尾 | ⚠️ 需修正 |
| 7 | Projects 页双列对齐布局+顶部列标签 | Phase 2 | ⚠️ 需新增 |
| 8 | History 双列布局无 dash（日期左、时长右） | Phase 2（视觉确认） | ✅ 逻辑已符合，视觉待确认 |
| 9 | 活动计时器保护（阻止删除） | Phase 3 | ❌ 待计时器实现 |
| 10 | 删除项目级联删除 timer sessions / project items | Phase 3 | ❌ 待计时器/project items 实现 |
| 11 | 项目改名/改色保留全部记录（同一 ID） | Phase 1（已完成） | ✅ 已符合 |

> **已作废需求**：自然时长输入（`21 min`/`45m`/`2hr`/`2hr32min`）——用户最终决定不实现，V1 保持分离小时/分钟字段。此需求已从所有阶段移除。

---

## 五、最终确认决策（原待定项已全部拍板）

先前本节列出两处待用户确认的决策点，现已被用户最终决策解决，不再待定：

1. ~~**自然时长输入与分离小时+分钟输入的关系**~~ → **已决定：保留分离字段，不实现自然语言输入。**（见 Section 2.1）
2. ~~**History 行视觉格式**~~ → **已决定：双列布局，日期左、时长右，无 dash。**（见 Section 2.2）

> 截至本次更新，**无剩余需用户批准的产品决策**。所有需求均由最终规格明确指示。后续如遇规格未明确的交互细节，执行前确认。

---

## 六、保护与约束

- **现有数据与功能完整保留**：不删除、不替换、不无谓重写。DB 版本保持 1，用户数据完好。本次文档更新不含任何代码改动。
- **20 项既有测试**：受影响项更新，未受影响项保持通过；每个阶段结束做回归。
- **每个阶段都做响应式测试**，不全部推迟到 Phase 4。
- **不为未来功能预留 UI**：百分比/进度条/Recent Entries/streaks/目标/激励在决定做之前不出现。
- **ProjectItem 通用化**：非 Reading/Video 专属表，专项功能以通用结构的用法实现。
- **不将 Phase 3/4 功能提前到 Phase 1**：计时器保护、统计重算 UI、ProjectItem UI 均在各自阶段实现，仅在数据/业务逻辑层于合适阶段建立基础。
- **不将 Phase 1 修订收尾视为整个规格的完成**：Phase 2–4 的未完成需求在路线图中明确记录并跨阶段追踪。

---

## 七、用户已批准的澄清（纳入执行，保持有效）

### 7.1 记录数据与未来时间追踪扩展
- V1 核心信息仅三项：项目、日期、时长；备注可选。
- 不要求早/午/晚/夜、精确起止时间。
- 数据模型保持可扩展，未来可加可选时段；旧记录无须回填、新老共存。
- 不为未来功能现在加复杂度。

### 7.2 时长输入（最终决策）
- 保留分离 Hours / Minutes 两个数字输入字段。
- 用户只需输入数字，无需输入单位。
- 可只填小时、只填分钟、或都填。
- **不实现自然语言时长解析或单一文本输入框**（V1）。

### 7.3 项目管理（最终决策）
- **改名/改色** = 普通编辑，保持同一 ID，保留全部记录与历史。
- **Archive** = 隐藏项目，保留全部数据，可恢复。
- **Delete** = 永久删除项目及全部关联数据（records / notes / project items / timer sessions），禁止 unassigned records，单确认对话框。
- 不引入记录重分配工作流。
- Home My Projects 仅概览，无管理功能。

### 7.4 V1 范围外（推迟，非永久排除）
Recent Entries、streaks、每日目标、额外激励、Home 百分比/进度条、自然语言时长输入。架构保持灵活但不实现。

### 7.5 总体原则
保持简单、愉悦、鼓励开始与持续；记录不应成为负担。避免过度设计假设性未来功能，同时不做妨碍合理扩展的架构决策。专注完成约定的 V1 范围。

---

*本规划已纳入用户最终产品决策，所有待定项已解决。进入 Phase 1 修订收尾执行。*
