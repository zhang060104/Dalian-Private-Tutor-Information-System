# 前端开发日志（DEVLOG）

> 本项目日志只增不删。废弃重建会另起新段落说明，历史保留。

## 2026-09-08 ｜ 前端整体废弃重建（历史业务代码全部移除）

**背景**：旧版前端（Vue3 + Vite + Element Plus + Pinia，含 PortalLayout 门户、match 双选大厅、member 工作台、auth 登录入驻、admin 后台等约 4486 行业务代码）经多轮迭代后遗留问题过多（工程骨架文件丢失、代码与新架构冲突、耦合严重），经决策整体废弃，重建干净脚手架作为新一轮开发的起点。

**本次操作**：
- 删除旧 `front_end` 全部历史文件（src 业务代码 / public 静态资源 / 工程配置），含此前已加入的 Element Plus、axios、样式体系。
- 由 `create-vue` 官方脚手架思路手动重建标准 **Vue 3.5 + Vite 8 + TypeScript 6 + Vue Router + Pinia** 空白工程（create-vue 交互式初始化因环境批量删除保护拦截未能完整落地，改为逐文件落盘，产物等同官方空模板）。
- 当前 `front_end` 仅为可运行空骨架：`/` 一个占位 Home 页，无任何业务逻辑与页面。
- 删除 `back_end/sql/` 下 `schema.sql`、`seed.sql`（数据库构建脚本不再直接存于项目目录，避免后续维护推送成本；数据库 schema 重构待「数据库设计说明文档.md」更新后再落地）。
- 验证：`npm run type-check` 通过；`vite build` 成功（27 modules）；`npm run dev` HTTP 200。
- 后续规划：数据库文档 → 数据库重构 + 后端逻辑重构，前端再按新契约重新开发。
- 提交人：Claw 助手 / zhang060104 授权
