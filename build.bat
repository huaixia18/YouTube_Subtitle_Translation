@echo off
chcp 65001 >nul

echo 🚀 开始打包YouTube翻译插件...

REM 设置版本号
set VERSION=1.0.0

REM 创建临时目录
set TEMP_DIR=youtube-translator-v%VERSION%

REM 删除已存在的临时目录和压缩包
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
if exist "%TEMP_DIR%.zip" del "%TEMP_DIR%.zip"

REM 创建新的临时目录
mkdir "%TEMP_DIR%"

echo 📁 复制插件文件...

REM 复制核心文件
copy manifest.json "%TEMP_DIR%\"
copy popup.html "%TEMP_DIR%\"
copy popup.js "%TEMP_DIR%\"
copy README.md "%TEMP_DIR%\"

REM 复制目录
xcopy src "%TEMP_DIR%\src\" /E /I /Q
xcopy css "%TEMP_DIR%\css\" /E /I /Q
xcopy images "%TEMP_DIR%\images\" /E /I /Q

echo 🗑️  清理不必要的文件...

REM 删除开发文件
if exist "%TEMP_DIR%\README_detailed.md" del "%TEMP_DIR%\README_detailed.md"
if exist "%TEMP_DIR%\ssh_config_example.txt" del "%TEMP_DIR%\ssh_config_example.txt"
if exist "%TEMP_DIR%\gitconfig_example.txt" del "%TEMP_DIR%\gitconfig_example.txt"

echo 📦 创建ZIP压缩包...

REM 使用PowerShell创建ZIP文件
powershell -command "Compress-Archive -Path '%TEMP_DIR%' -DestinationPath '%TEMP_DIR%.zip' -Force"

echo 🧹 清理临时文件...

REM 删除临时目录
rmdir /s /q "%TEMP_DIR%"

echo.
echo ✅ 打包完成！
echo 📁 输出文件: %TEMP_DIR%.zip

REM 显示文件大小
for %%A in ("%TEMP_DIR%.zip") do echo 📊 文件大小: %%~zA 字节

echo.
echo 🚀 发布准备就绪！
echo 💡 安装方式：
echo    1. 解压 %TEMP_DIR%.zip
echo    2. 打开 chrome://extensions/
echo    3. 开启开发者模式
echo    4. 点击'加载已解压的扩展程序'
echo    5. 选择解压后的文件夹

pause