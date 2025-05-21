# DeepWiki GitHub Integration - Chrome Extension

This browser extension enhances your GitHub browsing experience by integrating DeepWiki.org documentation directly into repository pages.

## Features

-   **Contextual Activation**: The extension icon becomes active when you are on a GitHub repository page.
-   **One-Click Access**: Click the extension icon to open a sidebar on the right.
-   **DeepWiki Documentation**: The sidebar displays the corresponding DeepWiki.org documentation for the current GitHub repository.
-   **Responsive Sidebar**: The sidebar takes up approximately 1/3 of the window width, with GitHub content remaining visible and interactive in the other 2/3.
-   **Toggle Behavior**: Clicking the icon again while the sidebar is open for the same repository will close it.
-   **Dynamic Updates**: If you navigate to a different GitHub repository, the sidebar (if opened) will update to show documentation for the new repository.
-   **Homepage Fallback**: If a DeepWiki page for a specific repository is not found (404 error), the sidebar will display the DeepWiki.org homepage.
-   **Auto-Close (Partial)**: The sidebar closes if you navigate away from GitHub.com.
-   **Close Button**: A dedicated 'X' button within the sidebar allows you to close it.

## Files

The extension consists of the following files:

-   `manifest.json`: Defines the extension's properties, permissions, and components.
-   `background.js`: The service worker that manages the extension's core logic, including URL parsing, communication between components, and DeepWiki URL fetching.
-   `content_script.js`: Injected into GitHub pages to create and manage the sidebar iframe.
-   `sidebar.html`: The HTML structure for the content displayed within the sidebar (primarily an iframe for DeepWiki and a header with a close button).
-   `sidebar.css`: Styles for both the `sidebar.html` content and the host iframe injected into GitHub pages.
-   `sidebar.js`: Handles interactions within `sidebar.html`, such as the close button.
-   `rules.json`: Contains declarativeNetRequest rules to allow DeepWiki.org content to be embedded in an iframe.
-   `icons/`: Directory containing placeholder icons for the extension (icon16.png, icon48.png, icon128.png).

## How to Load and Test in Google Chrome

1.  **Download the Extension Files**:
    *   Ensure all the files listed above are downloaded into a single folder on your computer (e.g., `deepwiki-github-extension`).

2.  **Open Chrome Extensions Page**:
    *   Open Google Chrome.
    *   Type `chrome://extensions` in the address bar and press Enter.

3.  **Enable Developer Mode**:
    *   In the top right corner of the Extensions page, toggle the "Developer mode" switch to the ON position.

4.  **Load the Unpacked Extension**:
    *   Click the "Load unpacked" button that appears on the top left of the Extensions page.
    *   A file dialog will open. Navigate to the folder where you saved the extension files (e.g., `deepwiki-github-extension`).
    *   Select the folder itself (not any specific file within it) and click "Select Folder" or "Open".

5.  **Verify Installation**:
    *   The "DeepWiki GitHub Integration" extension should now appear in your list of installed extensions.
    *   You should also see its icon (a placeholder, if not replaced) in the Chrome toolbar (it might be under the puzzle piece icon for extensions).

6.  **Test the Extension**:
    *   **Navigate to a GitHub Repository**: Go to any public GitHub repository page (e.g., `https://github.com/torvalds/linux` or `https://github.com/microsoft/vscode`).
    *   **Click the Extension Icon**: Click the DeepWiki extension icon in your Chrome toolbar.
        *   The sidebar should open on the right side of the page.
        *   It should attempt to load the DeepWiki page for that repository (e.g., `https://deepwiki.org/torvalds/linux`).
    *   **Test 404 Fallback**: Navigate to a GitHub repository that you are sure does not have a DeepWiki page (e.g., create a new, empty repository on GitHub and navigate to it, or try a very obscure one: `https://github.com/someuser/nonexistentrepofordeepwikitest`). Click the icon.
        *   The sidebar should open and display the DeepWiki homepage (`https://deepwiki.org/`).
    *   **Test Toggle**: With the sidebar open, click the extension icon again.
        *   The sidebar should close.
    *   **Test Close Button**: Open the sidebar. Click the 'X' button at the top of the sidebar.
        *   The sidebar should close.
    *   **Test Navigation (Different Repo)**: With the sidebar open, navigate from one GitHub repository (e.g., `https://github.com/torvalds/linux`) directly to another (e.g., `https://github.com/microsoft/vscode`).
        *   The sidebar should remain open and update its content to reflect the new repository's DeepWiki page.
    *   **Test Navigation (Off GitHub)**: With the sidebar open, navigate to a non-GitHub page (e.g., `https://www.google.com`).
        *   The sidebar should close automatically.
    *   **Test Navigation (Back to GitHub)**: Navigate back to a GitHub repository. Click the icon.
        *   The sidebar should open with the correct content.

7.  **Debugging**:
    *   **Content Script**: To debug `content_script.js` or issues with the sidebar's appearance on the GitHub page, open Chrome Developer Tools (Ctrl+Shift+I or Cmd+Option+I) on the GitHub page itself. Check the "Console" and "Elements" tabs.
    *   **Background Script (Service Worker)**: On the `chrome://extensions` page, find the "DeepWiki GitHub Integration" extension card. Click the "Service worker" link. This will open a dedicated DevTools window for `background.js`.
    *   **Sidebar HTML/JS**: To debug `sidebar.html` and `sidebar.js`, right-click inside the opened sidebar area on the GitHub page and select "Inspect". This will open DevTools targeting the sidebar's iframe content.
    *   **Errors**: Check for any errors reported on the `chrome://extensions` page under the extension's card (there might be an "Errors" button).

This completes the basic setup and testing procedure.
