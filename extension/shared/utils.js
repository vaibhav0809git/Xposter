// Utility functions for XPoster Extension
const utils = {
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  safeQuery: (selector, parent = document) => {
    try {
      return parent.querySelector(selector);
    } catch (e) {
      return null;
    }
  },

  injectStyles: (css) => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  },

  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard error:', err);
      return false;
    }
  }
};

if (typeof module !== 'undefined') {
  module.exports = utils;
}
