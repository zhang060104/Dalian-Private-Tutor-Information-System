-- =============================================================================
--  大连家教信息系统 · 数据库构建脚本（表结构）
--  依据：back_end/数据库设计说明文档.md
--  环境：MySQL 8.0+（使用了 POINT SRID 4326，8.0 才支持 SRID 属性）
--  特性：幂等 —— 可重复执行，已存在的表不会被重建/清数据
--  用法：由 back_end/build_db.sh / build_db.bat 调用；也可手动执行
--        mysql -u root -p < back_end/sql/schema.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `dalian_tutor`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `dalian_tutor`;

-- ---------------------------------------------------------------------------
-- 1. student 学生表
--    登录方式：phone + password
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `nickname`    CHAR(16)      NOT NULL DEFAULT ''            COMMENT '昵称',
  -- ⚠️ 文档为 char(16)；此处扩到 64 是为了后续改哈希存储（bcrypt 60 位）时不必改表
  `password`    CHAR(64)      NOT NULL DEFAULT ''            COMMENT '登录密码（phone+password 登录）。当前演示为明文，上线前必须改为哈希',
  `phone`       CHAR(11)      NOT NULL                       COMMENT '登录手机号（唯一）',
  `age`         INT           NULL                           COMMENT '年龄',
  `gender`      CHAR(1)       NULL                           COMMENT '性别：男 / 女',
  `credit`      INT           NOT NULL DEFAULT 0             COMMENT '信用分（按订单评价与成交情况评估，机制待定）',
  `grade`       INT           NOT NULL DEFAULT 0             COMMENT '年级：0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学',
  `subject`     INT           NOT NULL DEFAULT 0             COMMENT '科目位掩码，低 24 位有效（见文档科目顺序）',
  `description` TEXT          NULL                           COMMENT '个人简介',
  `status`      INT           NOT NULL DEFAULT 0             COMMENT '0=正在寻找老师，1=已停止寻找老师',
  `timeTable1`  INT           NOT NULL DEFAULT 0             COMMENT '周一空余时间位图，低 24 位 = 24 小时（bit h=1 表示 h:00~h+1:00 有空）',
  `timeTable2`  INT           NOT NULL DEFAULT 0             COMMENT '周二空余时间位图',
  `timeTable3`  INT           NOT NULL DEFAULT 0             COMMENT '周三空余时间位图',
  `timeTable4`  INT           NOT NULL DEFAULT 0             COMMENT '周四空余时间位图',
  `timeTable5`  INT           NOT NULL DEFAULT 0             COMMENT '周五空余时间位图',
  `timeTable6`  INT           NOT NULL DEFAULT 0             COMMENT '周六空余时间位图',
  `timeTable7`  INT           NOT NULL DEFAULT 0             COMMENT '周日空余时间位图',
  `location`    POINT SRID 4326 NULL                         COMMENT '坐标（WGS84），高德导航预留字段，暂不参与业务',
  `address`     TEXT          NULL                           COMMENT '地址说明（缴费后才对老师展示）',
  UNIQUE KEY `uk_student_phone` (`phone`),
  KEY `idx_student_status` (`status`),
  KEY `idx_student_grade` (`grade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生表';

-- ---------------------------------------------------------------------------
-- 2. teacher 教师表
--    ⚠️ TODO（文档待确认）：文档 teacher 定义中未列 location / address，
--       但运行模式要求「缴纳信息费后对老师/学生展示对方地址」，业务上老师也需要地址。
--       这里严格按文档建表，待文档确认后再用 ALTER TABLE 补字段：
--       ALTER TABLE `teacher` ADD COLUMN `address` TEXT NULL COMMENT '地址说明',
--                             ADD COLUMN `location` POINT SRID 4326 NULL COMMENT '坐标（高德导航预留）';
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `teacher` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `nickname`    CHAR(16)      NOT NULL DEFAULT ''            COMMENT '昵称',
  `password`    CHAR(64)      NOT NULL DEFAULT ''            COMMENT '登录密码（phone+password 登录），上线前必须改为哈希',
  `phone`       CHAR(11)      NOT NULL                       COMMENT '登录手机号（唯一）',
  `age`         INT           NULL                           COMMENT '年龄',
  `gender`      CHAR(1)       NULL                           COMMENT '性别：男 / 女',
  `credit`      INT           NOT NULL DEFAULT 0             COMMENT '信用分',
  `grade`       INT           NOT NULL DEFAULT 0             COMMENT '可授年级：0幼儿园 1-6小学 7-9初中 10-12高中 13-16大学',
  `subject`     INT           NOT NULL DEFAULT 0             COMMENT '可授科目位掩码，低 24 位有效',
  `description` TEXT          NULL                           COMMENT '个人简介',
  `status`      INT           NOT NULL DEFAULT 0             COMMENT '0=正在寻找学生，1=已停止寻找学生',
  `timeTable1`  INT           NOT NULL DEFAULT 0             COMMENT '周一空余时间位图（低 24 位 = 24 小时）',
  `timeTable2`  INT           NOT NULL DEFAULT 0             COMMENT '周二空余时间位图',
  `timeTable3`  INT           NOT NULL DEFAULT 0             COMMENT '周三空余时间位图',
  `timeTable4`  INT           NOT NULL DEFAULT 0             COMMENT '周四空余时间位图',
  `timeTable5`  INT           NOT NULL DEFAULT 0             COMMENT '周五空余时间位图',
  `timeTable6`  INT           NOT NULL DEFAULT 0             COMMENT '周六空余时间位图',
  `timeTable7`  INT           NOT NULL DEFAULT 0             COMMENT '周日空余时间位图',
  UNIQUE KEY `uk_teacher_phone` (`phone`),
  KEY `idx_teacher_status` (`status`),
  KEY `idx_teacher_grade` (`grade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教师表';

-- ---------------------------------------------------------------------------
-- 3. `order` 订单表（order 为 SQL 保留字，必须反引号包裹）
--    流程：投递/指派 → 双方明细确认 → 缴定金+信息费 → 试课 → 正式授课/退半
--    ⚠️ 补充字段：文档未列 created_at / updated_at，但「简历超 24 小时自动删除」
--       的超时清理必须依赖创建时间，故补充（如不需要可删）。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `student_id`    INT           NOT NULL                     COMMENT '学生 id',
  `teacher_id`    INT           NOT NULL                     COMMENT '教师 id',
  `subject`       INT           NOT NULL DEFAULT 0           COMMENT '授课科目位掩码（低 24 位）',
  `hourly_wage`   INT           NOT NULL DEFAULT 0           COMMENT '授课时薪（文档表头笔误写为 houly_wage）',
  `depositImgTea` TEXT          NULL                         COMMENT '教师定金支付截图在服务器的存储地址',
  `depositImgStu` TEXT          NULL                         COMMENT '学生定金支付截图在服务器的存储地址',
  `infoFeeImg`    TEXT          NULL                         COMMENT '教师信息费支付截图在服务器的存储地址',
  `infoFeeQR`     TEXT          NULL                         COMMENT '管理员上传的信息费收款码地址',
  `description`   TEXT          NULL                         COMMENT '授课服务说明，教师/学生均可修改',
  `status`        INT           NOT NULL DEFAULT 0           COMMENT '0=教师已投递待学生确认；1=学生已指派待教师确认；2=明细确认中无人修改；3=学生已修改待教师审核；4=教师已修改待学生审核；5=待缴费并由管理员核验',
  `verification`  INT           NOT NULL DEFAULT 0           COMMENT '低 3 位：bit0=教师定金已缴，bit1=学生定金已缴，bit2=教师信息费已缴（文档表头笔误写为 veryfication）',
  `infoFee`       INT           NOT NULL DEFAULT 0           COMMENT '信息费 = 首周工资总额（由 hourly_wage × timeTable 计算），缴费后才展示双方联系方式与地址',
  `timeTable1`    INT           NOT NULL DEFAULT 0           COMMENT '周一授课时间位图（低 24 位）',
  `timeTable2`    INT           NOT NULL DEFAULT 0           COMMENT '周二授课时间位图',
  `timeTable3`    INT           NOT NULL DEFAULT 0           COMMENT '周三授课时间位图',
  `timeTable4`    INT           NOT NULL DEFAULT 0           COMMENT '周四授课时间位图',
  `timeTable5`    INT           NOT NULL DEFAULT 0           COMMENT '周五授课时间位图',
  `timeTable6`    INT           NOT NULL DEFAULT 0           COMMENT '周六授课时间位图',
  `timeTable7`    INT           NOT NULL DEFAULT 0           COMMENT '周日授课时间位图',
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（补充字段：供投递简历 24 小时超时清理使用）',
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间（补充字段）',
  KEY `idx_order_student` (`student_id`),
  KEY `idx_order_teacher` (`teacher_id`),
  KEY `idx_order_status` (`status`),
  KEY `idx_order_created` (`created_at`),
  CONSTRAINT `fk_order_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teacher` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='家教订单表';

-- ---------------------------------------------------------------------------
-- 4. admin 管理员表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `nickname`  CHAR(16) NOT NULL DEFAULT ''                   COMMENT '昵称',
  `password`  CHAR(64) NOT NULL DEFAULT ''                   COMMENT '登录密码，上线前必须改为哈希',
  `phone`     CHAR(11) NOT NULL                              COMMENT '手机号（唯一）',
  UNIQUE KEY `uk_admin_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- ---------------------------------------------------------------------------
-- 5. requestLog 管理员待审核表
--    type：0=教师个人信息修改，1=学生个人信息修改，
--          2=订单-教师定金核验，3=订单-学生定金核验，4=订单-教师信息费核验
--    tarID：type 0→教师 id，type 1→学生 id，type 2~4→订单 id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `requestLog` (
  `id`      INT AUTO_INCREMENT PRIMARY KEY,
  `type`    INT      NOT NULL                                COMMENT '0教师信息修改 / 1学生信息修改 / 2教师定金核验 / 3学生定金核验 / 4教师信息费核验',
  `tarID`   INT      NOT NULL                                COMMENT '目标 id：type=0 教师 id；type=1 学生 id；type=2~4 订单 id',
  `json`    TEXT     NULL                                    COMMENT '请求详情 JSON（修改后的个人信息 / 付款截图文件地址等）。如需 JSON 校验可改为 JSON 类型',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP   COMMENT '创建时间（补充字段）',
  KEY `idx_request_type` (`type`),
  KEY `idx_request_tar` (`tarID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员待审核请求表';

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- 构建结果自检
-- ---------------------------------------------------------------------------
SELECT TABLE_NAME AS `表`, TABLE_COMMENT AS `说明`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'dalian_tutor'
ORDER BY TABLE_NAME;
