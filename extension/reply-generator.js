// Logic to handle reply insertion into X's DOM
const replyGenerator = {
  async insertReply(text) {
    // 1. Check if composer is already open
    let editor = document.querySelector('.public-DraftEditor-content');
    
    if (!editor) {
      // 1b. Click the reply button
      let replyButton = document.querySelector('[data-testid="reply"]');
      const highlighted = document.querySelector('.xposter-highlight');
      if (highlighted) {
        replyButton = highlighted.querySelector('[data-testid="reply"]');
      }
      
      if (replyButton) {
        replyButton.click();
        // Wait longer for composer to mount
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 100));
          editor = document.querySelector('.public-DraftEditor-content');
          if (editor) break;
        }
      }
    }

    // 2. Find the draft editor and insert
    if (editor) {
      editor.focus();
      
      // Try to clear existing text if any (optional)
      // document.execCommand('selectAll', false, null);
      // document.execCommand('delete', false, null);

      const inserted = document.execCommand('insertText', false, text);
      
      if (!inserted) {
        // Fallback for some browsers/situations
        editor.innerText = text;
      }
      
      // Trigger input event to let React/Draft.js know
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.warn('XPoster: Could not find reply composer');
      alert('Please click the reply button on the post first, then try Insert again.');
    }
    return editor;
  },

  async postNow(text) {
    // 1. Insert the text
    const editor = await this.insertReply(text);
    
    if (editor) {
      // 2. Wait a heartbeat for X to enable the post button
      await new Promise(r => setTimeout(r, 300));
      
      // 3. Find the post button
      // X uses several possible test IDs depending on the context
      const selectors = [
        '[data-testid="tweetButtonInline"]',
        '[data-testid="tweetButton"]',
        '[data-testid="tweetButtonSmall"]'
      ];
      
      let postBtn = null;
      for (const selector of selectors) {
        postBtn = document.querySelector(selector);
        if (postBtn) break;
      }

      if (postBtn) {
        postBtn.click();
        return true;
      } else {
        alert('Reply inserted, but could not find the "Post" button. Please click it manually.');
        return false;
      }
    }
    return false;
  }
};
