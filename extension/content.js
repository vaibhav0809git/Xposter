// Main Content Script for XPoster AI Copilot
(async function() {
  console.log('XPoster AI Copilot: Loading...');
  
  // 1. Check if enabled
  const config = await storage.get('xposter_settings');
  if (config && config.enabled === false) {
    console.log('XPoster Copilot is disabled in settings.');
    return;
  }

  // 2. Initialize UI
  await floatingButton.init(() => {
    floatingPanel.toggle();
  });
  await floatingPanel.init();

  // 3. Global Click Listener for Tweet Selection
  document.addEventListener('click', (e) => {
    // If we click inside the panel or button, ignore
    if (e.target.closest('#xposter-ai-button') || e.target.closest('#xposter-ai-panel')) {
      return;
    }

    const tweetData = tweetParser.extractFromElement(e.target);
    if (tweetData) {
      tweetParser.highlight(e.target);
      floatingPanel.handleTweetSelection(tweetData);
    }
  }, true); // Use capture phase to catch clicks before X's internal handlers

  // 4. Watch for Dashboard Messages (if this script is in a dashboard context)
  // Note: sync.js handles the dashboard-to-extension sync.
  // This content script runs on x.com.
  
  console.log('XPoster AI Copilot: Ready.');
})();
