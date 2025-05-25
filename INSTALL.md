# DeepWiki Extension - 安装与使用指南

本指南将帮助您完成 DeepWiki Extension 的安装、配置和使用。

## 🚀 快速开始

### 步骤 1: 创建图标文件

1. **使用 Python 脚本生成图标**（推荐）：
   ```bash
   # 安装依赖
   pip install Pillow
   
   # 生成图标
   python3 scripts/create-icons.py
   ```
   这将在 `public/` 目录中生成所需的图标文件：
   - `icon-16.png`（16x16px）
   - `icon-24.png`（24x24px）
   - `icon-48.png`（48x48px）
   - `icon-128.png`（128x128px）

2. **或者使用网页工具生成图标**：
   ```bash
   # 在浏览器中打开图标生成器
   open scripts/generate-icons.html
   ```
   - 点击"生成图标"按钮
   - 分别下载 4 个不同尺寸的图标
   - 将下载的文件重命名并放到 `public/` 目录

### 步骤 2: 开发模式

```bash
# 启动开发服务器
pnpm dev

# 输出目录：.output/chrome-mv3
```

### 步骤 3: 在 Chrome 中加载扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目目录下的 `.output/chrome-mv3` 文件夹
6. 扩展将被安装并出现在工具栏中

### 步骤 4: 测试功能

1. **访问 GitHub 仓库**：
   - 打开任何 GitHub 仓库页面，例如：
     - `https://github.com/torvalds/linux`
     - `https://github.com/microsoft/vscode`
     - `https://github.com/facebook/react`

2. **点击扩展图标**：
   - 在工具栏中找到 DeepWiki 扩展图标
   - 点击图标，侧边栏将在右侧打开

3. **验证内容加载**：
   - 侧边栏应该显示对应的 DeepWiki 文档
   - 如果文档不存在，会显示错误页面和重试选项

4. **仓库切换自动更新测试**（v1.2.0新增）：
   
   **步骤A：基础切换测试**
   ```
   1. 访问 https://github.com/torvalds/linux
   2. 点击扩展图标打开侧边栏
   3. 确认显示 linux 仓库的DeepWiki内容
   4. 在地址栏输入 https://github.com/microsoft/vscode
   5. 按回车跳转到新仓库
   6. ✅ 侧边栏应该自动更新显示 vscode 仓库的内容
   ```
   
   **步骤B：侧边栏保持打开状态切换测试**（v1.2.0重点修复）
   ```
   1. 访问 https://github.com/facebook/react
   2. 点击扩展图标打开侧边栏
   3. 确认显示 react 仓库的DeepWiki内容
   4. 保持侧边栏打开状态
   5. 在地址栏输入 https://github.com/vuejs/vue
   6. 按回车跳转到新仓库
   7. ✅ 侧边栏应该立即自动更新显示 vue 仓库的内容
   8. 再次切换到 https://github.com/angular/angular
   9. ✅ 侧边栏应该再次自动更新显示 angular 仓库的内容
   
   调试提示：如果步骤7或9失败，打开 chrome://extensions/ → DeepWiki Extension → 检查视图：Service Worker
   应该看到类似日志：
   - "Repo changed from facebook/react to vuejs/vue"
   - "Attempting to send message (attempt 1/3)"
   - "Message sent successfully, response: {success: true, received: true}"
   ```
   
   **步骤C：关闭后重新打开测试**
   ```
   1. 访问 https://github.com/facebook/react
   2. 点击扩展图标打开侧边栏
   3. 点击侧边栏的X按钮关闭
   4. 在地址栏输入 https://github.com/vuejs/vue
   5. 按回车跳转到新仓库
   6. 点击扩展图标重新打开侧边栏
   7. ✅ 侧边栏应该显示 vue 仓库的内容（不是之前的react）
   ```
   
   **步骤D：同仓库导航测试**
   ```
   1. 访问 https://github.com/torvalds/linux
   2. 打开侧边栏
   3. 点击仓库内的文件/目录，如进入 /kernel/ 目录
   4. ✅ 侧边栏内容应该保持不变（不重新加载）
   5. 从 /kernel/ 返回仓库根目录
   6. ✅ 侧边栏内容仍应保持不变
   ```

