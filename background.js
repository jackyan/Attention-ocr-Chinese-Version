// background.js

async function sendMessageToTabWithRetry(
  tabId,
  message,
  retries = 3,
  initialDelay = 200
) {
  for (let i = 0; i < retries; i++) {
    try {
      // sendMessage itself doesn't always throw for "no receiving end" in a way
      // that stops the promise chain immediately for all callers, but if it does, we catch.
      // The main indicator is the console error "Uncaught (in promise)..."
      // We'll assume if it doesn't throw an error here, it might have "succeeded" (message sent, but maybe not received).
      // A robust solution would involve the content script sending an ack, but retry is a common first step.
      await chrome.tabs.sendMessage(tabId, message);
      // If the above line does not throw, we assume the message was sent.
      // The actual "Uncaught (in promise)" error happens if the promise returned by sendMessage rejects.
      return true;
    } catch (e) {
      if (
        e.message.includes("Could not establish connection") ||
        e.message.includes("Receiving end does not exist")
      ) {
        if (i === retries - 1) {
          // Last retry
          console.error(
            `Failed to send message to tab ${tabId} after ${retries} retries: Action: ${message.action}`,
            e
          );
          // Not re-throwing here to prevent background script from breaking entirely on this,
          // but logging it as a critical failure. The user will see the sidebar not appearing.
          return false;
        }
        const delay = initialDelay * Math.pow(2, i); // Exponential backoff
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
        return false; // Different error
      }
    }
  }
  return false; // Should be unreachable if logic is correct
}

// Function to extract username and repository name from GitHub URL
function getRepoInfo(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match && match[1] && match[2]) {
    return { username: match[1], repositoryname: match[2].replace(".git", "") };
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
  const currentSidebarState = await chrome.storage.local.get([
    `sidebarOpen_${tab.id}`,
  ]);
  const isSidebarOpen = currentSidebarState[`sidebarOpen_${tab.id}`];

  if (isSidebarOpen) {
    // Close the sidebar
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
    // Open the sidebar
    const deepWikiUrl = `https://deepwiki.com/${repoInfo.username}/${repoInfo.repositoryname}`;
    const deepWikiHomeUrl = "https://deepwiki.com/";

    // Check if the DeepWiki page exists
    try {
      const response = await fetch(deepWikiUrl, { method: "HEAD" });
      let urlToLoad = deepWikiUrl;
      if (response.status === 404) {
        console.log(
          `DeepWiki page for ${repoInfo.username}/${repoInfo.repositoryname} not found. Loading DeepWiki homepage.`
        );
        urlToLoad = deepWikiHomeUrl;
      }
      await sendMessageToTabWithRetry(tab.id, {
        action: "toggleSidebar",
        url: urlToLoad,
        repoInfo: repoInfo,
      });
      chrome.storage.local.set({
        [`sidebarOpen_${tab.id}`]: true,
        [`currentRepo_${tab.id}`]: repoInfo,
      });
      // The console log "Sidebar opened for tab..." is now implicitly covered by sendMessageToTabWithRetry logs or success.
      // console.log("Sidebar opened for tab:", tab.id, "with URL:", urlToLoad); // Original line 50 area
    } catch (error) {
      console.error("Error checking DeepWiki page:", error);
      // Fallback to DeepWiki homepage in case of network errors etc.
      await sendMessageToTabWithRetry(tab.id, {
        action: "toggleSidebar",
        url: deepWikiHomeUrl,
        repoInfo: repoInfo,
      });
      chrome.storage.local.set({
        [`sidebarOpen_${tab.id}`]: true,
        [`currentRepo_${tab.id}`]: repoInfo,
      });
      console.log(
        "Sidebar opened with DeepWiki homepage due to error for tab:",
        tab.id
      );
    }
  }
});

