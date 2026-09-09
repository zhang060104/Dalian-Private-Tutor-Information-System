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

## 2026-09-09 ｜ 依据《项目设计说明文档.md》重做全部前端页面（mock + 预留 API）
设计文档由用户移至项目根目录（原 back_end 数据库文档）。基于其 5 表结构 + 订单状态机重做前端。

**技术**：Element Plus 2.14.5 + 图标全量注册 + 中文 locale；axios 预装；Vue3.5+Vite8+TS6+Router+Pinia。
URL 平铺：`/directory` `/person/:role/:id` `/me` `/orders` `/order/:id` `/order/:id/edit`；
管理后台独立 `/admin/*`（无门户入口、凭 URL 直达，守卫 role=admin）。

**架构（关键：预留真实 API 空间）**
- `src/types/index.ts`：Profile/Student/Teacher/Order/Admin/RequestLog，严格对齐文档字段。
- `src/utils/`：subject.ts(24科目位掩码) · grade.ts(0-17，教师仅13+) · timetable.ts(7×24位图) ·
  order.ts(状态机0..12 + myActions 权限矩阵)。
- `src/api/`：auth/users/orders/admin/http —— **页面与 store 只调用这些**，当前内部返回 mock，
  每函数标注 `TODO(real): http...`，切真实后端仅改 api 内部。http.ts 为 axios 实例(带 token 拦截)。
- `src/data/mock.ts`(种子库+登录) + `mockApi.ts`(写操作全集)：localStorage 持久化模拟后端，刷新不丢，
  可完整演示注册→审核→匹配→缴费→试课→结单→仲裁全流程。存储用户含顶层 phone 用于登录(mock 内专用类型 StoredUser)。
- `src/stores/auth.ts`：登录态(角色/id/token)持久化；`src/components/`：SliderCaptcha(滑块防刷)、
  ScheduleEditor(7×24 时间点选)；`src/layouts/`：PortalLayout(门户)、AdminLayout(独立后台侧栏)。

**业务功能页（对齐文档）**
- 门户：主页(免费试课广告+三步引导，无内部逻辑)、登录(师/生 tab + 演示账号)、入驻注册(必传昵称/密码/手机/
  收款码/身份证，教师可选资质；滑块；提交管理员审核)。
- 用户端：匹配大厅(Directory 师/生两池 tab+年级/科目/关键字筛选)、对方个人主页(Person：学生→免费试课、
  老师→简历投递，弹窗选科目/时薪/时间表+滑块)、我的主页(Me：纯净资料+进行中订单+本人修改提交审核+
  暂停/恢复寻找)、订单列表(Orders)、订单信息确认独立页(OrderEdit：改单互审 3/4 往复)、订单详情
  (OrderDetail：缴费上传截图→管理员核验、试课通过、结单、授课期毁约仲裁；联系方式缴费核验通过后互见)。
- 管理端：AdminLogin、Dashboard(待办统计)、UserAudit(注册/资料审核，可通过/打回/**手动改后通过**)、
  Payments(定金/信息费截图核验，三笔齐→进入试课)、Arbitrations(毁约仲裁结案+扣信用分)、
  Credit(全用户信用分±调整)、Admins(管理员管理，ID0 不可删、仅超管可建)。

**验证**：`npm run type-check` 全绿；`vite build` 成功(全部路由 chunk 生成)；dev server 各页 200。
**注意**：主 chunk ~872KB 因 Element Plus 全量引入，如需可后续改按需(未做，避免过度)。
- 提交人：Claw 助手 / zhang060104 授权
