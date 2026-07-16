// This script runs on the XPoster dashboard domain to sync settings to the extension
window.addEventListener('message', (event) => {
  if (event.data.type === 'XPOSTER_SYNC') {
    const { settings, apiKey, model } = event.data;
    chrome.storage.local.set({
      xposter_settings: settings,
      xposter_apikey: apiKey,
      xposter_model: model,
      xposter_dashboard_url: window.location.origin,
      last_sync: new Date().toISOString()
    }, () => {
      console.log('XPoster Extension: Settings synced successfully');
    });
  }

  if (event.data.type === 'GET_CONFIG') {
    chrome.storage.local.get(['xposter_settings', 'xposter_apikey', 'xposter_model', 'xposter_dashboard_url'], (result) => {
      window.postMessage({
        type: 'CONFIG_RESPONSE',
        settings: result.xposter_settings,
        apiKey: result.xposter_apikey,
        model: result.xposter_model,
        dashboardUrl: result.xposter_dashboard_url
      }, "*");
    });
  }
});

// Handle messages from the background script (e.g. Save to Drafts)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SAVE_TO_XPOSTER') {
    // Forward to the dashboard app
    window.postMessage(request, "*");
    sendResponse({ success: true });
  }
});

// Initial sync on load if we have data
chrome.storage.local.get(['xposter_settings', 'xposter_apikey', 'xposter_model', 'xposter_dashboard_url'], (result) => {
  if (result.xposter_settings) {
    window.postMessage({
      type: 'CONFIG_RESPONSE',
      settings: result.xposter_settings,
      apiKey: result.xposter_apikey,
      model: result.xposter_model,
      dashboardUrl: result.xposter_dashboard_url
    }, "*");
  }
});
