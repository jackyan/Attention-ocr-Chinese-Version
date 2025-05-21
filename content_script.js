// content_script.js

const SIDEBAR_HOST_ID = 'deepwiki-sidebar-host';
let sidebarHost = null; // To keep a reference to the iframe host

function getOrCreateSidebarHost() {
  if (document.getElementById(SIDEBAR_HOST_ID)) {
    return document.getElementById(SIDEBAR_HOST_ID);
  }

  const iframe = document.createElement('iframe');
  iframe.id = SIDEBAR_HOST_ID;
  // Basic styling - more specific styles like initial position (off-screen) and transition are applied via class or direct style manipulation
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.right = '0';
  iframe.style.width = '33%'; // Target width
  iframe.style.height = '100vh'; // Full viewport height
  iframe.style.border = 'none';
  iframe.style.zIndex = '9999'; // High z-index
  iframe.style.boxShadow = '-2px 0 5px rgba(0,0,0,0.1)';
  iframe.style.transition = 'transform 0.3s ease-in-out';
  iframe.style.transform = 'translateX(100%)'; // Initially off-screen to the right
  iframe.src = chrome.runtime.getURL('sidebar.html');

  document.body.appendChild(iframe);
  return iframe;
}

// Function to send the URL to the internal iframe within sidebar.html
function sendUrlToSidebarIframe(url) {
  if (sidebarHost && sidebarHost.contentWindow) {
    // Send message to sidebar.js (running in the iframe)
    sidebarHost.contentWindow.postMessage({ action: 'loadDeepWikiUrl', url: url }, '*'); // Use '*' for targetOrigin for simplicity, but a specific origin is safer if known.
    console.log("DeepWiki Sidebar: Sent URL to sidebar.js:", url);
  } else {
    console.error("DeepWiki Sidebar: Cannot send URL, sidebarHost or contentWindow not available.");
  }
}

// Ensure sidebarHost is initialized on script load if it was previously open (e.g., page reload)
// This is tricky because content scripts are stateless across navigations unless background script restores state.
// Background script will send a message if sidebar should be open.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) { // Ensure message is from the extension itself
      return;
  }

  sidebarHost = getOrCreateSidebarHost(); // Ensure sidebar host exists

  if (message.action === "toggleSidebar") {
    if (message.forceClose) {
      // Close the sidebar
      sidebarHost.style.transform = 'translateX(100%)';
      // document.body.classList.remove('deepwiki-sidebar-active'); // If using body class for content pushing
      console.log("DeepWiki Sidebar: Closing sidebar.");
      // Inform background script that sidebar is now closed (if it wasn't initiated by background)
      // This is now mainly handled by the sidebar's own close button via background script.
      // However, if background directly asks to close, no need to send 'sidebarClosed' again.
      // Also, inform the sidebar.js script that it's being closed.
      if (sidebarHost && sidebarHost.contentWindow) {
         sidebarHost.contentWindow.postMessage({ action: 'sidebarClosing' }, '*');
      }
    } else {
      // Open or update the sidebar
      // Set or update the iframe src if URL is provided
      if (message.url) {
        // Send the URL to the sidebar.js script running inside the iframe
        sendUrlToSidebarIframe(message.url);
      }
      sidebarHost.style.transform = 'translateX(0%)'; // Slide in
      // document.body.classList.add('deepwiki-sidebar-active'); // If using body class for content pushing
      console.log("DeepWiki Sidebar: Opening/updating sidebar.");
    }
    // sendResponse({ status: "ok" }); // No need to send response if not used asynchronously
  } else if (message.action === "updateSidebarContent") {
    // This action is used when navigating between different GitHub repos with the sidebar already open.
    // We should update the content regardless of current animation state, as background script says it's open.
    if (sidebarHost) {
      if (message.url) {
        // Send the updated URL to the sidebar.js script
        sendUrlToSidebarIframe(message.url);
      } else {
         console.warn("DeepWiki Sidebar: Received updateSidebarContent message without a URL.");
      }
    } else {
      // Sidebar is not currently visible, so just prepare it as if it's a toggle open
      // This case should ideally be handled by background.js logic to send "toggleSidebar" instead.
      console.log("DeepWiki Sidebar: Received updateSidebarContent but sidebar is not visible. URL:", message.url);
      // Optionally, open it if it's not visible:
      // sidebarHost.style.transform = 'translateX(0%)';
      // ... then set src (similar to toggleSidebar)
      console.error("DeepWiki Sidebar: Received updateSidebarContent but sidebarHost element does not exist.");
    }
    // sendResponse({ status: "ok" }); // No need to send response if not used asynchronously
  }
});

console.log("DeepWiki GitHub Integration content script loaded.");

// Optional: If the sidebar needs to inform the background script about being closed by some means
// other than its own button (e.g., dev tools), that logic could go here.
// However, the primary close path is now: sidebar.js button -> background.js -> content_script.js (forceClose)
