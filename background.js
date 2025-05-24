// background.js

async function sendMessageToTabWithRetry(
  tabId,
  message,
  retries = 3,
  initialDelay = 200
) {
  for (let i = 0; i < retries; i++) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return true;
    } catch (e) {
      if (
        e.message.includes("Could not establish connection") ||
        e.message.includes("Receiving end does not exist")
      ) {
        if (i === retries - 1) {
          console.error(
            `Failed to send message to tab ${tabId} after ${retries} retries: Action: ${message.action}`,
            e
          );
          return false;
        }
        const delay = initialDelay * Math.pow(2, i);
        console.warn(
          `Retry ${i + 1}/${retries} sending message to tab ${tabId} (action: ${
            message.action
          }) after ${delay}ms. Error: ${e.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          `Failed to send message to tab ${tabId} due to an unexpected error: Action: ${message.action}`,
          e
        );
        return false;
      }
    }
  }
  return false;
}

// Function to extract username and repository name from GitHub URL
function getRepoInfo(url) {
  if (!url) return null;
  // Matches 'github.com/username/repositoryname' and captures username and repositoryname.
  // It will ignore anything after repositoryname like /tree/main, /blob/main, /issues etc.
  // This simpler regex just captures the first two path segments after github.com/
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match && match[1] && match[2]) {
    // Remove .git suffix if present, from the repository name only
    return {
      username: match[1],
      repositoryname: match[2].replace(/\.git$/, ""),
    };
  }
  return null;
}

// Listener for the browser action (toolbar icon) click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || !tab.url.includes("github.com") || !tab.id) {
    console.log("Not a valid GitHub page or tab ID missing.");
    return;
  }

  const repoInfo = getRepoInfo(tab.url);
  if (!repoInfo) {
    console.log("Could not extract repo info from URL:", tab.url);
    return;
  }

  const currentSidebarStateResult = await chrome.storage.local.get([
    `sidebarOpen_${tab.id}`,
  ]);
  const isSidebarOpen = currentSidebarStateResult[`sidebarOpen_${tab.id}`];

  if (isSidebarOpen) {
    await sendMessageToTabWithRetry(tab.id, {
      action: "toggleSidebar",
      forceClose: true,
    });
    chrome.storage.local.set({
      [`sidebarOpen_${tab.id}`]: false,
      [`currentRepo_${tab.id}`]: null,
    });
    console.log("Sidebar closed for tab:", tab.id);
  } else {
    // Step 1: Show sidebar frame immediately
    const frameShown = await sendMessageToTabWithRetry(tab.id, {
      action: "toggleSidebar",
      repoInfo: repoInfo,
      // No URL yet, content_script will just show the frame
    });

    if (!frameShown) {
      console.error("Failed to show sidebar frame for tab:", tab.id);
      // Optionally, don't proceed to set storage or fetch URL if frame couldn't be shown
      return;
    }

    chrome.storage.local.set({
      // Mark as open
      [`sidebarOpen_${tab.id}`]: true,
      [`currentRepo_${tab.id}`]: repoInfo, // Store current repo context
    });
    console.log("Sidebar frame shown for tab:", tab.id);

    // Step 2: Fetch DeepWiki URL and then send it to load into the sidebar
    const deepWikiUrl = `https://deepwiki.com/${repoInfo.username}/${repoInfo.repositoryname}`;
    const deepWikiHomeUrl = "https://deepwiki.com/";
    let urlToLoad = deepWikiHomeUrl; // Default to home page

    try {
      const response = await fetch(deepWikiUrl, { method: "HEAD" });
      if (response.ok && response.status !== 404) {
        // Check for ok status too
        urlToLoad = deepWikiUrl;
      } else if (response.status === 404) {
        console.log(
          `DeepWiki page for ${repoInfo.username}/${repoInfo.repositoryname} not found. Loading DeepWiki homepage.`
        );
        // urlToLoad remains deepWikiHomeUrl
      } else {
        // Other non-OK statuses, still fallback to homepage
        console.warn(
          `Unexpected status ${response.status} for ${deepWikiUrl}. Loading DeepWiki homepage.`
        );
      }
    } catch (error) {
      console.error("Error checking DeepWiki page, will load homepage:", error);
      // urlToLoad remains deepWikiHomeUrl
    }

    // Send the URL to load into the now-visible sidebar frame
    await sendMessageToTabWithRetry(tab.id, {
      action: "updateSidebarContent",
      url: urlToLoad,
      repoInfo: repoInfo,
    });
    console.log(
      "Sidebar content URL sent for tab:",
      tab.id,
      "with URL:",
      urlToLoad
    );
  }
});