## 🔧 v1.2.0 重大架构更新

### 已修复的问题

#### ✅ 问题1：双Header显示
**问题描述**：之前的版本会显示Chrome原生sidepanel header和自定义toolbar，造成界面重复和不美观。

**解决方案**：
- 重命名 `entrypoints/sidepanel` 为 `entrypoints/github-sidepanel`
- 移除WXT自动添加的`side_panel`manifest配置
- 使用动态`chrome.sidePanel.setOptions()`控制
- 简化界面，移除重复的自定义toolbar

#### ✅ 问题2：仓库信息获取失败
**问题描述**：侧边栏无法正确获取并显示DeepWiki上对应仓库的内容。

**解决方案**：
- 重新设计background script的消息传递机制
- 优化仓库信息存储和检索逻辑
- 移除无效的URL预检查，直接尝试加载iframe内容
- 增强错误处理和重试机制

### 技术架构改进

1. **动态侧边栏控制**：
   ```typescript
   // 不再使用manifest中的默认配置
   await chrome.sidePanel.setOptions({
     tabId: tab.id,
     path: 'github-sidepanel.html',
     enabled: true
   });
   ```

2. **避免WXT自动配置冲突**：
   - 使用自定义命名避免框架自动添加manifest条目
   - 完全控制侧边栏的显示和隐藏逻辑

3. **简化的界面设计**：
   - 移除重复的状态栏和工具按钮
   - 依赖Chrome原生侧边栏header
   - 专注于内容展示，减少界面干扰

## 📋 详细安装步骤

### 环境准备

1. **Node.js 安装**
   ```bash
   # 检查Node.js版本（需要18+）
   node --version
   
   # 如果没有安装，从 https://nodejs.org/ 下载安装
   ```

2. **包管理器安装**
   ```bash
   # 安装pnpm（推荐）
   npm install -g pnpm
   
   # 或者使用npm
   # npm install
   ```

3. **项目依赖安装**
   ```bash
   # 克隆项目后
   cd deepwiki-extension
   pnpm install
   ```

### 开发环境配置

1. **TypeScript配置**
   - 项目已配置好TypeScript，继承WXT框架配置
   - 支持Chrome扩展API类型检查

2. **构建配置验证**
   ```bash
   # 检查配置是否正确
   pnpm build
   
   # 应该看到类似输出：
   # ✔ Built extension in XXX ms
   # ├─ .output/chrome-mv3/manifest.json
   # ├─ .output/chrome-mv3/github-sidepanel.html
   # └─ ...
   ```

### 浏览器扩展加载

#### Chrome/Edge（推荐）

1. **开发模式加载**：
   ```bash
   # 启动开发服务器
   pnpm dev
   ```

2. **浏览器配置**：
   - 打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `.output/chrome-mv3` 目录

3. **热重载支持**：
   - 开发模式下，代码修改会自动重新构建
   - 需要手动刷新扩展以应用更改

#### Firefox

1. **开发模式**：
   ```bash
   pnpm dev:firefox
   ```

2. **加载扩展**：
   - 打开 `about:debugging`
   - 点击"此Firefox"
   - 点击"临时加载附加组件"
   - 选择 `.output/firefox-mv2/manifest.json`

## 🧪 功能测试指南

### 基础功能测试

1. **GitHub仓库检测**：
   ```
   测试URL：
   ✅ https://github.com/torvalds/linux
   ✅ https://github.com/microsoft/vscode  
   ✅ https://github.com/facebook/react
   
   无效URL（应该不激活）：
   ❌ https://github.com/settings
   ❌ https://github.com/explore
   ❌ https://github.com/trending
   ```

