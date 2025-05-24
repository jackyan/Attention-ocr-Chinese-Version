// content_script.js

const SIDEBAR_HOST_ID = "deepwiki-sidebar-host";
const GITHUB_MAIN_CONTENT_WRAPPER_SELECTOR = "body > div.logged-in"; // This is a guess, needs verification
let sidebarHost = null;
let originalBodyDisplay = "";
let githubMainContentWrapper = null;
let originalGithubMainContentWrapperStyle = "";
let resizerElement = null;
let isResizing = false;
let initialPanelWidth = 0;
let initialMouseX = 0;
let sidebarReady = false;
let queuedUrl = null;

const RESIZER_ID = "deepwiki-resizer";
const MIN_PANEL_WIDTH = 200; // Minimum width for the sidebar
const MAX_PANEL_WIDTH_PERCENT = 75; // Maximum width as a percentage of viewport

function getOrCreateSidebarHost() {
  let host = document.getElementById(SIDEBAR_HOST_ID);
  if (host) {
    return host;
  }

  host = document.createElement("iframe");
  host.id = SIDEBAR_HOST_ID;
  host.style.height = "100vh";
  host.style.width = "350px"; // Initial width, will be resizable
  host.style.border = "none";
  host.style.borderLeft = "1px solid #ccc"; // Separator
  host.style.boxSizing = "border-box"; // For more predictable width calculations
  host.src = chrome.runtime.getURL("sidebar.html");
  // No fixed positioning, it will be a flex item
  return host;
}

// Function to send the URL to the internal iframe within sidebar.html
function sendUrlToSidebarIframe(url) {
  console.log(
    `sendUrlToSidebarIframe called. URL: ${url}, sidebarReady: ${sidebarReady}, sidebarHost: ${!!sidebarHost}, contentWindow: ${!!(
      sidebarHost && sidebarHost.contentWindow
    )}`
  );
  if (sidebarReady && sidebarHost && sidebarHost.contentWindow) {
    sidebarHost.contentWindow.postMessage(
      { action: "loadDeepWikiUrl", url: url },
      "*"
    );
    console.log("DeepWiki Sidebar: Sent URL to sidebar.js:", url);
    queuedUrl = null; // Clear queue if sent
  } else if (sidebarHost && sidebarHost.contentWindow) {
    // This case means sidebarHost exists and has a contentWindow, but sidebarReady is false.
    console.log(
      `DeepWiki Sidebar: Sidebar not ready (sidebarReady=${sidebarReady}), queuing URL:`,
      url
    );
    queuedUrl = url; // Queue URL
  } else {
    // This case means sidebarHost itself or its contentWindow is not available.
    console.error(
      "DeepWiki Sidebar: Cannot send or queue URL, sidebarHost or contentWindow not available. Queuing URL:",
      url
    );
    queuedUrl = url; // Still queue it, hoping sidebarHost becomes available
  }
}

function activateSideBySideView() {
  if (!sidebarHost || !document.body.contains(sidebarHost)) {
    document.body.appendChild(sidebarHost);
  }
  sidebarHost.style.display = "block";

  originalBodyDisplay = document.body.style.display;
  document.body.style.display = "flex";

  // Attempt to identify and style GitHub's main content area
  // This is a common pattern, but GitHub's structure might vary.
  // We're looking for a direct child of body that wraps most of the content.
  githubMainContentWrapper =
    document.querySelector(GITHUB_MAIN_CONTENT_WRAPPER_SELECTOR) ||
    document.body.children[0];

  if (githubMainContentWrapper && githubMainContentWrapper !== sidebarHost) {
    originalGithubMainContentWrapperStyle =
      githubMainContentWrapper.style.cssText;
    githubMainContentWrapper.style.flex = "1 1 auto";
    githubMainContentWrapper.style.overflow = "auto"; // Ensure it can scroll independently
    githubMainContentWrapper.style.height = "100vh"; // Match sidebar height
  } else {
    // Fallback: if no clear main wrapper, or it's the sidebar itself (should not happen)
    // This might mean the layout won't be perfect, or all body children become the left panel.
    // For now, we'll proceed, but this part is crucial and might need refinement.
    console.warn(
      "DeepWiki Sidebar: Could not reliably identify GitHub's main content wrapper. Layout might be affected."
    );
  }
  // Resizer logic will be added here later
  createResizer();
  if (resizerElement && !document.body.contains(resizerElement)) {
    // Insert resizer before the sidebarHost
    document.body.insertBefore(resizerElement, sidebarHost);
  }
  if (resizerElement) resizerElement.style.display = "block";

  // Load stored width
  chrome.storage.local.get("deepwikiSidebarWidth", (data) => {
    if (data.deepwikiSidebarWidth && sidebarHost) {
      sidebarHost.style.width = `${data.deepwikiSidebarWidth}px`;
    }
  });
  // If there's a queued URL when activating, try sending it (sidebar might have become ready)
  if (queuedUrl && sidebarReady) {
    sendUrlToSidebarIframe(queuedUrl);
  }
}

