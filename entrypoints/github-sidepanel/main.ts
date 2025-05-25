// 类型定义
interface RepoInfo {
  username: string;
  repo: string;
  timestamp: number;
}

interface Message {
  type: 'UPDATE_REPO';
  username: string;
  repo: string;
  tabId: number;
}

class SidePanelManager {
  private currentRepoInfo: RepoInfo | null = null;
  private isLoading = false;
  private retryCount = 0;
  private maxRetries = 2;
  private loadTimeout: number | null = null;

  // DOM 元素引用
  private elements = {
    loading: document.getElementById('loading') as HTMLDivElement,
    error: document.getElementById('error') as HTMLDivElement,
    errorMessage: document.getElementById('error-message') as HTMLParagraphElement,
    contentContainer: document.getElementById('content-container') as HTMLDivElement,
    deepwikiFrame: document.getElementById('deepwiki-frame') as HTMLIFrameElement,
    retryBtn: document.getElementById('retry-btn') as HTMLButtonElement,
    gotoDeepwikiBtn: document.getElementById('goto-deepwiki') as HTMLButtonElement
  };

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    console.log('SidePanelManager initializing...');
    
    // 绑定事件监听器
    this.bindEventListeners();
    
    // 监听来自 background script 的消息
    this.setupMessageListener();
    
    // 加载当前标签页的仓库信息
    await this.loadCurrentRepo();
  }

  private bindEventListeners(): void {
    // 重试按钮
    this.elements.retryBtn.addEventListener('click', () => {
      if (this.currentRepoInfo) {
        this.retryCount = 0;
        this.loadDeepWikiContent(this.currentRepoInfo.username, this.currentRepoInfo.repo);
      }
    });

    // 前往 DeepWiki 按钮
    this.elements.gotoDeepwikiBtn.addEventListener('click', () => {
      this.loadDeepWikiHomepage();
    });

    // iframe 加载完成事件
    this.elements.deepwikiFrame.addEventListener('load', () => {
      this.handleLoadSuccess();
    });

    // iframe 加载错误事件
    this.elements.deepwikiFrame.addEventListener('error', () => {
      this.handleLoadError('Failed to load the documentation page');
    });
  }

  private setupMessageListener(): void {
    console.log('Setting up message listener...');
    
    // 监听来自 background script 的消息
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      console.log('Received message:', message);
      console.log('Message sender:', sender);
      
      if (message.type === 'UPDATE_REPO') {
        console.log(`Updating repo to ${message.username}/${message.repo}`);
        console.log('Current repo info:', this.currentRepoInfo);
        
        // 检查是否是不同的仓库
        const isDifferentRepo = !this.currentRepoInfo || 
          this.currentRepoInfo.username !== message.username || 
          this.currentRepoInfo.repo !== message.repo;
        
        if (isDifferentRepo) {
          console.log('Different repo detected, updating content...');
          console.log(`Changing from ${this.currentRepoInfo?.username}/${this.currentRepoInfo?.repo} to ${message.username}/${message.repo}`);
          
          this.currentRepoInfo = {
            username: message.username,
            repo: message.repo,
            timestamp: Date.now()
          };
          this.retryCount = 0;
          this.loadDeepWikiContent(message.username, message.repo);
        } else {
          console.log('Same repo, no need to update content');
        }
      } else {
        console.log('Unknown message type:', message.type);
      }
      
      // 立即响应，表示消息已收到
      sendResponse({ success: true, received: true, currentRepo: this.currentRepoInfo });
      return true; // 表示异步响应
    });
    
    console.log('Message listener setup completed');
  }

  private async loadCurrentRepo(): Promise<void> {
    try {
      console.log('Loading current repo information...');
      
      // 获取当前活动标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        throw new Error('No active tab found');
      }

      const tabId = tabs[0].id;
      console.log('Current tab ID:', tabId);
      
      // 从存储中获取仓库信息
      const result = await chrome.storage.local.get(`sidepanel_${tabId}`);
      const repoInfo = result[`sidepanel_${tabId}`] as RepoInfo;

      console.log('Retrieved repo info from storage:', repoInfo);

      if (repoInfo) {
        this.currentRepoInfo = repoInfo;
        console.log(`Loading DeepWiki content for ${repoInfo.username}/${repoInfo.repo}`);
        this.loadDeepWikiContent(repoInfo.username, repoInfo.repo);
      } else {
        console.log('No repo info found in storage');
        this.showError('No repository information found. Please click the extension icon on a GitHub repository page.');
      }
    } catch (error) {
      console.error('Failed to load current repo:', error);
      this.showError('Failed to load repository information.');
    }
  }

  private loadDeepWikiContent(username: string, repo: string): void {
    if (this.isLoading) return;
    
    console.log(`Loading DeepWiki content for ${username}/${repo}`);
    
    this.isLoading = true;
    this.showLoading();
    
    // 清除之前的超时
    if (this.loadTimeout) {
      window.clearTimeout(this.loadTimeout);
    }
    
    const deepwikiUrl = `https://deepwiki.com/${username}/${repo}`;
    console.log('Loading URL:', deepwikiUrl);
    
    // 直接尝试加载 iframe 内容
    this.elements.deepwikiFrame.src = deepwikiUrl;
    
    // 设置加载超时
    this.loadTimeout = window.setTimeout(() => {
      if (this.isLoading) {
        console.log('Load timeout reached');
        this.handleLoadError('Loading timeout. The documentation might not be available for this repository.');
      }
    }, 10000); // 10秒超时
  }

  private handleLoadSuccess(): void {
    console.log('DeepWiki content loaded successfully');
    
    if (this.loadTimeout) {
      window.clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
    
    this.isLoading = false;
    this.retryCount = 0;
    this.showContent();
  }

  private handleLoadError(message: string): void {
    console.error('Load error:', message);
    
    if (this.loadTimeout) {
      window.clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
    
    this.isLoading = false;
    
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Retrying... (${this.retryCount}/${this.maxRetries})`);
      
      setTimeout(() => {
        if (this.currentRepoInfo) {
          this.loadDeepWikiContent(this.currentRepoInfo.username, this.currentRepoInfo.repo);
        }
      }, 2000);
      return;
    }
    
    // 重试次数用完，显示错误页面但不自动跳转
    this.showError(message);
  }

  private loadDeepWikiHomepage(): void {
    console.log('Loading DeepWiki homepage');
    this.isLoading = true;
    this.showLoading();
    
    this.elements.deepwikiFrame.src = 'https://deepwiki.com';
    
    setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.showContent();
      }
    }, 5000);
  }

  private showLoading(): void {
    this.elements.loading.style.display = 'flex';
    this.elements.error.style.display = 'none';
    this.elements.contentContainer.style.display = 'none';
  }

  private showError(message: string): void {
    this.elements.loading.style.display = 'none';
    this.elements.error.style.display = 'flex';
    this.elements.contentContainer.style.display = 'none';
    this.elements.errorMessage.textContent = message;
  }

  private showContent(): void {
    this.elements.loading.style.display = 'none';
    this.elements.error.style.display = 'none';
    this.elements.contentContainer.style.display = 'flex';
  }
}

// 初始化侧边栏管理器
document.addEventListener('DOMContentLoaded', () => {
  new SidePanelManager();
}); 