2. **侧边栏行为**：
   - 点击扩展图标 → 侧边栏应该在右侧打开
   - 只有一个header（Chrome原生，无重复）
   - 内容区域正确加载iframe

3. **仓库切换自动更新测试**（v1.2.0新增）：
   
   **步骤A：基础切换测试**
   ```
   1. 访问 https://github.com/torvalds/linux
   2. 点击扩展图标打开侧边栏
   3. 确认显示 linux 仓库的DeepWiki内容
   4. 在地址栏输入 https://github.com/microsoft/vscode
   5. 按回车跳转到新仓库
   6. ✅ 侧边栏应该自动更新显示 vscode 仓库的内容
   ```
   
   **步骤B：侧边栏保持打开状态切换测试**（v1.2.0重点修复）
   ```
   1. 访问 https://github.com/facebook/react
   2. 点击扩展图标打开侧边栏
   3. 确认显示 react 仓库的DeepWiki内容
   4. 保持侧边栏打开状态
   5. 在地址栏输入 https://github.com/vuejs/vue
   6. 按回车跳转到新仓库
   7. ✅ 侧边栏应该立即自动更新显示 vue 仓库的内容
   8. 再次切换到 https://github.com/angular/angular
   9. ✅ 侧边栏应该再次自动更新显示 angular 仓库的内容
   
   调试提示：如果步骤7或9失败，打开 chrome://extensions/ → DeepWiki Extension → 检查视图：Service Worker
   应该看到类似日志：
   - "Repo changed from facebook/react to vuejs/vue"
   - "Attempting to send message (attempt 1/3)"
   - "Message sent successfully, response: {success: true, received: true}"
   ```
   
   **步骤C：关闭后重新打开测试**
   ```
   1. 访问 https://github.com/facebook/react
   2. 点击扩展图标打开侧边栏
   3. 点击侧边栏的X按钮关闭
   4. 在地址栏输入 https://github.com/vuejs/vue
   5. 按回车跳转到新仓库
   6. 点击扩展图标重新打开侧边栏
   7. ✅ 侧边栏应该显示 vue 仓库的内容（不是之前的react）
   ```
   
   **步骤D：同仓库导航测试**
   ```
   1. 访问 https://github.com/torvalds/linux
   2. 打开侧边栏
   3. 点击仓库内的文件/目录，如进入 /kernel/ 目录
   4. ✅ 侧边栏内容应该保持不变（不重新加载）
   5. 从 /kernel/ 返回仓库根目录
   6. ✅ 侧边栏内容仍应保持不变
   ```

4. **导航测试**：
   - 在侧边栏打开时切换到不同仓库
   - 内容应该自动更新
   - 标签页状态正确管理

### 错误处理测试

1. **文档不存在**：
   - 访问一个DeepWiki上没有文档的仓库
   - 应该显示友好的错误信息和重试选项

2. **网络错误**：
   - 断开网络连接后尝试加载
   - 应该自动重试并提供备选方案

### 性能测试

1. **加载速度**：
   - 首次打开侧边栏应该在2-3秒内完成
   - 切换仓库应该快速响应

2. **内存使用**：
   - 检查Chrome任务管理器中的内存使用
   - 关闭侧边栏后资源应该正确释放

## 🔍 故障排除

### 常见问题解决

#### 问题：双Header显示
**状态**：✅ 已在v1.2.0中修复

**如果仍然出现**：
1. 检查是否使用了最新版本
2. 确认manifest.json中没有`side_panel`条目
3. 重新构建并重新加载扩展

#### 问题：侧边栏不显示内容
**状态**：✅ 已在v1.2.0中修复

**排查步骤**：
1. 打开Chrome DevTools检查控制台错误
2. 检查background script是否正确检测到GitHub仓库
3. 验证存储中的仓库信息是否正确

#### 问题：侧边栏打开状态下repo切换失效
**状态**：✅ 已在v1.2.0中修复