function deactivateSideBySideView() {
  if (sidebarHost) {
    sidebarHost.style.display = "none"; // Or remove it: sidebarHost.remove();
  }
  if (resizerElement) {
    resizerElement.style.display = "none";
  }

  // Restore body styles
  document.body.style.display = originalBodyDisplay; // Restore original display (e.g., '', 'block', 'grid')
  document.body.style.overflow = ""; // Explicitly allow body to scroll if it's the scroller
  document.body.style.height = ""; // Remove any fixed height on body

  if (githubMainContentWrapper) {
    // Restore its original inline styles first.
    githubMainContentWrapper.style.cssText =
      originalGithubMainContentWrapperStyle;

    // Then, be very explicit about removing/resetting properties we manipulated,
    // ensuring they revert to browser/stylesheet defaults if not in original inline style.
    githubMainContentWrapper.style.flex = ""; // Remove from flex layout participation
    githubMainContentWrapper.style.height = "auto"; // Default height behavior
    githubMainContentWrapper.style.overflow = "visible"; // Default overflow behavior

    // If originalGithubMainContentWrapperStyle actually had values for these, cssText restoration would have done it.
    // These explicit sets ensure that if original was empty or different, they go to sensible defaults.
  }
  githubMainContentWrapper = null;
  console.log(
    "DeepWiki Sidebar: Deactivated side-by-side view, styles reverted."
  );
}

function createResizer() {
  if (document.getElementById(RESIZER_ID)) {
    resizerElement = document.getElementById(RESIZER_ID);
    return resizerElement;
  }
  resizerElement = document.createElement("div");
  resizerElement.id = RESIZER_ID;
  resizerElement.style.width = "3px"; // Make resizer thinner
  resizerElement.style.cursor = "col-resize";
  resizerElement.style.backgroundColor = "#e0e0e0"; // Slightly more subtle gray
  resizerElement.style.height = "100vh"; // Match panel height
  resizerElement.style.userSelect = "none"; // Prevent text selection during drag
  resizerElement.style.zIndex = "10000"; // Ensure resizer is on top
  resizerElement.style.transition = "background-color 0.2s ease"; // For hover effect

  // Hover effect for better visibility
  resizerElement.addEventListener("mouseenter", () => {
    resizerElement.style.backgroundColor = "#c0c0c0"; // Darken on hover
  });
  resizerElement.addEventListener("mouseleave", () => {
    if (!isResizing) {
      // Don't change color if currently resizing
      resizerElement.style.backgroundColor = "#e0e0e0";
    }
  });

  resizerElement.addEventListener("mousedown", (e) => {
    console.log("Resizer mousedown");
    e.preventDefault(); // Prevent text selection
    isResizing = true;
    initialPanelWidth = sidebarHost.offsetWidth;
    initialMouseX = e.clientX;
    console.log(
      "Initial panel width:",
      initialPanelWidth,
      "Initial mouse X:",
      initialMouseX
    );
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });
  return resizerElement;
}

function handleMouseMove(e) {
  if (!isResizing) return;
  const dx = e.clientX - initialMouseX;
  // Corrected logic: dragging left (dx < 0) should increase width, so subtract dx.
  let newWidth = initialPanelWidth - dx;

  const maxPanelWidth = (window.innerWidth * MAX_PANEL_WIDTH_PERCENT) / 100;

  if (newWidth < MIN_PANEL_WIDTH) newWidth = MIN_PANEL_WIDTH;
  if (newWidth > maxPanelWidth) newWidth = maxPanelWidth;

  console.log(
    "Resizer mousemove - dx:",
    dx,
    "initialPanelWidth:",
    initialPanelWidth,
    "calcNewWidth:",
    newWidth,
    "finalNewWidth:",
    newWidth
  );
  requestAnimationFrame(() => {
    if (sidebarHost && isResizing) {
      // Ensure still resizing and sidebarHost exists
      const newWidthPx = `${newWidth}px`;
      sidebarHost.style.width = newWidthPx;
      console.log("Resizer RAF: Set sidebarHost.style.width to", newWidthPx);
    }
  });
}

