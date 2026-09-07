#!/usr/bin/env bash
# =============================================================================
#  大连家教信息系统 · 数据库一键构建脚本
#
#  用途：数据库无法随代码同步到队友电脑，用本脚本在任何一台装了 MySQL 8.0+ 的
#        机器上重建出一致的表结构（和可选演示数据）。
#
#  用法：
#    ./build_db.sh                        # 用 root 连接本机，交互式输入密码
#    ./build_db.sh -u root -p 123456      # 直接指定账号密码
#    ./build_db.sh -u root -p 123456 --seed    # 顺带写入演示数据
#    ./build_db.sh -u root -p 123456 --reset   # ⚠️ 先删库再重建（会清空现有数据）
#    ./build_db.sh -h 192.168.1.10 -P 3307 -u tutor -p xxx
#
#  参数：
#    -u/--user       用户名（默认 root）
#    -p/--password   密码（不填则交互式输入；支持环境变量 MYSQL_PWD）
#    -h/--host       主机（默认 127.0.0.1）
#    -P/--port       端口（默认 3306）
#    --seed          构建完成后写入演示数据（sql/seed.sql）
#    --reset         先 DROP DATABASE 再重建（危险：会清空已有数据）
#    --help          查看帮助
#
#  依赖：mysql 客户端。找不到时会自动尝试 Windows 默认安装路径，
#        也可用环境变量 MYSQL_BIN 指定。
# =============================================================================

set -euo pipefail

DB_NAME="dalian_tutor"
HOST="127.0.0.1"
PORT="3306"
USER="root"
PASS="${MYSQL_PWD:-}"
SEED=0
RESET=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/sql/schema.sql"
SEED_FILE="$SCRIPT_DIR/sql/seed.sql"

usage() { sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^#\{1,2\} \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -u|--user)     USER="$2";  shift 2 ;;
    -p|--password) PASS="$2";  shift 2 ;;
    -h|--host)     HOST="$2";  shift 2 ;;
    -P|--port)     PORT="$2";  shift 2 ;;
    --seed)        SEED=1;     shift ;;
    --reset)       RESET=1;    shift ;;
    --help|-?)     usage; exit 0 ;;
    *) echo "❌ 未知参数：$1"; usage; exit 1 ;;
  esac
done

# ---- 定位 mysql 客户端 ----
MYSQL_BIN="${MYSQL_BIN:-}"
if [[ -z "$MYSQL_BIN" ]]; then
  if command -v mysql >/dev/null 2>&1; then
    MYSQL_BIN="mysql"
  else
    for cand in \
      "/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
      "/c/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe" \
      "/usr/bin/mysql" "/usr/local/mysql/bin/mysql"; do
      [[ -x "$cand" ]] && { MYSQL_BIN="$cand"; break; }
    done
  fi
fi
if [[ -z "$MYSQL_BIN" ]]; then
  echo "❌ 找不到 mysql 客户端。请安装 MySQL 8.0+ 或用环境变量指定："
  echo "   MYSQL_BIN=/path/to/mysql ./build_db.sh ..."
  exit 1
fi

# ---- 密码：命令行没给就交互式询问（不回显）----
if [[ -z "$PASS" ]]; then
  read -rsp "MySQL 密码（用户 $USER@$HOST:$PORT，直接回车表示空密码）：" PASS
  echo
fi

run_sql() {  # run_sql <sql文件|->   （"-" 表示从标准输入读）
  MYSQL_PWD="$PASS" "$MYSQL_BIN" \
    --default-character-set=utf8mb4 \
    -h "$HOST" -P "$PORT" -u "$USER" \
    --database="$DB_NAME" < "$1"
}
run_sql_raw() {  # 不指定库（用于建库/删库）
  MYSQL_PWD="$PASS" "$MYSQL_BIN" \
    --default-character-set=utf8mb4 \
    -h "$HOST" -P "$PORT" -u "$USER" < "$1"
}

echo "==> MySQL 客户端：$MYSQL_BIN"
echo "==> 目标：$USER@$HOST:$PORT / 数据库 $DB_NAME"

# ---- 连通性检查 ----
if ! echo "SELECT 1;" | MYSQL_PWD="$PASS" "$MYSQL_BIN" -h "$HOST" -P "$PORT" -u "$USER" >/dev/null 2>&1; then
  echo "❌ 连接失败。请确认 MySQL 服务已启动，且账号/密码正确。"
  exit 1
fi
echo "==> 连接成功"

if [[ "$RESET" -eq 1 ]]; then
  echo "⚠️  --reset：即将删除数据库 $DB_NAME（3 秒后执行，Ctrl+C 可中断）"
  sleep 3
  echo "DROP DATABASE IF EXISTS \`$DB_NAME\`;" | run_sql_raw -
  echo "==> 旧库已删除"
fi

echo "==> 执行 sql/schema.sql（建库建表）"
run_sql_raw "$SCHEMA_FILE"

if [[ "$SEED" -eq 1 ]]; then
  echo "==> 执行 sql/seed.sql（演示数据）"
  run_sql "$SEED_FILE"
fi

echo
echo "✅ 构建完成。查看表："
echo "   mysql -u $USER -p -e 'SHOW TABLES;' $DB_NAME"
