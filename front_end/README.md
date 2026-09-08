# 大连私人家教中心 · 前端（front_end）

> ⚠️ 2026-09-08 起：旧版前端已整体废弃重建为**空白脚手架**，当前不含任何业务代码。

## 技术栈
Vue 3.5 · Vite 8 · TypeScript 6 · Vue Router · Pinia

## 快速开始
```bash
npm install      # 安装依赖
npm run dev      # 本地开发（默认 http://localhost:5173/）
npm run build    # 生产构建（输出到 dist/）
npm run type-check   # 类型检查
```

## 说明
- 业务代码与后端 API 对接需待「数据库设计说明文档.md」与后端重构完成后重新开发，开发记录见 `DEVLOG.md`。
- 工程配置：入口 `index.html` + `src/main.ts`；路由 `src/router/index.ts`（`@` 别名指向 `src/`）。
