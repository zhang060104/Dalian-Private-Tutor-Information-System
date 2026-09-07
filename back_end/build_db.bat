@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ===========================================================================
REM  大连家教信息系统 · 数据库一键构建脚本（Windows）
REM
REM  用法（双击运行也可，会提示输入密码）：
REM    build_db.bat                        root 连接本机，交互式输入密码
REM    build_db.bat root 123456            指定账号密码
REM    build_db.bat root 123456 --seed     顺带写入演示数据
REM    build_db.bat root 123456 --reset    先删库再重建（会清空现有数据）
REM
REM  说明：逻辑与 build_db.sh 完全一致，只是给不装 Git Bash 的同学用。
REM ===========================================================================

set "DB_NAME=dalian_tutor"
set "HOST=127.0.0.1"
set "PORT=3306"
set "DBUSER=root"
set "DBPASS="
set "SEED=0"
set "RESET=0"

if not "%~1"=="" set "DBUSER=%~1"
if not "%~2"=="" set "DBPASS=%~2"
if "%~3"=="--seed"  set "SEED=1"
if "%~3"=="--reset" set "RESET=1"
if "%~4"=="--seed"  set "SEED=1"
if "%~4"=="--reset" set "RESET=1"

set "SCRIPT_DIR=%~dp0"

REM ---- 定位 mysql.exe ----
set "MYSQL_EXE="
for %%P in (
  "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
  "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
  "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"
) do (
  if exist %%P if "!MYSQL_EXE!"=="" set "MYSQL_EXE=%%~P"
)
if "!MYSQL_EXE!"=="" (
  where mysql >nul 2>&1 && set "MYSQL_EXE=mysql"
)
if "!MYSQL_EXE!"=="" (
  echo [错误] 找不到 mysql.exe，请安装 MySQL 8.0+ 后重试。
  exit /b 1
)

REM ---- 密码为空则交互式输入 ----
if "!DBPASS!"=="" set /p "DBPASS=MySQL 密码（用户 !DBUSER!@!HOST!:!PORT!，空密码直接回车）："

echo.
echo ==^> MySQL 客户端：!MYSQL_EXE!
echo ==^> 目标：!DBUSER!@!HOST!:!PORT! / 数据库 !DB_NAME!

REM ---- 连通性检查 ----
echo SELECT 1; | "!MYSQL_EXE!" -h !HOST! -P !PORT! -u !DBUSER! -p"!DBPASS!" >nul 2>&1
if errorlevel 1 (
  echo [错误] 连接失败。请确认 MySQL 服务已启动，且账号/密码正确。
  exit /b 1
)
echo ==^> 连接成功

if "!RESET!"=="1" (
  echo [警告] --reset：即将删除数据库 !DB_NAME!
  pause
  echo DROP DATABASE IF EXISTS `!DB_NAME!`; | "!MYSQL_EXE!" -h !HOST! -P !PORT! -u !DBUSER! -p"!DBPASS!"
  echo ==^> 旧库已删除
)

echo ==^> 执行 sql\schema.sql（建库建表）
"!MYSQL_EXE!" --default-character-set=utf8mb4 -h !HOST! -P !PORT! -u !DBUSER! -p"!DBPASS!" < "!SCRIPT_DIR!sql\schema.sql"
if errorlevel 1 (
  echo [错误] 建表失败。
  exit /b 1
)

if "!SEED!"=="1" (
  echo ==^> 执行 sql\seed.sql（演示数据）
  "!MYSQL_EXE!" --default-character-set=utf8mb4 -h !HOST! -P !PORT! -u !DBUSER! -p"!DBPASS!" < "!SCRIPT_DIR!sql\seed.sql"
  if errorlevel 1 (
    echo [错误] 写入演示数据失败。
    exit /b 1
  )
)

echo.
echo [完成] 数据库 !DB_NAME! 构建成功。
echo        查看表：mysql -u !DBUSER! -p -e "SHOW TABLES;" !DB_NAME!
endlocal
