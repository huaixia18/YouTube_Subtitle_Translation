#!/bin/bash

# YouTube翻译插件打包脚本
echo "🚀 开始打包YouTube翻译插件..."

# 设置版本号
VERSION="1.0.0"

# 创建临时目录
TEMP_DIR="youtube-translator-v${VERSION}"

# 删除已存在的临时目录和压缩包
rm -rf "${TEMP_DIR}"
rm -f "${TEMP_DIR}.zip"

# 创建新的临时目录
mkdir -p "${TEMP_DIR}"

echo "📁 复制插件文件..."

# 复制核心文件
cp manifest.json "${TEMP_DIR}/"
cp popup.html "${TEMP_DIR}/"
cp popup.js "${TEMP_DIR}/"
cp README.md "${TEMP_DIR}/"

# 复制目录
cp -r src/ "${TEMP_DIR}/"
cp -r css/ "${TEMP_DIR}/"
cp -r images/ "${TEMP_DIR}/"

echo "🗑️  清理不必要的文件..."

# 删除开发文件
rm -f "${TEMP_DIR}/README_detailed.md"
rm -f "${TEMP_DIR}/ssh_config_example.txt"
rm -f "${TEMP_DIR}/gitconfig_example.txt"

echo "📦 创建ZIP压缩包..."

# 创建ZIP文件
zip -r "${TEMP_DIR}.zip" "${TEMP_DIR}"

echo "🧹 清理临时文件..."

# 删除临时目录
rm -rf "${TEMP_DIR}"

echo "✅ 打包完成！"
echo "📁 输出文件: ${TEMP_DIR}.zip"
echo "📊 文件大小: $(du -h "${TEMP_DIR}.zip" | cut -f1)"

echo ""
echo "🚀 发布准备就绪！"
echo "💡 安装方式："
echo "   1. 解压 ${TEMP_DIR}.zip"
echo "   2. 打开 chrome://extensions/" 
echo "   3. 开启开发者模式"
echo "   4. 点击'加载已解压的扩展程序'"
echo "   5. 选择解压后的文件夹"