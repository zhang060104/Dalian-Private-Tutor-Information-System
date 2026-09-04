# front_end · 大连私人家教中心官网前端

> 家教信息门户：机构展示、教员库浏览/筛选、找家教需求提交。初始化阶段使用静态示例数据，后续接入后端接口。

## 技术栈

- Vue 3.5（Composition API + `<script setup>`）+ TypeScript（strict）
- Vite 8 构建（`@` 别名指向 `src/`，dev 代理 `/api` → `localhost:8080` 占位）
- Element Plus（全量引入，中文语言包）+ 图标全量注册
- Vue Router（hash 模式）+ Pinia

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run type-check` | TypeScript / Vue 模板类型检查（vue-tsc） |
| `npm run build` | 类型检查 + 生产构建 → `dist/` |
| `npm run preview` | 本地预览生产构建产物 |

## 目录结构

```
front_end/
├── public/            # 静态资源（favicon）
├── src/
│   ├── api/           # 后端接口封装（待接入，当前无后端）
│   ├── components/    # 通用组件（TutorCard 教员卡片）
│   ├── data/          # 静态示例数据（tutors.ts 教员 mock，勿维护真实师资）
│   ├── layouts/       # 门户布局 PortalLayout（导航 + 页脚）
│   ├── router/        # 路由（hash 模式）
│   ├── styles/        # 全局样式与设计令牌（CSS 变量）
│   ├── types/         # 类型定义 + 中心联系方式集中配置（CENTER_CONTACT）
│   └── views/         # 页面：Home 首页 / Tutors 教员库 / About 关于 / Contact 找家教
├── index.html
├── vite.config.ts
└── package.json
```

## 页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | Hero + 机构特色 + 明星教员推荐 + 找家教流程 + FAQ |
| `/tutors` | 教员库 | 教员卡片网格，按科目/年级/方式/关键词筛选 + 排序 |
| `/about` | 关于中心 | 机构介绍、数据、服务承诺、服务流程、联系方式 |
| `/contact` | 找家教 | 需求表单（年级/科目/时间/联系方式，含校验），当前模拟提交 |

## 设计约定

- 全局样式与品牌色/圆角/阴影等设计令牌集中在 `src/styles/index.css` 的 `:root` CSS 变量，改版先改这里
- 中心名称、电话、地址等联系方式集中在 `src/types/index.ts` 的 `CENTER_CONTACT`，一处修改全站生效
- 页面文案与示例教员均为占位内容，**上线前需替换为真实信息**

## 后端对接（后续）

- 当前无后端接口，需求表单为前端模拟提交；接后端时：
  1. 在 `src/api/` 新建接口封装（参考 `vite.config.ts` 中 `/api` 代理）
  2. 替换 `src/data/tutors.ts` 为接口数据
  3. 替换 `ContactView.vue` 的模拟提交为真实请求
