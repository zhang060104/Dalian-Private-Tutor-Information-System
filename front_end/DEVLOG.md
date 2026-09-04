# front_end 开发日志

> ⚠️ 规则：**只增不删**。每次前端改动后，在下方追加记录（时间 / 改动内容 / 提交人），并同步 git 提交推送。

## 2026-09-04 ｜ 前端脚手架初始化（大连私人家教中心门户）
- 使用 Vite 搭建 Vue3 + TypeScript 脚手架：package.json / vite.config.ts / tsconfig.json / env.d.ts / index.html（提交人：WangYi637）
- 集成 Element Plus（中文语言包 + 全量图标）、Vue Router（hash 模式）、Pinia、Axios（`/api` dev 代理占位）
- 全局样式与设计令牌（教育蓝 + 青绿 + 暖金品牌色系，CSS 变量集中在 styles/index.css）；联系方式集中在 types 的 `CENTER_CONTACT`
- 页面骨架：门户布局 PortalLayout（吸顶导航 + 响应式页脚）、首页（Hero/特色/明星教员/流程/FAQ/CTA）、教员库（科目/年级/授课方式筛选 + 排序 + 关键词搜索）、关于中心（介绍/承诺/流程/联系）、找家教（需求表单 + 校验 + 模拟提交）
- 教员数据：src/data/tutors.ts 静态示例数据（9 位 mock，标注勿维护真实师资）；通用组件 TutorCard
- 类型定义齐全：Tutor / TutorRequest / CENTER_CONTACT，strict TS
- `npm run type-check` 与 `npm run build` 均通过
- 待办：后端接口接入后替换 mock 数据与模拟提交（详见 README）