// Listener for tab updates to manage sidebar state
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Ensure tab object is valid, especially tab.url
  if (changeInfo.url && tab && tab.url) {
    const currentSidebarState = await chrome.storage.local.get([
      `sidebarOpen_${tabId}`,
    ]);
    const isSidebarOpen = currentSidebarState[`sidebarOpen_${tabId}`];

    if (isSidebarOpen) {
      if (tab.url && tab.url.includes("github.com")) {
        const newRepoInfo = getRepoInfo(tab.url);
        const storedRepoInfo = await chrome.storage.local.get([
          `currentRepo_${tabId}`,
        ]);
        const currentRepo = storedRepoInfo[`currentRepo_${tabId}`];

        // If it's a new repository, update the sidebar content
        if (
          newRepoInfo &&
          (!currentRepo ||
            newRepoInfo.username !== currentRepo.username ||
            newRepoInfo.repositoryname !== currentRepo.repositoryname)
        ) {
          const deepWikiUrl = `https://deepwiki.com/${newRepoInfo.username}/${newRepoInfo.repositoryname}`;
          const deepWikiHomeUrl = "https://deepwiki.com/";
          try {
            const response = await fetch(deepWikiUrl, { method: "HEAD" });
            let urlToLoad = deepWikiUrl;
            if (response.status === 404) {
              urlToLoad = deepWikiHomeUrl;
            }
            await sendMessageToTabWithRetry(tabId, {
              action: "updateSidebarContent",
              url: urlToLoad,
              repoInfo: newRepoInfo,
            });
            chrome.storage.local.set({ [`currentRepo_${tabId}`]: newRepoInfo });
            console.log("Sidebar content updated for new repo in tab:", tabId);
          } catch (error) {
            console.error("Error checking new DeepWiki page:", error);
            await sendMessageToTabWithRetry(tabId, {
              action: "updateSidebarContent",
              url: deepWikiHomeUrl,
              repoInfo: newRepoInfo,
            });
            chrome.storage.local.set({ [`currentRepo_${tabId}`]: newRepoInfo });
          }
        } else if (!newRepoInfo && currentRepo) {
          // Navigated to a non-repo GitHub page (e.g. github.com/settings or root github.com)
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
      } else {
        // Navigated away from GitHub, close the sidebar
        await sendMessageToTabWithRetry(tabId, {
          action: "toggleSidebar",
          forceClose: true,
        });
        chrome.storage.local.set({
          [`sidebarOpen_${tabId}`]: false,
          [`currentRepo_${tabId}`]: null,
        });
        console.log(
          "Navigated away from GitHub. Sidebar closed for tab:",
          tabId
        );
      }
    }
  } else if (
    changeInfo.status === "loading" &&
    tab &&
    tab.url &&
    !tab.url.startsWith("chrome://")
  ) {
    // This case handles when a tab is reloaded or navigated, and it's still loading.
    // We might want to ensure the content script gets the message if the sidebar was open.
    // This is complex because the content script might not be there yet.
    // The existing logic for `updateSidebarContent` on URL change should mostly handle this
    // once the URL is stable. The retry mechanism is key.
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
  console.log(
    "Extension installed. DeclarativeNetRequest rules should be loaded from rules.json."
  );
  console.log(
    "Action button will be globally enabled; URL check happens on click."
  );
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "sidebarClosed" && sender.tab) {
    chrome.storage.local.set({
      [`sidebarOpen_${sender.tab.id}`]: false,
      [`currentRepo_${sender.tab.id}`]: null,
    });
    console.log(
      "Sidebar reported closed by content script for tab:",
      sender.tab.id
    );
  } else if (message.action === "closeSidebarViaButton" && sender.tab) {
    // This message comes from sidebar.js (running in the iframe)
    // We need to tell the content script in that tab to close the sidebar.
    if (sender.tab && sender.tab.id) {
      await sendMessageToTabWithRetry(sender.tab.id, {
        action: "toggleSidebar",
        forceClose: true,
      });
      // Also update our stored state
      chrome.storage.local.set({
        [`sidebarOpen_${sender.tab.id}`]: false,
        [`currentRepo_${sender.tab.id}`]: null,
      });
      console.log(
        "Sidebar close requested from sidebar button for tab:",
        sender.tab.id
      );
    } else {
      console.warn(
        "Received closeSidebarViaButton without valid sender.tab.id"
      );
    }
  }
  // Acknowledge message was received (optional, but good practice if sendResponse might be used)
  // return true; // if you intend to send a response asynchronously. For this message, it's not needed.
});
