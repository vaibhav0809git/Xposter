// Logic to extract tweet data from the DOM
const tweetParser = {
  extractFromElement(el) {
    // X structure changes often, but we'll try to find common markers
    const tweetEl = el.closest('article[data-testid="tweet"]');
    if (!tweetEl) return null;

    try {
      const text = tweetEl.querySelector('[data-testid="tweetText"]')?.innerText || '';
      const author = tweetEl.querySelector('[data-testid="User-Name"] span')?.innerText || '';
      const username = tweetEl.querySelector('[data-testid="User-Name"] div:nth-child(2) span')?.innerText || '';
      const url = Array.from(tweetEl.querySelectorAll('a')).find(a => a.href.includes('/status/'))?.href || '';
      
      // Images
      const images = Array.from(tweetEl.querySelectorAll('div[data-testid="tweetPhoto"] img')).map(img => img.src);

      return {
        text,
        author,
        username,
        url,
        images,
        element: tweetEl
      };
    } catch (e) {
      console.error('XPoster Parser Error:', e);
      return null;
    }
  },

  highlight(el) {
    // Remove previous highlights
    document.querySelectorAll('.xposter-highlight').forEach(e => e.classList.remove('xposter-highlight'));
    
    const tweetEl = el.closest('article[data-testid="tweet"]');
    if (tweetEl) {
      tweetEl.classList.add('xposter-highlight');
    }
  }
};
