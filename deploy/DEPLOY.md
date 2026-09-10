# 部署说明（大连私人家教信息管理系统）

> 本文档用于本机运行、以及后续迁移到云服务器时的落地参考。
> ⚠️ 数据库密码等敏感信息一律通过**环境变量**注入，禁止写进本文件或任何入库文件。

---

## 1. 运行架构（当前本机形态）

```
浏览器
  │  https://<域名或子域名>
  ▼
Cloudflare（DNS + TLS 终止 + CDN）
  │  Cloudflare Tunnel（cloudflared，无需公网 IP / 无需端口映射）
  ▼
nginx :80  ← 统一入口（本仓库 deploy/nginx.conf）
  ├── /               → 前端构建产物 front_end/dist（静态直出 + gzip + 长缓存）
  ├── /api/           → 反向代理 → Spring Boot :8083
  └── /files/         → 反向代理 → Spring Boot :8083（上传文件静态访问）
                                 │
                                 ▼
                        MySQL 8（库：dalian_tutor 等）
                        上传目录：E:\serverData\Dalian-Private-Tutor-Information-System
```

要点：

- **前端不再依赖 vite dev server**：`npm run build` 产出 `dist/`，由 nginx 直接托管（这正是"提高并行响应效率"的关键——静态资源不再经过 Node 进程）。
- **nginx 只做入口与静态托管**，业务逻辑仍在 Spring Boot，数据库不变。
- 上线时 nginx 外面套一层 Cloudflare Tunnel，**不需要公网 IP、不需要路由器端口映射、不需要自己申请证书**。

---

## 2. 依赖环境

| 组件 | 版本/位置 | 说明 |
| --- | --- | --- |
| JDK | 21 | 后端运行 |
| MySQL | 8.0.16+ | 字符集 utf8mb4 |
| Node.js | 20+ | 仅用于构建前端 |
| nginx | 1.28.0（Windows 版：`E:\program\nginx-1.28.0`） | 入口 + 静态托管 |
| cloudflared | `C:\Program Files (x86)\cloudflared\cloudflared.exe` | 对外暴露（可选） |

---

## 3. 启动步骤（本机 / Windows）

### 3.1 后端

```powershell
cd E:\personalProjects\Dalian-Private-Tutor-Information-System\back_end
$env:DB_PASSWORD='<数据库密码>'          # 必需
# $env:TUTOR_UPLOAD_DIR='E:\serverData\Dalian-Private-Tutor-Information-System'   # 可选，默认即此路径
# $env:TUTOR_CAPTCHA_DISABLED='true'    # 可选，仅调试：关闭滑块验证（生产严禁开启）
mvn spring-boot:run
```

生产建议改为构建 jar 后运行：

```powershell
mvn -q -DskipTests package
java -jar target\back-end-*.jar
```

### 3.2 前端构建

```powershell
cd ..\front_end
npm ci
npm run build        # 产出 dist/
```

### 3.3 nginx

```powershell
cd E:\program\nginx-1.28.0
.\nginx.exe -t                  # 语法检查
Start-Process .\nginx.exe -WorkingDirectory .\   # 启动
.\nginx.exe -s reload           # 改配置后重载
.\nginx.exe -s quit             # 停止
```

访问 `http://localhost/` 即为生产形态（静态 + API 同源）。

> 开发时仍可 `npm run dev` 用 5173（vite proxy 直连 8083），与 nginx 形态互不影响。

---

## 4. 对外暴露：Cloudflare Tunnel + 子域名

现有 tunnel（造物集官网用）配置文件位于 `C:\Users\Administrator\.cloudflared\config.yml`。
给家教系统加一个子域名（例如 `tutor.<你的域名>`）只需两步：

**① 在 config.yml 的 `ingress` 列表顶部加入（顺序有意义，具体路径规则要放在通配之前）：**

```yaml
  - hostname: tutor.<你的域名>
    service: http://localhost:80        # 指向 nginx
```

**② 在 Cloudflare 里为该子域名建立指向 tunnel 的 DNS 记录（CNAME）：**

```powershell
cloudflared tunnel route dns <tunnel-id> tutor.<你的域名>
```

**③ 重启 cloudflared 使配置生效**（当前是前台进程方式运行，非系统服务）。

效果：`https://tutor.<你的域名>` 直接可用，TLS 由 Cloudflare 自动签发。

