# 大连家教信息系统 · 后端 API 说明文档

- 后端框架：Spring Boot 3.5.16 + Java 21 + MyBatis + MySQL
- 服务端口：**8083**（本地开发地址 `http://localhost:8083`）
- 数据库：`dalian_tutor`（schema/seed 见仓库 `sql/schema.sql`、`sql/seed.sql`）
- 鉴权：登录返回 `token`，之后所有请求（除白名单）头带 `Authorization: Bearer <token>`
- 响应统一包裹：`{ "code": 0, "message": "ok", "data": ... }`；业务失败 `code=400`，未登录 `code=401`，服务器错误 `code=500`（均 HTTP 200 返回，前端按 code 判断）
- 上传图片（≤10MB，png/jpg/jpeg/webp）返回 `/files/yyyy/MM/xxx.png` 相对地址，拼 `http://localhost:8083` 即可直接访问
- 联调开关：环境变量 `TUTOR_CAPTCHA_DISABLED=true` 时滑块验证码校验自动放行（生产勿开）

---

## 1. 角色与账号

三种角色：`teacher`（教师）/ `student`（学生）/ `admin`（管理员）。教师与学生用手机号+密码登录；**入驻需管理员审核**（见注册流程）。

### 1.1 获取滑块验证码

`GET /api/captcha` （匿名可访问）

响应 `data`：
```json
{
  "captchaId": "uuid",
  "background": "data:image/png;base64,xxxx",  // 带缺口背景图
  "puzzle": "data:image/png;base64,xxxx"       // 滑块拼块图（透明底）
}
```

前端将拼块拖到缺口位置后，把拼块中心 X 坐标提交校验：

`POST /api/captcha/verify`
```json
{ "captchaId": "uuid", "x": 128 }
```
成功返回 `data: { "token": "xxx" }`。**token 有效期 5 分钟且可复用**（注册需连续上传多张图片）。业务请求（注册 / 资料修改 / 发起订单 / 匿名上传）需携带此 token。

### 1.2 注册（入驻审核制）

`POST /api/auth/register` （匿名可访问，需先过滑块验证码）

```json
{
  "role": "teacher",
  "phone": "13800000001",
  "password": "123456",
  "captchaToken": "滑块验证返回的token",
  "nickname": "王老师",
  "age": 28,
  "gender": "男",
  "grade": 14,
  "subject": 2,
  "description": "自我介绍",
  "address": "大连市沙河口区xx路",
  "timeTable1": 261888,
  "timeTable2": 0,
  "timeTable3": 0,
  "timeTable4": 0,
  "timeTable5": 0,
  "timeTable6": 0,
  "timeTable7": 0,
  "qrcode": "/files/2026/09/xxx.png",
  "idcard": "/files/2026/09/xxx.png",
  "certificate": "/files/2026/09/xxx.png"
}
```

字段说明：
- `role`：`teacher` 或 `student`（注册教师/学生）
- `grade`：0 幼儿园 / 1–6 小学 / 7–9 初中 / 10–12 高中 / 13–16 大学 / 17 已毕业（教师建议 ≥13）
- `subject`：科目位掩码，24 位依次为 语文/数学/英语/物理/化学/生物/政治/历史/地理/素描/色彩/速写/乐理/钢琴/吉他/俄语/德语/日语/韩语/编程/算法/心理辅导/体育/自定义（支持多选：如 数学=2、数学+物理=2+8=10）
- `timeTable1~7`：周一~周日可授/可学时间位图，每位 1 小时（bit0=0点 ~ bit23=23点）
- `qrcode`/`idcard` 注册必填（收款码、身份证人像面）；`certificate` 教师资质证书可选

