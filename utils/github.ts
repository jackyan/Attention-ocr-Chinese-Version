/**
 * GitHub 仓库信息接口
 */
export interface GitHubRepoInfo {
  username: string;
  repo: string;
}

/**
 * 从 GitHub URL 中提取用户名和仓库名
 * @param url GitHub 页面的 URL
 * @returns 提取的仓库信息，如果不是有效的仓库页面则返回 null
 */
export function extractGitHubRepoInfo(url: string): GitHubRepoInfo | null {
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

/**
 * 检查 URL 是否是 GitHub 仓库页面
 * @param url 要检查的 URL
 * @returns 是否是 GitHub 仓库页面
 */
export function isGitHubRepoUrl(url: string): boolean {
  return extractGitHubRepoInfo(url) !== null;
}

/**
 * 构建 DeepWiki URL
 * @param username GitHub 用户名
 * @param repo GitHub 仓库名
 * @returns DeepWiki 文档页面的 URL
 */
export function buildDeepWikiUrl(username: string, repo: string): string {
  return `https://deepwiki.com/${username}/${repo}`;
}

/**
 * 验证仓库名称是否有效
 * @param name 仓库或用户名
 * @returns 是否有效
 */
export function isValidRepoName(name: string): boolean {
  // GitHub 用户名和仓库名的基本规则
  if (!name || name.length === 0 || name.length > 39) {
    return false;
  }
  
  // 不能以点或连字符开头或结尾
  if (name.startsWith('.') || name.startsWith('-') || 
      name.endsWith('.') || name.endsWith('-')) {
    return false;
  }
  
  // 只能包含字母数字、点、连字符和下划线
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  return validPattern.test(name);
}

/**
 * 从完整的 GitHub URL 获取简短的仓库标识
 * @param url GitHub URL
 * @returns 仓库标识字符串，格式为 "username/repo"
 */
export function getRepoIdentifier(url: string): string | null {
  const repoInfo = extractGitHubRepoInfo(url);
  if (!repoInfo) {
    return null;
  }
  return `${repoInfo.username}/${repoInfo.repo}`;
}

/**
 * 检查两个仓库信息是否相同
 * @param repo1 第一个仓库信息
 * @param repo2 第二个仓库信息
 * @returns 是否相同
 */
export function isSameRepo(repo1: GitHubRepoInfo | null, repo2: GitHubRepoInfo | null): boolean {
  if (!repo1 || !repo2) {
    return false;
  }
  return repo1.username === repo2.username && repo1.repo === repo2.repo;
} 