// Shared logic for handling navigation to a new URL within a tab where sidebar might be open
async function handlePossibleRepoChange(tabId, newUrl) {
  const currentSidebarStateResult = await chrome.storage.local.get([
    `sidebarOpen_${tabId}`,
  ]);
  const isSidebarOpen = currentSidebarStateResult[`sidebarOpen_${tabId}`];

  if (!newUrl || !newUrl.includes("github.com")) {
    if (isSidebarOpen) {
      await sendMessageToTabWithRetry(tabId, {
        action: "toggleSidebar",
        forceClose: true,
      });
      chrome.storage.local.set({
        [`sidebarOpen_${tabId}`]: false,
        [`currentRepo_${tabId}`]: null,
      });
      console.log(
        "Navigated away from GitHub (or invalid URL). Sidebar closed for tab:",
        tabId
      );
    }
    return;
  }

  if (isSidebarOpen) {
    const newRepoInfo = getRepoInfo(newUrl);
    const storedRepoInfoResult = await chrome.storage.local.get([
      `currentRepo_${tabId}`,
    ]);
    const currentRepo = storedRepoInfoResult[`currentRepo_${tabId}`];

    if (
      newRepoInfo &&
      (!currentRepo ||
        newRepoInfo.username !== currentRepo.username ||
        newRepoInfo.repositoryname !== currentRepo.repositoryname)
    ) {
      const deepWikiUrl = `https://deepwiki.com/${newRepoInfo.username}/${newRepoInfo.repositoryname}`;
      const deepWikiHomeUrl = "https://deepwiki.com/";
      let urlToLoad = deepWikiHomeUrl; // Default to home
      try {
        const response = await fetch(deepWikiUrl, { method: "HEAD" });
        if (response.ok && response.status !== 404) {
          urlToLoad = deepWikiUrl;
        } else if (response.status === 404) {
          console.log(
            `DeepWiki page for ${newRepoInfo.username}/${newRepoInfo.repositoryname} (nav) not found. Loading DeepWiki homepage.`
          );
        } else {
          console.warn(
            `Unexpected status ${response.status} for ${deepWikiUrl} (nav). Loading DeepWiki homepage.`
          );
        }
      } catch (error) {
        console.error("Error checking new DeepWiki page (nav):", error);
      }
      await sendMessageToTabWithRetry(tabId, {
        action: "updateSidebarContent",
        url: urlToLoad,
        repoInfo: newRepoInfo,
      });
      chrome.storage.local.set({ [`currentRepo_${tabId}`]: newRepoInfo });
      console.log(
        "Sidebar content updated for new repo in tab:",
        tabId,
        "URL:",
        newUrl
      );
    } else if (!newRepoInfo && currentRepo) {
      await sendMessageToTabWithRetry(tabId, {
        action: "toggleSidebar",
        forceClose: true,
      });
      chrome.storage.local.set({
        [`sidebarOpen_${tabId}`]: false,
        [`currentRepo_${tabId}`]: null,
      });
      console.log(
        "Navigated to a non-repo GitHub page. Sidebar closed for tab:",
        tabId
      );
    }
  }
}

// Listener for tab updates (e.g., full page loads, URL changes in address bar)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab && tab.url) {
    // Primary trigger: URL in changeInfo
    await handlePossibleRepoChange(tabId, changeInfo.url);
  } else if (
    changeInfo.status === "complete" &&
    tab &&
    tab.url &&
    tab.url.includes("github.com")
  ) {
    // Fallback: status is complete, and tab.url is a GitHub URL.
    // This helps catch cases where changeInfo.url might not be populated but tab.url is updated.
    await handlePossibleRepoChange(tabId, tab.url);
  }
});

// Listener for SPA navigations (e.g., GitHub's internal router using History API)
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  if (details.frameId === 0 && details.url) {
    // Ensure it's the main frame and URL is present
    await handlePossibleRepoChange(details.tabId, details.url);
  }
});

// Listener for tab removal to clean up storage
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`sidebarOpen_${tabId}`, `currentRepo_${tabId}`]);
  console.log("Tab removed, cleaned up storage for tabId:", tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  console.log(
    "Extension installed. DeclarativeNetRequest rules should be loaded from rules.json."
  );
  console.log(
    "Action button will be globally enabled; URL check happens on click."
  );
});

// Listen for messages from other parts of the extension (e.g., sidebar.js)
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "sidebarClosed" && sender.tab && sender.tab.id) {
    chrome.storage.local.set({
      [`sidebarOpen_${sender.tab.id}`]: false,
      [`currentRepo_${sender.tab.id}`]: null,
    });
    console.log(
      "Sidebar reported closed by content script for tab:",
      sender.tab.id
    );
  } else if (
    message.action === "closeSidebarViaButton" &&
    sender.tab &&
    sender.tab.id
  ) {
    await sendMessageToTabWithRetry(sender.tab.id, {
      action: "toggleSidebar",
      forceClose: true,
    });
    chrome.storage.local.set({
      [`sidebarOpen_${sender.tab.id}`]: false,
      [`currentRepo_${sender.tab.id}`]: null,
    });
    console.log(
      "Sidebar close requested from sidebar button for tab:",
      sender.tab.id
    );
  }
  // return true; // Uncomment if you need to send a response asynchronously
});