**注册采用「入驻审核」模式**：
1. 提交后立即创建账号，但 `status=1`（未激活），**不会出现在师生列表**，也无法被投递/指派；
2. 同时向管理员提交入驻资料审核（requestLog type 0=教师 / 1=学生）；
3. 管理员在后台审核通过 → 账号 `status=0` 激活，进入列表可被搜索；
4. 管理员驳回 → 账号保留（status=1），修改资料后可直接再次提交（见 1.6）；也可等管理员操作后重新走注册（手机号占用时会提示）。

注册成功响应：
```json
{ "accountId": 1, "status": 1, "message": "注册申请已提交，请等待管理员审核通过后开始使用" }
```

**审核期间即可登录**（登录响应 `status=1`，前端据此提示"资料审核中"）。

### 1.3 登录

`POST /api/auth/login` （匿名可访问）

```json
{ "phone": "13800000001", "password": "123456", "role": "teacher" }
```

教师/学生响应 `data`：
```json
{ "token": "xxx", "id": 1, "nickname": "王老师", "role": "teacher", "phone": "13800000001", "status": 0 }
```
`status`：0=已激活正常使用；1=入驻审核中（页面提示"资料审核中"，不开放列表/下单）。

管理员响应 `data` 额外含 `isSuper`（1=超级管理员，可管理管理员账号）。

内置账号（seed）：超管 `13800000000/123456`；运营管理员 `13800000009/123456`；教师 `13800000001~03/123456`；学生 `13900000001~03/123456`。

### 1.4 图片上传

`POST /api/upload` （multipart/form-data，字段名 `file`）

鉴权二选一：
- 登录用户：头 `Authorization: Bearer <token>`；
- 匿名（注册前传证件照）：头 `X-Captcha-Token: <滑块token>`。

成功响应 `data: { "url": "/files/2026/09/xxx.png" }`。图片通过 `GET /files/**` 静态访问（无需登录）。

### 1.5 资料修改 / 入驻资料重提（审核制）

教师和学生端均支持（教师与学生的接口路径一致，登录角色自动区分）：

- `GET /api/profile/review/mine` —— 查询我当前待审申请（无则 `data=null`；有则返回含 `id/type/kind/status/profile` 等）
- `POST /api/profile/review` —— 提交资料修改申请
  ```json
  {
    "captchaToken": "滑块token",
    "name": "王老师",
    "profile": { "nickname": "...", "gender": "...", "grade": 14, "subject": 2,
                 "description": "...", "address": "...", "timeTable1": 261888,
                 "timeTable2": 0, "timeTable3": 0, "timeTable4": 0, "timeTable5": 0,
                 "timeTable6": 0, "timeTable7": 0,
                 "qrcode": "...", "idcard": "...", "certificate": "..." }
  }
  ```
  `profile` 里**只放要改的字段**，未出现的字段保持原值；审核通过后自动合并到账号。
  - 正常激活（status=0）用户提交 → kind=`update` 资料修改，通过后即时生效；
  - 入驻被驳回（status=1）用户提交 → kind=`register` 重新激活申请，通过后 status=0 恢复可接单。
  - 同一角色同一时刻**只能有一个待审申请**，重复提交会报错。
- `POST /api/profile/review/{id}/cancel` —— 撤回自己的待审申请（审核中的入驻申请撤回后账号一并删除，手机号释放可重新注册）

### 1.6 我的资料 / 状态切换

- `GET /api/teacher/me`（学生：`GET /api/student/me`）—— 本人完整资料（含 phone/address/qrcode/idcard/certificate）+ `orders`（我参与的进行中订单 0–11）+ `review`（我的待审申请）
- `PUT /api/teacher/me/status`（学生：`PUT /api/student/me/status`）
  ```json
  { "status": 0 }   // 0=寻找中（上架） 1=停止寻找（下架）
  ```
  状态切换即时生效，无需审核。status=1 时从列表消失、不可被投递/指派。

---

## 2. 师生列表与主页（隐私控制）

### 2.1 学生列表（教师视角寻找学生）

`GET /api/students?subject=&grade=&gender=&keyword=` （需登录）