function handleMouseUp() {
  if (!isResizing) return;
  console.log("Resizer mouseup");
  isResizing = false;
  // Resetter hover color if mouseup happens over the resizer
  if (resizerElement.matches(":hover")) {
    resizerElement.style.backgroundColor = "#c0c0c0";
  } else {
    resizerElement.style.backgroundColor = "#e0e0e0";
  }
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  // Save the new width
  if (sidebarHost) {
    const finalWidth = sidebarHost.offsetWidth;
    console.log("Final panel width to save:", finalWidth);
    chrome.storage.local.set({ deepwikiSidebarWidth: finalWidth });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    return;
  }

  sidebarHost = getOrCreateSidebarHost(); // Ensure sidebar host element is created

  if (message.action === "toggleSidebar") {
    const isSidebarVisible =
      sidebarHost &&
      sidebarHost.style.display !== "none" &&
      document.body.contains(sidebarHost);

    if (message.forceClose || isSidebarVisible) {
      deactivateSideBySideView();
      console.log("DeepWiki Sidebar: Closing sidebar.");
      if (sidebarHost && sidebarHost.contentWindow) {
        sidebarHost.contentWindow.postMessage(
          { action: "sidebarClosing" },
          "*"
        );
      }
      sidebarReady = false; // Reset ready state when sidebar is closed
      queuedUrl = null; // Clear any queued URL
    } else {
      // This is the "open" path for toggleSidebar
      activateSideBySideView();
      // For the two-stage open, message.url will be undefined here.
      // The URL will be sent via a subsequent 'updateSidebarContent' message.
      if (message.url) {
        // This handles if toggleSidebar is ever called with a URL directly
        sendUrlToSidebarIframe(message.url);
      }
      console.log("DeepWiki Sidebar: toggleSidebar - opened frame.");
    }
  } else if (message.action === "updateSidebarContent") {
    console.log(
      "DeepWiki Sidebar: Received updateSidebarContent. URL:",
      message.url
    );
    sidebarHost = getOrCreateSidebarHost(); // Ensure elements exist
    resizerElement = createResizer();

    // Check if the main layout is already active.
    // If not (e.g., page reloaded, background sends updateSidebarContent to restore state), activate it.
    const isLayoutActive =
      document.body.style.display === "flex" &&
      sidebarHost.style.display === "block";

    if (!isLayoutActive) {
      console.log(
        "DeepWiki Sidebar: updateSidebarContent - layout not active, activating now."
      );
      activateSideBySideView(); // This will set up the full view
    } else {
      // Layout is already active, just refresh GitHub main content wrapper styles for SPA
      // and ensure elements are correctly positioned. This avoids a full activateSideBySideView call.
      console.log(
        "DeepWiki Sidebar: updateSidebarContent - layout already active, refreshing main content styles."
      );
      originalBodyDisplay = document.body.style.display; // Should be 'flex'
      document.body.style.display = "flex"; // Re-affirm

      const currentGithubMainWrapper =
        document.querySelector(GITHUB_MAIN_CONTENT_WRAPPER_SELECTOR) ||
        document.body.children[0];

      if (
        currentGithubMainWrapper &&
        currentGithubMainWrapper !== githubMainContentWrapper
      ) {
        if (
          githubMainContentWrapper &&
          typeof originalGithubMainContentWrapperStyle === "string" &&
          document.body.contains(githubMainContentWrapper)
        ) {
          githubMainContentWrapper.style.cssText =
            originalGithubMainContentWrapperStyle;
        }
        githubMainContentWrapper = currentGithubMainWrapper;
        originalGithubMainContentWrapperStyle =
          githubMainContentWrapper.style.cssText;
      } else if (!githubMainContentWrapper && currentGithubMainWrapper) {
        githubMainContentWrapper = currentGithubMainWrapper;
        originalGithubMainContentWrapperStyle =
          githubMainContentWrapper.style.cssText;
      }

      if (
        githubMainContentWrapper &&
        githubMainContentWrapper !== sidebarHost &&
        githubMainContentWrapper !== resizerElement
      ) {
        githubMainContentWrapper.style.flex = "1 1 auto";
        githubMainContentWrapper.style.overflow = "auto";
        githubMainContentWrapper.style.height = "100vh";
      }
      // Ensure elements are still in body and ordered (GitHub SPA might detach them)
      if (!document.body.contains(resizerElement))
        document.body.appendChild(resizerElement);
      if (!document.body.contains(sidebarHost))
        document.body.appendChild(sidebarHost);
      document.body.appendChild(resizerElement);
      document.body.appendChild(sidebarHost);

      if (resizerElement) resizerElement.style.display = "block";
      sidebarHost.style.display = "block"; // Ensure it's visible
    }

    if (message.url) {
      sendUrlToSidebarIframe(message.url);
    }
  }
});

console.log("DeepWiki GitHub Integration content script loaded.");

// Listen for messages from the iframe (sidebar.js)
window.addEventListener("message", (event) => {
  // Basic security check: ensure the message is from our iframe.
  // Comparing event.source is more reliable than event.origin for iframe children.
  if (sidebarHost && event.source === sidebarHost.contentWindow) {
    if (event.data && event.data.action === "sidebarReady") {
      console.log("Content Script: Received 'sidebarReady' message.");
      sidebarReady = true;
      if (queuedUrl) {
        console.log(
          "Content Script: Processing queued URL for ready sidebar:",
          queuedUrl
        );
        sendUrlToSidebarIframe(queuedUrl);
        // queuedUrl = null; // sendUrlToSidebarIframe will clear it
      }
    }
    // Handle other messages from sidebar if any
  }
});
