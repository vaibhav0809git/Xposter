// Background script for XPoster AI Copilot
chrome.runtime.onInstalled.addListener(() => {
  console.log('XPoster AI Copilot Extension Installed');
});

// Handle saving to drafts (communicates with the dashboard if open)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SAVE_TO_XPOSTER') {
    // Try to find an open XPoster tab (any localhost or 127.0.0.1)
    chrome.tabs.query({ url: ["*://localhost/*", "*://127.0.0.1/*"] }, (tabs) => {
       if (tabs.length > 0) {
         // Try to find specifically the XPoster tab by checking title or other markers if possible,
         // but for now any localhost tab will receive it and sync.js will bridge it if it matches.
         chrome.tabs.sendMessage(tabs[0].id, request);
         sendResponse({ success: true, message: 'Forwarded to XPoster tab' });
       } else {
         sendResponse({ success: false, message: 'XPoster dashboard is not open' });
       }
    });
    return true; // Keep channel open for async response
  }
});