- 仅返回 `status=0`（正在寻找）的学生；
- 可选筛选：`subject` 科目位掩码（按位与匹配）、`grade` 年级、`gender`（男/女）、`keyword` 昵称/简介模糊；
- **永不返回**手机号/地址/收款码/身份证等私密字段。公开字段：`id/nickname/age/gender/credit/grade/subject/description/status/timeTable1~7`

### 2.2 教师列表（学生视角找老师）

`GET /api/teachers?subject=&grade=&gender=&keyword=` —— 同上，教师无 `grade` 下限限制但同样只列 status=0；公开字段不含 certificate（仅本人可见）。

### 2.3 个人主页

- `GET /api/teacher/{id}`（学生端看老师主页）
- `GET /api/student/{id}`（教师端看学生主页）

非本人访问：只返回公开字段 + 该用户 `status`。**本人访问**（登录角色与 id 匹配）：返回全部字段（含 phone/address/qrcode/idcard/certificate）＋进行中订单列表（仅本人可见自己订单）。

### 2.4 隐私规则速记

| 数据 | 列表/他人主页 | 本人(me) | 订单对方（status<6） | 订单对方（status≥6） | 管理员 |
|---|---|---|---|---|---|
| phone/address | ✗ | ✓ | ✗ | ✓ | ✓ |
| qrcode/idcard | ✗ | ✓ | ✗ | ✗ | ✓ |
| certificate | ✗ | ✓ | ✗ | ✗ | ✓ |
| 信用分/昵称/科目等 | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 3. 订单全流程（状态机 0–12）

### 3.1 状态说明

| status | 含义 | 说明 |
|---|---|---|
| 0 | 教师投递简历 | 教师向学生发起，等学生确认 |
| 1 | 学生免费试课指派 | 学生向教师发起，等教师确认 |
| 2 | 简历/指派已确认 | 进入"订单信息（科目/时薪/时间表）"确认程序 |
| 3 | 学生修改过明细 | 等教师确认或再改 |
| 4 | 教师修改过明细 | 等学生确认或再改 |
| 5 | 缴费核验 | 双方上传定金/信息费凭证，管理员核验 |
| 6 | 试课中 | 核验通过自动进入；**从此双方可见对方手机号/地址** |
| 7 | 学生已通过试课 | 等教师确认 |
| 8 | 教师已通过试课 | 等学生确认 |
| 9 | 授课中 | 双向结单或仲裁，不可直接取消 |
| 10 | 教师申请结单 | 等学生同意 |
| 11 | 学生申请结单 | 等教师同意 |
| 12 | 订单已结束 | 保留记录供信用评估 |

规则：
- status **0/1 被对方拒绝或发起方撤回 → 订单物理删除**（不留记录）；超 24 小时未确认，服务器每天 00:00 自动物理清理；
- status 2–8 任一方取消 → **12**（保留记录）；9 期间禁止直接取消，只能结单（10/11→12）或仲裁；
- 定金/信息费/试课不满的退费按平台规则线下处理，系统只记录核验状态。

### 3.2 发起订单（需滑块验证码）

`POST /api/order/apply`

```json
{ "targetId": 3, "captchaToken": "滑块token" }
```

- 教师登录 → 向学生投递简历（status=0）；学生登录 → 向教师发起免费试课指派（status=1）；
- 对方必须 `status=0`（正在寻找），否则报错；
- 同一对师生**存在进行中（status<12）订单时不可重复发起**；
- 初始明细自动带入：`subject`=学生的需求科目，`timeTable1~7`=学生可学时间∩教师可授时间的交集（可能为 0，双方在明细阶段商定），`hourlyWage=0`、`description` 空。

### 3.3 确认 / 拒绝 / 撤回（status 0/1）

