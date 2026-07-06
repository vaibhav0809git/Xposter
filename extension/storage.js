// Chrome storage helper for XPoster Extension
const storage = {
  get: (key) => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  },

  set: (key, value) => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },

  getAll: () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve(result);
      });
    });
  },

  syncConfig: (callback) => {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes.xposter_settings || changes.xposter_apikey)) {
        callback();
      }
    });
  }
};
