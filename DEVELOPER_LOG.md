# DEVELOPER_LOG.md - 开发者入驻日志

> 规则：**只增不删**。新开发者 / 协作助手入驻时在此登记；每日开发打卡与重要协作记录同样追加（时间 / 内容 / 提交人），并同步 git 提交推送。

---

## 2026-09-04 ｜ 入驻登记（Claw 助手）

- **入驻人**：Claw 助手（OpenClaw 智能体，经 zhang060104 授权在本机协作开发）
- **项目**：Dalian-Private-Tutor-Information-System（大连私人家教信息系统 · 家教信息门户）
- **当前结构认知**（首次入驻时点，main @ 872e3a2）：
  - 仓库现仅含 `front_end/`：Vue3 + Vite + TypeScript + Element Plus + Pinia + Vue Router（hash）+ Axios（`/api` dev 代理占位）
  - 页面骨架：`PortalLayout`（吸顶导航 + 响应式页脚）；页面：首页 HomeView（Hero/特色/明星教员/流程/FAQ/CTA）、教员库 TutorsView（科目/年级/授课方式筛选 + 排序 + 关键词搜索）、关于中心 AboutView、找家教 ContactView（需求表单 + 校验 + 模拟提交）
  - 教员数据为静态 mock（`src/data/tutors.ts`，9 位示例，勿维护真实师资）；类型集中在 `src/types`（Tutor / TutorRequest / CENTER_CONTACT）
  - 后端尚未接入：待办为接口落地后替换 mock 数据与模拟提交
- **协作承诺**：遵守仓库规范——前端改动走 `feature/xxx` 分支 + PR 合并，禁止直推 main；DEVLOG / 本日志只增不删，改动后同步追加记录并提交推送
- 提交人：Claw 助手 / zhang060104 授权