- `POST /api/order/{id}/confirm` —— status 0 学生确认投递 / status 1 教师确认指派 → **2**
- `POST /api/order/{id}/reject` —— 0 学生拒绝 / 1 教师拒绝 → **物理删除**
- `POST /api/order/{id}/cancel` —— 0/1 阶段发起方撤回 → **物理删除**；2–8 阶段任一方取消 → **12**；9+ 禁止

### 3.4 明细确认（status 2/3/4）

订单信息（教授科目 subject、时薪 hourlyWage、时间表 timeTable1~7、备注 description）由双方交替修改直至一致：

- `PUT /api/order/{id}/detail` —— 提交明细（含修改或未修改的完整明细）
  ```json
  { "subject": 2, "hourlyWage": 200, "description": "每周二四晚各1小时",
    "timeTable1": 256, "timeTable2": 0, "timeTable3": 0, "timeTable4": 0,
    "timeTable5": 0, "timeTable6": 0, "timeTable7": 0 }
  ```
  - status 2：双方均可首次提交（学生提交→3，教师提交→4）；
  - status 3：仅教师可再改（→4）；status 4：仅学生可再改（→3）；
  - `hourlyWage` 必填且 >0。
- `POST /api/order/{id}/confirm-detail` —— 确认对方提交的明细 → **5**
  - status 3 教师确认 / status 4 学生确认；
  - 进入 5 时服务端自动计算并锁定**信息费 `infoFee` = 时薪 × 每周总课时**（timeTable1~7 的 bit 数总和 = 首周工资）。

### 3.5 缴费核验（status 5）

- `POST /api/order/{id}/payment` —— 上传支付截图
  ```json
  { "type": "depositTea", "imageUrl": "/files/2026/09/pay.png" }
  ```
  - `type`：`depositTea` 教师缴定金（教师身份）/ `depositStu` 学生缴定金（学生身份）/ `infoFee` 教师缴信息费（教师身份）；
  - 上传后生成待核验请求（requestLog type 2=师定金 / 3=生定金 / 4=信息费），**同类型存在待核验请求时重复上传会被拦截**（等管理员处理或驳回后可重传）；
  - 教师缴信息费前需看到管理员上传的收款码：订单详情接口在 status≥5 时对教师返回 `infoFeeQr`。
- 管理员核验通过 → 对应核验位置 1（师定金=bit0、生定金=bit1、信息费=bit2），**三个位全置 1 → 订单自动进入 6（试课）**；核验驳回 → 凭证作废可重传。
- status 5 阶段任一方可 `cancel` → 12。

### 3.6 试课（status 6/7/8）

- `POST /api/order/{id}/trial-pass`
  - status 6：学生点 → 7（等教师）；教师点 → 8（等学生）；
  - status 7：教师再点 → **9**（双方通过，进入授课）；
  - status 8：学生再点 → **9**；
- 试课不满意：任一方在 6/7/8 直接 `POST /api/order/{id}/cancel` → 12（按文档规则处理退费）。

### 3.7 授课结单 / 仲裁（status 9/10/11）

- `POST /api/order/{id}/settle`
  - status 9：教师点 → 10（等学生）；学生点 → 11（等教师）；
  - status 10：学生点 → **12**；status 11：教师点 → **12**。
- `POST /api/order/{id}/arbitrate` —— 申请毁约仲裁（任一方）
  ```json
  { "text": "教师多次缺课", "images": ["/files/a.png", "/files/b.png"] }
  ```
  → 生成待审仲裁请求（requestLog type 5）。管理员仲裁：支持毁约 → 订单强制 **12**（押金等线下处理）；不支持 → 订单维持 9 继续授课。

### 3.8 订单查询

- `GET /api/order/mine?scope=active|all` —— 我的订单列表（登录角色自动区分我作为学生/教师参与的订单）；默认 `active`（0–11），`all` 含已结束 12。列表含对方昵称/信用分，不含联系方式。
- `GET /api/order/{id}` —— 订单详情（仅订单双方和管理员可看）
  - 双方可见基础信息与自己的凭证回显；
  - **对方手机号/地址在 status≥6 才返回**（防逃单）；`infoFeeQr` 对教师 status≥5 返回；
  - 管理员可见全部字段。

