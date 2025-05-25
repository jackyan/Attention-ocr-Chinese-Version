# DeepWiki Extension

一个浏览器插件，用于在浏览 GitHub 仓库时集成 DeepWiki.com 的文档。该插件基于 WXT 框架构建，支持 Chrome、Firefox 等现代浏览器。

## 功能特性

- **自动检测 GitHub 仓库**：插件仅在 GitHub 仓库页面激活
- **动态侧边栏集成**：点击扩展按钮后显示 DeepWiki 文档，与 Chrome 原生侧边栏完美集成
- **智能导航**：自动更新文档内容当用户导航到不同仓库
- **错误处理**：当文档不存在时提供重试选项和备选方案
- **简洁设计**：纯净的界面设计，无重复header，完全融入Chrome原生体验
- **跨浏览器兼容**：支持 Chrome、Firefox、Edge 等浏览器

## 项目结构

```
📂 deepwiki-extension/
   📁 entrypoints/           # WXT 入口点文件
      📄 background.ts       # 后台脚本
      📁 github-sidepanel/   # GitHub 专用侧边栏文件
         📄 index.html       # 侧边栏 HTML
         📄 style.css        # 侧边栏样式
         📄 main.ts          # 侧边栏逻辑
   📁 utils/                 # 工具函数
      📄 github.ts           # GitHub 相关工具
   📁 assets/                # 资源文件
      📄 icon.svg            # 插件图标源文件
   📁 public/                # 公共文件
      📄 icon-*.png          # 不同尺寸的图标
   📄 wxt.config.ts          # WXT 配置
   📄 package.json           # 项目依赖
   📄 tsconfig.json          # TypeScript 配置
```

## 安装和开发

### 前置条件

- Node.js 18+ 
- pnpm（推荐）或 npm
- Chrome 114+ 或 Firefox（用于测试）

### 开发环境设置

1. **克隆项目**
   ```bash
   git clone <your-repo-url>
   cd deepwiki-extension
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **生成图标**
   ```bash
   # 使用 Python 脚本生成图标（推荐）
   pip install Pillow
   python3 scripts/create-icons.py
   
   # 或者使用网页工具
   open scripts/generate-icons.html
   # 然后手动下载并重命名图标文件
   ```

4. **开发模式**
   ```bash
   # Chrome 开发
   pnpm dev
   
   # Firefox 开发
   pnpm dev:firefox
   ```

5. **构建生产版本**
   ```bash
   # Chrome 构建
   pnpm build
   
   # Firefox 构建  
   pnpm build:firefox
   
   # 打包为 ZIP
   pnpm zip
   ```

### 在浏览器中加载扩展

#### Chrome

1. 运行 `pnpm dev` 启动开发服务器
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目目录下的 `.output/chrome-mv3` 文件夹

#### Firefox

1. 运行 `pnpm dev:firefox` 启动开发服务器
2. 打开 Firefox，访问 `about:debugging`
3. 点击"此 Firefox"
4. 点击"临时加载附加组件"
5. 选择项目目录下的 `.output/firefox-mv2/manifest.json` 文件

## 使用说明

### 基本使用

1. **访问 GitHub 仓库**
   - 导航到任何 GitHub 仓库页面（如 `https://github.com/username/repo`）

2. **打开侧边栏**
   - 点击浏览器工具栏中的 DeepWiki 插件图标
   - 侧边栏会在右侧打开，加载对应的 DeepWiki 文档

3. **关闭侧边栏**
   - 点击 Chrome 侧边栏原生关闭按钮（X）

### 高级功能

- **智能仓库切换**：在GitHub上切换到不同仓库时，侧边栏会自动检测并更新内容
- **同仓库路径导航**：在同一仓库的不同页面间导航时，保持当前文档不变
- **自动状态同步**：跨标签页自动同步侧边栏的开启/关闭状态
- **错误处理**：如果仓库没有对应文档，提供重试和备选方案
- **智能重试**：网络错误时自动重试最多 2 次

## 示例使用场景

1. **用户访问** `https://github.com/torvalds/linux`
2. **点击插件按钮**
3. **侧边栏打开**，显示来自 `https://deepwiki.com/torvalds/linux` 的内容
4. **用户可以并排阅读** GitHub 代码和 DeepWiki 文档
5. **导航到其他仓库**时，侧边栏内容自动更新

## 技术实现

### 核心技术栈

- **WXT Framework**：现代化的浏览器扩展开发框架
- **TypeScript**：类型安全的 JavaScript
- **Chrome Extension APIs**：
  - `chrome.sidePanel`：动态侧边栏 API
  - `chrome.action`：工具栏按钮
  - `chrome.tabs`：标签页管理
  - `chrome.storage`：数据存储

### 关键架构特性

- **动态侧边栏**：使用 `sidePanel.setOptions()` 动态控制侧边栏，避免双header问题
- **无默认manifest侧边栏**：使用自定义命名避免WXT自动添加`side_panel`到manifest
- **URL 解析**：智能识别 GitHub 仓库 URL 格式
- **状态管理**：跟踪每个标签页的侧边栏状态
- **错误恢复**：多层错误处理和智能重试机制

