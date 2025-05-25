// 简单的图标生成脚本
// 注意：在实际项目中，你可能需要使用 sharp 或其他库来转换 SVG 到 PNG
// 这里我们直接复制 SVG 内容并重命名为不同尺寸的标识

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 SVG 内容
const svgPath = path.join(__dirname, '../assets/icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// 创建不同尺寸的 SVG 文件
const sizes = [16, 24, 48, 128];
const publicDir = path.join(__dirname, '../public');

// 确保 public 目录存在
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

sizes.forEach(size => {
  // 修改 SVG 内容以适应不同尺寸
  const resizedSvg = svgContent
    .replace(/width="128"/, `width="${size}"`)
    .replace(/height="128"/, `height="${size}"`);
  
  // 写入文件
  const outputPath = path.join(publicDir, `icon-${size}.png`);
  
  // 由于我们无法直接在 Node.js 中转换 SVG 到 PNG，
  // 我们创建一个 SVG 文件，用户可以手动转换或使用在线工具
  const svgOutputPath = path.join(publicDir, `icon-${size}.svg`);
  fs.writeFileSync(svgOutputPath, resizedSvg);
  
  console.log(`Generated icon-${size}.svg`);
});

console.log('\nNote: SVG files have been generated in the public directory.');
console.log('To convert to PNG, you can:');
console.log('1. Use an online SVG to PNG converter');
console.log('2. Install and use a tool like sharp or imagemagick');
console.log('3. Use a browser to save SVG files as PNG');

// 创建一个基本的 PNG 占位符（使用 data URL）
const createBasicIcon = (size) => {
  // 这是一个简化的方法，创建一个基本的图标
  // 实际项目中你应该使用专业的图像处理库
  return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
};

// 创建一个 manifest.json 友好的图标配置
const iconConfig = {};
sizes.forEach(size => {
  iconConfig[size] = `/icon-${size}.png`;
});

console.log('\nIcon configuration for manifest:');
console.log(JSON.stringify(iconConfig, null, 2)); 