---

## 4. 管理员接口（/api/admin/**，仅 admin 登录）

> 前端注意：管理员页面放在前端自己的 `/admin` 子路由下；本后端对 `/api/admin/**` 有角色守卫，非 admin 一律 401。

### 4.1 统计与列表

- `GET /api/admin/stats` → `{ teacherCount, studentCount, orderCount, pendingRequestCount }`
- `GET /api/admin/teachers` —— 全部教师（含手机号/证件照地址，密码不下发）
- `GET /api/admin/students` —— 全部学生
- `GET /api/admin/orders` —— 全部订单（含凭证图、双方手机号、核验位、信息费等）

### 4.2 待办审核（requestLog）

`GET /api/admin/requests?type=&pending=` —— 全部待办列表
- `type`：0 教师入驻/资料、1 学生入驻/资料、2 教师定金核验、3 学生定金核验、4 信息费核验、5 仲裁；不传返回全部
- `pending=true` 只看待处理（管理员尚未处理）；请求被处理时 `admin_id` 从 -1 变成处理人 id（**保留历史，不删除**），其他管理员无法重复处理
- 每项含 `id/type/typeName/tarId/payload/createdAt`，payload 为提交时的 json

`POST /api/admin/requests/{id}/resolve` —— 处理一条待办

```json
{ "approve": true, "note": "处理备注", "profile": { "字段": "管理员修正值" } }
```

| type | approve 时效果 | reject 时效果 |
|---|---|---|
| 0/1 入驻(kind=register) | 账号激活 status=0，可被检索接单 | 账号保持 status=1（未激活），用户可改资料重提 |
| 0/1 资料修改(kind=update) | profile 合并进账号（可用 body.profile 手动修正小问题） | 账号不变，用户可改后重提 |
| 2/3/4 缴费 | 对应核验位置 1，三位置满自动进试课(status 6) | 凭证作废，用户重传 |
| 5 仲裁 | 订单强制结束(12)，押金线下处理 | 订单维持 9 继续授课 |

- 每处理一条都会在 payload 追加 `decision: approved/rejected`、`note`、`processedAt`；
- 用户端「我的进行中请求」即 admin_id=-1 的记录。

### 4.3 收款码 / 信用 / 管理员

- `POST /api/admin/orders/{id}/info-fee-qr` —— 上传/更新该订单的信息费收款码
  ```json
  { "url": "/files/2026/09/qr.png" }
  ```
  教师端在 status≥5 的订单详情中可见此码，扫码支付信息费后上传凭证。
- `POST /api/admin/credit` —— 调整信用分（默认 100，范围 0–1000）
  ```json
  { "role": "teacher", "id": 3, "credit": 95 }
  ```
- 管理员账号管理（**仅超管**，seed 中 13800000000 为超管）：
  - `GET /api/admin/admins` —— 管理员列表
  - `POST /api/admin/admins` —— 新建管理员
    ```json
    { "nickname": "运营2", "phone": "13800000010", "password": "123456" }
    ```
  - `DELETE /api/admin/admins/{id}` —— 删除管理员；**id=0 初始超管不可删除**；非超管调用一律 400

---

## 5. 自动任务

- 每天 **00:00**：物理删除 status 0/1 且创建超过 24 小时未确认的订单（简历过期清理）。

## 6. 启动方式

```bash
cd back_end
set DB_PASSWORD=你的mysql密码        # Windows
mvn spring-boot:run
# 或打包：mvn package && java -jar target/*.jar
```

可选环境变量：`TUTOR_TOKEN_SECRET`（登录令牌密钥）、`TUTOR_UPLOAD_DIR`（上传目录，默认 `./uploads`）、`TUTOR_CAPTCHA_DISABLED`（联调跳过滑块，默认 false）。