**现象**：
- 侧边栏保持打开状态时，在GitHub上切换仓库，侧边栏不会自动更新内容
- 只有关闭再重新打开侧边栏才能看到新仓库的内容

**解决方法**：
1. 确保使用v1.2.0或更高版本
2. 重新构建并重新加载扩展
3. 测试验证：
   ```bash
   # 按照INSTALL.md中的"步骤B：侧边栏保持打开状态切换测试"进行验证
   # 应该看到侧边栏立即响应repo切换
   ```
4. 如果问题仍然存在，查看日志：
   ```bash
   # 在background script中应该看到：
   # "Attempting to send message (attempt 1/3)"
   # "Message sent successfully, response: {success: true, received: true}"
   
   # 在侧边栏中应该看到：
   # "Received message: {type: 'UPDATE_REPO', username: '...', repo: '...'}"
   # "Different repo detected, updating content..."
   ```

#### 问题：扩展图标不激活
**可能原因**：
- 不是有效的GitHub仓库页面
- URL解析失败

**解决方法**：
```bash
# 查看background script日志
chrome://extensions/ → DeepWiki Extension → 检查视图：Service Worker
```

### 调试技巧

1. **后台脚本调试**：
   ```javascript
   // 在Chrome中查看service worker日志
   chrome://extensions/ → 检查视图：Service Worker
   ```

2. **侧边栏调试**：
   ```javascript
   // 右键侧边栏 → 检查元素
   // 查看console日志和网络请求
   ```

3. **存储数据检查**：
   ```javascript
   // 在console中执行
   chrome.storage.local.get(null).then(console.log);
   ```

## 🚀 生产部署

### 构建生产版本

```bash
# Chrome版本
pnpm build

# Firefox版本
pnpm build:firefox

# 打包为ZIP
pnpm zip
```

### 发布到Chrome Web Store

1. 准备素材：
   - 扩展图标（128x128）
   - 截图（1280x800或640x400）
   - 详细描述和功能说明

2. 上传和审核：
   - 访问 [Chrome开发者控制台](https://chrome.google.com/webstore/devconsole/)
   - 上传ZIP文件
   - 填写扩展信息
   - 提交审核（通常1-3个工作日）

### 发布到Firefox Add-ons

1. 准备Firefox版本：
   ```bash
   pnpm build:firefox
   pnpm zip:firefox
   ```

2. 提交审核：
   - 访问 [Firefox开发者中心](https://addons.mozilla.org/developers/)
   - 上传ZIP文件
   - 提交审核

## 📈 版本更新

### v1.2.0更新内容

1. **架构重构**：
   - 解决双header问题
   - 优化消息传递机制
   - 简化界面设计

2. **用户体验改进**：
   - 更快的加载速度
   - 更好的错误处理
   - 更简洁的界面

3. **开发体验提升**：
   - 更清晰的代码结构
   - 更好的调试支持
   - 更详细的文档

### 升级指南

从旧版本升级：
1. 拉取最新代码
2. 重新安装依赖：`pnpm install`
3. 重新构建：`pnpm build`
4. 在浏览器中重新加载扩展

## 💡 开发建议

1. **代码修改**：
   - 修改UI：编辑 `entrypoints/github-sidepanel/` 文件
   - 修改逻辑：编辑 `entrypoints/background.ts`
   - 添加工具函数：编辑 `utils/` 目录

2. **调试流程**：
   - 使用 `pnpm dev` 启动开发服务器
   - 修改代码后刷新扩展
   - 查看console日志定位问题

3. **性能优化**：
   - 避免频繁的DOM操作
   - 合理使用Chrome存储API
   - 及时清理事件监听器

## 📞 技术支持

如果遇到问题：

1. **查看文档**：仔细阅读本安装指南和README
2. **检查日志**：查看浏览器console和background script日志
3. **版本确认**：确保使用的是最新版本v1.2.0
4. **社区支持**：在项目GitHub页面提交issue

---

**最后更新**：v1.2.0 - 2024年，架构重构与问题修复版本 