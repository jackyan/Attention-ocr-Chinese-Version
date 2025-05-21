// background.js

// Function to extract username and repository name from GitHub URL
function getRepoInfo(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match && match[1] && match[2]) {
    return { username: match[1], repositoryname: match[2].replace('.git', '') };
  }
  return null;
}

// Listener for the browser action (toolbar icon) click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || !tab.url.includes("github.com")) {
    console.log("Not a GitHub page.");
    // Action button is enabled globally, URL check handles behavior.
    return;
  }

  const repoInfo = getRepoInfo(tab.url);
  if (!repoInfo) {
    console.log("Could not extract repo info from URL:", tab.url);
    return;
  }

  // Check current state of the sidebar for this tab
  const currentSidebarState = await chrome.storage.local.get([`sidebarOpen_${tab.id}`]);
  const isSidebarOpen = currentSidebarState[`sidebarOpen_${tab.id}`];

  if (isSidebarOpen) {
    // Close the sidebar
    chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar", forceClose: true });
    chrome.storage.local.set({ [`sidebarOpen_${tab.id}`]: false, [`currentRepo_${tab.id}`]: null });
    console.log("Sidebar closed for tab:", tab.id);
  } else {
    // Open the sidebar
    const deepWikiUrl = `https://deepwiki.org/${repoInfo.username}/${repoInfo.repositoryname}`;
    const deepWikiHomeUrl = "https://deepwiki.org/";

    // Check if the DeepWiki page exists
    try {
      const response = await fetch(deepWikiUrl, { method: 'HEAD' });
      let urlToLoad = deepWikiUrl;
      if (response.status === 404) {
        console.log(`DeepWiki page for ${repoInfo.username}/${repoInfo.repositoryname} not found. Loading DeepWiki homepage.`);
        urlToLoad = deepWikiHomeUrl;
      }
      chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar", url: urlToLoad, repoInfo: repoInfo });
      chrome.storage.local.set({ [`sidebarOpen_${tab.id}`]: true, [`currentRepo_${tab.id}`]: repoInfo });
      console.log("Sidebar opened for tab:", tab.id, "with URL:", urlToLoad);
    } catch (error) {
      console.error("Error checking DeepWiki page:", error);
      // Fallback to DeepWiki homepage in case of network errors etc.
      chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar", url: deepWikiHomeUrl, repoInfo: repoInfo });
      chrome.storage.local.set({ [`sidebarOpen_${tab.id}`]: true, [`currentRepo_${tab.id}`]: repoInfo });
      console.log("Sidebar opened with DeepWiki homepage due to error for tab:", tab.id);
    }
  }
});

// Listener for tab updates to manage sidebar state
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) { // If the URL of the tab changes
    const currentSidebarState = await chrome.storage.local.get([`sidebarOpen_${tabId}`]);
    const isSidebarOpen = currentSidebarState[`sidebarOpen_${tabId}`];

    if (isSidebarOpen) {
      if (tab.url && tab.url.includes("github.com")) {
        const newRepoInfo = getRepoInfo(tab.url);
        const storedRepoInfo = await chrome.storage.local.get([`currentRepo_${tabId}`]);
        const currentRepo = storedRepoInfo[`currentRepo_${tabId}`];

        // If it's a new repository, update the sidebar content
        if (newRepoInfo && (!currentRepo || newRepoInfo.username !== currentRepo.username || newRepoInfo.repositoryname !== currentRepo.repositoryname)) {
          const deepWikiUrl = `https://deepwiki.org/${newRepoInfo.username}/${newRepoInfo.repositoryname}`;
          const deepWikiHomeUrl = "https://deepwiki.org/";
          try {
            const response = await fetch(deepWikiUrl, { method: 'HEAD' });
            let urlToLoad = deepWikiUrl;
            if (response.status === 404) {
              urlToLoad = deepWikiHomeUrl;
            }
            chrome.tabs.sendMessage(tabId, { action: "updateSidebarContent", url: urlToLoad, repoInfo: newRepoInfo });
            chrome.storage.local.set({ [`currentRepo_${tabId}`]: newRepoInfo });
            console.log("Sidebar content updated for new repo in tab:", tabId);
          } catch (error) {
            console.error("Error checking new DeepWiki page:", error);
            chrome.tabs.sendMessage(tabId, { action: "updateSidebarContent", url: deepWikiHomeUrl, repoInfo: newRepoInfo });
            chrome.storage.local.set({ [`currentRepo_${tabId}`]: newRepoInfo });
          }
        } else if (!newRepoInfo && currentRepo) {
           // Navigated to a non-repo GitHub page (e.g. github.com/settings or root github.com)
           chrome.tabs.sendMessage(tabId, { action: "toggleSidebar", forceClose: true });
           chrome.storage.local.set({ [`sidebarOpen_${tabId}`]: false, [`currentRepo_${tabId}`]: null });
           console.log("Navigated to a non-repo GitHub page. Sidebar closed for tab:", tabId);
        }
      } else {
        // Navigated away from GitHub, close the sidebar
        chrome.tabs.sendMessage(tabId, { action: "toggleSidebar", forceClose: true });
        chrome.storage.local.set({ [`sidebarOpen_${tabId}`]: false, [`currentRepo_${tabId}`]: null });
        console.log("Navigated away from GitHub. Sidebar closed for tab:", tabId);
      }
    }
  }
});

// Listener for tab removal to clean up storage
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`sidebarOpen_${tabId}`, `currentRepo_${tabId}`]);
  console.log("Tab removed, cleaned up storage for tabId:", tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  // Rules for enabling the action on github.com pages
  // MV3 uses chrome.action.enable/disable or relies on activeTab for context.
  // For simplicity, the action button will always be enabled, and we'll check the URL in the onClicked listener.
  // If more specific enabling/disabling is needed, it would be done via chrome.action.enable(tab.id) / disable(tab.id)
  // based on tab URL changes. The declarativeContent API is not available in MV3.

  // The declarativeNetRequest rules are now in rules.json and loaded automatically.
  // No need to set them up dynamically here if they are in rules.json.
  console.log("Extension installed. DeclarativeNetRequest rules should be loaded from rules.json.");
  console.log("Action button will be globally enabled; URL check happens on click.");
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sidebarClosed" && sender.tab) {
    chrome.storage.local.set({ [`sidebarOpen_${sender.tab.id}`]: false, [`currentRepo_${sender.tab.id}`]: null });
    console.log("Sidebar reported closed by content script for tab:", sender.tab.id);
  } else if (message.action === "closeSidebarViaButton" && sender.tab) {
    // This message comes from sidebar.js (running in the iframe)
    // We need to tell the content script in that tab to close the sidebar.
    chrome.tabs.sendMessage(sender.tab.id, { action: "toggleSidebar", forceClose: true });
    // Also update our stored state
    chrome.storage.local.set({ [`sidebarOpen_${sender.tab.id}`]: false, [`currentRepo_${sender.tab.id}`]: null });
    console.log("Sidebar close requested from sidebar button for tab:", sender.tab.id);
  }
  // Acknowledge message was received (optional, but good practice if sendResponse might be used)
  // return true; // if you intend to send a response asynchronously. For this message, it's not needed.
});
