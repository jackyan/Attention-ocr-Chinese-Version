// sidebar.js
document.addEventListener('DOMContentLoaded', () => {
  const closeButton = document.getElementById('deepwiki-sidebar-close-btn');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      // Send a message to the content script to close the sidebar
      // The content script is running in the main page context and can manipulate the sidebar iframe
      // We need to ensure this message is caught by the content script.
      // A more robust way might be for the background script to orchestrate this,
      // but direct messaging to content script from an iframe it created is possible if the content script sets up a listener.

      // For now, let's assume content_script will listen for this.
      // However, direct parent-iframe communication is tricky.
      // A better approach: sidebar.js messages background.js, and background.js messages content_script.js.

      // Let's try to message the background script.
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: "closeSidebarViaButton" });
      } else {
        console.error("chrome.runtime.sendMessage not available. Cannot close sidebar.");
        // Fallback or alternative method might be needed if this context doesn't have chrome.runtime
        // (e.g. if sidebar.html is loaded in a way that loses extension context, though it shouldn't here)
      }
    });
  } else {
    console.error("Close button not found in sidebar.html");
  }

  // Potentially, code to adjust iframe content if DeepWiki's responsive design isn't enough
  // For now, we assume DeepWiki is responsive and the iframe's 100% width/height is sufficient.
  // Example:
  // window.addEventListener('resize', () => {
  //   console.log('Sidebar iframe resized');
  //   // If DeepWiki content needs specific JS adjustments on resize, they would go here.
  // });
});
