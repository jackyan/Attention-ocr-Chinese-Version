export default defineBackground(() => {
  // 存储侧边栏状态
  let sidePanelStates: { [tabId: number]: { isOpen: boolean; repoInfo?: { username: string; repo: string } } } = {};

  // 设置插件行为：点击动作按钮时打开侧边栏
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // 监听动作按钮点击
  chrome.action.onClicked.addListener(async (tab) => {
    console.log('Action clicked for tab:', tab.id, tab.url);
    
    if (!tab.id || !tab.url) {
      console.log('No tab ID or URL');
      return;
    }

    const repoInfo = extractGitHubRepoInfo(tab.url);
    if (!repoInfo) {
      console.log('Not a GitHub repository page:', tab.url);
      return;
    }

    console.log('GitHub repo detected:', repoInfo);

    // 存储当前仓库信息到 storage，供侧边栏使用
    await chrome.storage.local.set({
      [`sidepanel_${tab.id}`]: {
        username: repoInfo.username,
        repo: repoInfo.repo,
        timestamp: Date.now()
      }
    });

    console.log('Repo info stored for tab:', tab.id);

    // 设置侧边栏选项并打开
    try {
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: 'github-sidepanel.html',
        enabled: true
      });
      
      await chrome.sidePanel.open({ tabId: tab.id });
      
      sidePanelStates[tab.id] = { 
        isOpen: true, 
        repoInfo 
      };
      
      console.log('Side panel opened for tab:', tab.id);
      
      // 等待一下再发送消息，确保侧边栏已加载
      setTimeout(async () => {
        try {
          await sendMessageToSidePanel(tab.id!, {
            type: 'UPDATE_REPO',
            username: repoInfo.username,
            repo: repoInfo.repo,
            tabId: tab.id!
          });
          console.log('Message sent to sidepanel');
        } catch (error) {
          console.log('Could not send message to sidepanel (might not be ready):', (error as Error).message);
        }
      }, 500);
      
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  });

  // 监听标签页更新
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) return;

    console.log('Tab updated:', tabId, tab.url);
    
    const repoInfo = extractGitHubRepoInfo(tab.url);
    const currentState = sidePanelStates[tabId];

    if (!repoInfo) {
      // 不是 GitHub 仓库页面，禁用侧边栏
      console.log('Not a GitHub repo page, disabling sidepanel for tab:', tabId);
      try {
        await chrome.sidePanel.setOptions({
          tabId,
          enabled: false
        });
      } catch (error) {
        // 忽略错误
      }
      
      // 如果侧边栏是打开的，标记为关闭状态
      if (currentState?.isOpen) {
        sidePanelStates[tabId] = { isOpen: false };
      }
      
      // 清除存储的仓库信息
      await chrome.storage.local.remove(`sidepanel_${tabId}`);
      return;
    }

    console.log('GitHub repo detected on tab update:', repoInfo);

    // 是 GitHub 仓库页面，启用侧边栏
    try {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'github-sidepanel.html',
        enabled: true
      });
    } catch (error) {
      console.error('Failed to set sidepanel options:', error);
    }

    // 检查存储中的仓库信息
    const storedResult = await chrome.storage.local.get(`sidepanel_${tabId}`);
    const storedRepoInfo = storedResult[`sidepanel_${tabId}`];
    
    // 检查是否是不同的仓库（比较当前URL的repo和存储的repo）
    let shouldUpdate = false;
    
    if (!storedRepoInfo) {
      // 没有存储的信息，需要更新
      shouldUpdate = true;
      console.log('No stored repo info, updating...');
    } else {
      // 比较仓库信息
      const { username: storedUsername, repo: storedRepo } = storedRepoInfo;
      const { username: newUsername, repo: newRepo } = repoInfo;
      
      if (storedUsername !== newUsername || storedRepo !== newRepo) {
        shouldUpdate = true;
        console.log(`Repo changed from ${storedUsername}/${storedRepo} to ${newUsername}/${newRepo}`);
      } else {
        console.log(`Same repo ${newUsername}/${newRepo}, no update needed`);
      }
    }
    
    if (shouldUpdate) {
      // 更新存储的仓库信息
      await chrome.storage.local.set({
        [`sidepanel_${tabId}`]: {
          username: repoInfo.username,
          repo: repoInfo.repo,
          timestamp: Date.now()
        }
      });

      // 更新状态
      sidePanelStates[tabId] = { 
        isOpen: currentState?.isOpen || false, 
        repoInfo 
      };

      console.log('Updated repo info in storage for tab:', tabId);

      // 尝试发送消息更新侧边栏内容（无论侧边栏是否显示为打开状态）
      // 这是关键修复：不依赖isOpen状态判断，总是尝试发送消息
      try {
        await sendMessageToSidePanel(tabId, {
          type: 'UPDATE_REPO',
          username: repoInfo.username,
          repo: repoInfo.repo,
          tabId
        });
        console.log('Sent update message to sidepanel');
        
        // 如果消息发送成功，说明侧边栏可能是打开的，更新状态
        if (currentState) {
          sidePanelStates[tabId].isOpen = true;
        }
      } catch (error) {
        console.log('Failed to send update message to sidepanel:', (error as Error).message);
        // 如果消息发送失败，可能侧边栏已关闭，更新状态
        if (currentState) {
          sidePanelStates[tabId].isOpen = false;
        }
      }
    }
  });

  // 监听标签页移除
  chrome.tabs.onRemoved.addListener((tabId) => {
    // 清理状态
    delete sidePanelStates[tabId];
    chrome.storage.local.remove(`sidepanel_${tabId}`);
    console.log('Cleaned up tab:', tabId);
  });

  // 监听标签页激活
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    console.log('Tab activated:', tabId);
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;

    const repoInfo = extractGitHubRepoInfo(tab.url);
    
    if (repoInfo) {
      try {
        await chrome.sidePanel.setOptions({
          tabId,
          path: 'github-sidepanel.html',
          enabled: true
        });
        console.log('Enabled sidepanel for activated tab:', tabId);
      } catch (error) {
        console.error('Failed to enable sidepanel:', error);
      }
    } else {
      try {
        await chrome.sidePanel.setOptions({
          tabId,
          enabled: false
        });
        console.log('Disabled sidepanel for non-repo tab:', tabId);
      } catch (error) {
        // 忽略错误
      }
    }
  });

  // 初始化时检查当前活动标签页
  chrome.runtime.onInstalled.addListener(async () => {
    console.log('Extension installed/enabled');
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id && tabs[0]?.url) {
      const repoInfo = extractGitHubRepoInfo(tabs[0].url);
      if (repoInfo) {
        console.log('Initial tab is GitHub repo:', repoInfo);
        try {
          await chrome.sidePanel.setOptions({
            tabId: tabs[0].id,
            path: 'github-sidepanel.html',
            enabled: true
          });
        } catch (error) {
          console.error('Failed to enable sidepanel on init:', error);
        }
      }
    }
  });

  /**
   * 发送消息到侧边栏的辅助函数
   * 使用重试机制和超时处理，提高可靠性
   */
  async function sendMessageToSidePanel(tabId: number, message: any): Promise<void> {
    const maxRetries = 3;
    const retryDelay = 200; // 毫秒
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to send message (attempt ${attempt}/${maxRetries}):`, message);
        
        // 使用 Promise.race 添加超时控制
        const response = await Promise.race([
          chrome.runtime.sendMessage(message),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Message timeout')), 1000)
          )
        ]);
        
        console.log('Message sent successfully, response:', response);
        return; // 成功发送，退出重试循环
        
      } catch (error) {
        console.log(`Message send attempt ${attempt} failed:`, (error as Error).message);
        
        if (attempt === maxRetries) {
          // 最后一次尝试失败，抛出错误
          throw new Error(`Failed to send message after ${maxRetries} attempts: ${(error as Error).message}`);
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  /**
   * 从 GitHub URL 中提取用户名和仓库名
   */
  function extractGitHubRepoInfo(url: string): { username: string; repo: string } | null {
    try {
      const urlObj = new URL(url);
      
      // 检查是否是 GitHub 域名
      if (urlObj.hostname !== 'github.com') {
        return null;
      }

      // 解析路径，格式应该是 /{username}/{repo} 或 /{username}/{repo}/...
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      if (pathParts.length < 2) {
        return null;
      }

      const [username, repo] = pathParts;
      
      // 验证是否为有效的仓库页面（排除一些特殊页面）
      const excludedPaths = [
        'features', 'enterprise', 'pricing', 'marketplace',
        'explore', 'topics', 'collections', 'events', 'sponsors',
        'about', 'contact', 'blog', 'careers', 'help', 'security',
        'settings', 'notifications', 'watching', 'stars',
        'trending', 'search', 'new', 'organizations',
        'advisories', 'pulls', 'issues'
      ];
      
      if (excludedPaths.includes(username.toLowerCase())) {
        return null;
      }

      // 基本的用户名和仓库名验证
      const validNamePattern = /^[a-zA-Z0-9._-]+$/;
      if (!validNamePattern.test(username) || !validNamePattern.test(repo)) {
        return null;
      }

      // 排除一些明显不是仓库的路径
      const excludedRepoNames = [
        'search', 'new', 'import', 'codespaces', 'settings',
        'organizations', 'team', 'teams'
      ];
      
      if (excludedRepoNames.includes(repo.toLowerCase())) {
        return null;
      }

      return { username, repo };
    } catch (error) {
      console.error('Error parsing GitHub URL:', error);
      return null;
    }
  }
}); 