> 注意：`cloudflared tunnel route dns` 需要 `~/.cloudflared/cert.pem`（该文件已存在），且域名必须与 tunnel 同属一个 Cloudflare 账号。

---

## 5. 迁移到云服务器（规划）

迁移时需带走的东西：

1. **代码**：本仓库（含 `deploy/nginx.conf`）
2. **数据库**：`sql/` 下的建库脚本 + 生产库 `mysqldump` 全量备份（含 AUTO_INCREMENT 与自增 id 一致性）
3. **上传目录**：`E:\serverData\Dalian-Private-Tutor-Information-System\{admin,student,teacher}`（图片凭证，不可丢）
4. **环境变量**：`DB_PASSWORD`、`TUTOR_UPLOAD_DIR`（新机器路径可能不同）
5. **对外暴露方式**：新机器上同样可跑 cloudflared（复用同一 tunnel 加 ingress，或新建 tunnel）

Linux 上建议的落地形态：

- 后端：`systemd` 服务（`ExecStart=/usr/bin/java -jar /opt/tutor/app.jar`，`Environment=DB_PASSWORD=...`）
- nginx：`systemd` 自带管理，配置放 `/etc/nginx/conf.d/tutor.conf`（把本仓库 `deploy/nginx.conf` 的 `server{}` 段搬进去，`root` 指向 `/opt/tutor/dist`）
- 前端：构建产物打包上传即可（无需 Node 常驻）
- 上传目录：挂载数据盘，如 `/data/tutor-uploads`
- 数据库：本机 MySQL 或云数据库；**务必定期自动备份**（导出 + 上传目录一起备份）

选型建议（受众地区决定）：

- 受众在**国内** → 国内云服务器（延迟低），但 `.uk` 域名**通常无法完成工信部备案**，无法直接解析到国内服务器；稳妥做法是配一个可备案的域名（或走海外服务器 + CDN）。
- 受众在**海外 / 或可接受延迟** → 海外 VPS（无需备案），Cloudflare Tunnel 直接可用。
- 无论哪种，先把服务容器化/脚本化（启动脚本 + 环境变量 + 备份脚本），迁移当天才不慌。

---

## 6. nginx 配置要点（deploy/nginx.conf）

| 配置项 | 作用 |
| --- | --- |
| `worker_processes 2` + `use select` | Windows 版 nginx 只有 select 模型，worker 不宜多（避免惊群、fd 上限） |
| `gzip on` | JS/CSS/JSON 压缩，构建产物 873KB → 278KB（gzip 后） |
| `sendfile/tcp_nopush` | 静态文件零拷贝直出 |
| `/assets/` 长缓存 30d immutable | 文件名带 hash，可放心强缓存 |
| `upstream tutor_backend + keepalive 32` | 复用后端连接，减少握手；将来多实例只需在此加 server 行 |
| `client_max_body_size 20m` | 证件/收款码图片上传 |
| `try_files ... /index.html` | SPA history 路由回退（刷新不 404） |
| `proxy_set_header X-Forwarded-For` | 后端可取真实客户端 IP |

本机实测（200 请求 / 20 并发，单机自测）：

| 场景 | 吞吐 |
| --- | --- |
| nginx 静态首页 | ≈1170 req/s（vite dev server 约 530 req/s） |
| nginx → API 反代 | ≈374 req/s（直连 8083 约 490 req/s） |

> 说明：反代会让 API 多一跳（约 20% 本机损耗），nginx 的价值不在"让 API 更快"，而在于**静态资源直出、统一入口、TLS/压缩/缓存/限流、以及部署上线所必需的反代层**。真实收益主要在首屏与静态资源并发（gzip + 缓存 + 免 Node 进程开销）。

---

## 7. 常见问题

- **注册/上传报"请先完成滑块验证"**：滑块 token 5 分钟有效且必须由后端签发，注册页需先滑再传图；调试期可用 `TUTOR_CAPTCHA_DISABLED=true`（生产禁用）。
- **账号登录提示"正在等待管理员审核"**：注册后 `status=-1`，需管理员在后台"注册与资料审核"通过（置 0）后方可登录。
- **上传后图片 404**：确认 nginx `/files/` 反代存在，且后端 `TUTOR_UPLOAD_DIR` 与落盘目录一致。
- **改完 nginx 配置不生效**：Windows 版需 `nginx -s reload`；若端口被占先 `nginx -s quit` 再启动。
