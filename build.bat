@echo off
chcp 65001 >nul
title HTML PPT 编辑器 - 构建工具

echo ========================================
echo HTML PPT 编辑器 - 构建可执行文件
echo ========================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Python
    pause
    exit /b 1
)

if not exist "venv" (
    echo [信息] 创建虚拟环境并安装依赖...
    python -m venv venv
    call venv\Scripts\activate.bat
    python -m pip install --upgrade pip -q
    pip install -r requirements.txt -q
) else (
    call venv\Scripts\activate.bat
)

echo.
echo [信息] 开始构建...
echo.

python -m PyInstaller --onefile --windowed --name "HTML_PPT_Editor" --add-data "assets;assets" --add-data "src;src" --add-data "templates;templates" --hidden-import "pywebview" --hidden-import "jinja2" --clean main.py

if errorlevel 1 (
    echo.
    echo [错误] 构建失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo [成功] 构建完成!
echo 可执行文件位置: %cd%\dist\HTML_PPT_Editor.exe
echo ========================================
echo.

pause