## v1.2.0 重大更新（当前版本）

### 🔧 架构重构

- ✅ **解决双header问题**：移除默认manifest sidepanel配置，使用动态控制
- ✅ **修复仓库信息获取**：重新设计background script消息传递机制
- ✅ **优化仓库切换检测**：无论侧边栏是否打开都能检测repo变化并自动更新内容
- ✅ **修复侧边栏打开状态切换**：移除状态依赖，确保侧边栏保持打开时repo切换正常工作
- ✅ **增强消息传递可靠性**：添加重试机制、超时控制和智能状态推断
- ✅ **简化界面设计**：移除自定义toolbar，完全依赖Chrome原生侧边栏header
- ✅ **优化加载逻辑**：直接尝试加载iframe内容，移除无效的URL预检查

### 🎨 界面改进

- ✅ **纯净设计**：移除重复的状态栏和刷新按钮
- ✅ **响应式布局**：支持不同屏幕尺寸和暗色主题
- ✅ **现代化视觉**：与Chrome原生界面完美融合

### 🚀 功能增强

- ✅ **动态侧边栏控制**：只在GitHub仓库页面启用
- ✅ **智能错误处理**：提供更友好的错误提示和重试机制
- ✅ **自动状态管理**：标签页切换时自动同步侧边栏状态

## 开发指南

### 添加新功能

1. **扩展 GitHub 检测**：修改 `entrypoints/background.ts` 中的 URL 解析逻辑
2. **自定义侧边栏 UI**：编辑 `entrypoints/github-sidepanel/` 目录下的文件
3. **增强后台逻辑**：更新 `entrypoints/background.ts` 中的事件处理

### 调试技巧

- 使用 Chrome DevTools 调试侧边栏和后台脚本
- 查看 `chrome://extensions/` 中的错误信息
- 在开发模式下查看控制台日志

### WXT Framework 最佳实践

- **避免命名冲突**：使用 `{name}.sidepanel.html` 而不是 `sidepanel.html` 来避免自动manifest配置
- **动态控制**：使用 `chrome.sidePanel.setOptions()` 而不是manifest默认配置
- **错误处理**：充分利用WXT的错误恢复机制

## 故障排除

### 常见问题

1. **双header显示**
   - ✅ **已修复**：使用自定义命名和动态控制避免manifest冲突

2. **侧边栏不显示内容**
   - ✅ **已修复**：重新设计了消息传递和存储机制
   - 如仍有问题，检查Console日志获取详细错误信息

3. **插件图标不激活**
   - 确保你在 GitHub 仓库页面（不是个人资料页或其他页面）
   - 检查 URL 格式是否正确

### 日志调试

开发模式下，插件会在控制台输出详细日志：

```javascript
// 查看后台脚本日志
chrome://extensions/ → 检查插件 → 检查视图：Service Worker

// 查看侧边栏日志  
右键侧边栏 → 检查元素
```

## 浏览器兼容性

| 浏览器 | 支持版本 | 说明 |
|--------|----------|------|
| Chrome | 114+ | 完全支持，包括动态 Side Panel API |
| Firefox | 113+ | 支持，使用 sidebar API 替代 |
| Edge | 114+ | 完全支持 |
| Safari | 计划中 | 需要适配 Safari 扩展格式 |

## 发布指南

### Chrome Web Store

1. 运行 `pnpm build` 和 `pnpm zip`
2. 在 [Chrome 开发者控制台](https://chrome.google.com/webstore/devconsole/) 上传 ZIP 文件
3. 填写扩展信息和截图
4. 提交审核

### Firefox Add-ons

1. 运行 `pnpm build:firefox` 和 `pnpm zip:firefox`
2. 在 [Firefox 开发者中心](https://addons.mozilla.org/developers/) 上传 ZIP 文件
3. 提交审核

## 贡献指南

1. Fork 这个仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 更新日志

### v1.2.0 - 架构重构与问题修复
- **重大修复**：解决双header问题，使用动态sidepanel控制
- **重大修复**：修复仓库信息获取失败问题
- 简化界面设计，移除重复工具栏
- 优化内容加载逻辑和错误处理
- 增强开发者调试体验

### v1.1.0
- 简化侧边栏设计，移除重复工具栏
- 优化内容加载逻辑，移除无效的URL检查
- 改进错误处理和重试机制
- 增强响应式设计和暗色主题支持

### v1.0.0
- 初始版本发布
- 支持 GitHub 仓库检测
- 侧边栏集成 DeepWiki 文档
- 支持 Chrome 和 Firefox

## 致谢

- [WXT Framework](https://wxt.dev/) - 现代化的扩展开发框架
- [DeepWiki.com](https://deepwiki.com/) - 提供优质的开源文档服务
- Chrome Extensions 团队 - Side Panel API 的开发 