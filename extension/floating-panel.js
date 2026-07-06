// Logic for the floating glassmorphism panel
const floatingPanel = {
  el: null,
  isVisible: false,
  currentTweet: null,
  config: null,

  async init() {
    if (document.getElementById('xposter-ai-panel')) return;

    this.el = document.createElement('div');
    this.el.id = 'xposter-ai-panel';
    this.renderInitial();
    
    document.body.appendChild(this.el);
    this.makeDraggable();
    
    // Load config from storage
    this.config = {
      settings: await storage.get('xposter_settings'),
      apiKey: await storage.get('xposter_apikey'),
      model: await storage.get('xposter_model')
    };

    // Add delegated click listener for internal actions
    this.el.addEventListener('click', (e) => {
      const target = e.target;
      
      // Copy action
      if (target.dataset.action === 'copy') {
        const text = target.dataset.text;
        const idx = target.dataset.index;
        this.copyReply(idx, text, target);
      }
      
      // Insert action
      if (target.dataset.action === 'insert') {
        const text = target.dataset.text;
        this.insertReply(text);
      }

      // Post Now action
      if (target.dataset.action === 'post-now') {
        const text = target.dataset.text;
        this.postNow(text);
      }
      
      // Draft action
      if (target.dataset.action === 'draft') {
        const text = target.dataset.text;
        this.saveDraft(text);
      }

      // Open Dashboard button (error state)
      if (target.dataset.action === 'open-dashboard') {
        window.open('http://localhost:8080');
      }
    });
  },

  renderInitial() {
    this.el.innerHTML = `
      <div class="xposter-header">
        <div class="xposter-title">🤖 XPoster AI Copilot</div>
        <div class="xposter-close">✕</div>
      </div>
      <div class="xposter-content" id="xposter-panel-body">
        <div class="xposter-empty-state">
          "Click any post to generate an AI reply."
        </div>
      </div>
      <div class="xposter-footer" style="display:none;" id="xposter-panel-footer">
        <button class="xposter-btn xposter-btn-secondary" id="xposter-regenerate">🔄 Regenerate</button>
        <button class="xposter-btn xposter-btn-secondary" style="color: #ff4444;" id="xposter-close-content">❌ Close</button>
      </div>
    `;

    this.el.querySelector('.xposter-close').onclick = () => this.hide();
    this.el.querySelector('#xposter-close-content').onclick = () => this.renderInitial();
    this.el.querySelector('#xposter-regenerate').onclick = () => this.handleTweetSelection(this.currentTweet);
  },

  toggle() {
    this.isVisible = !this.isVisible;
    this.el.classList.toggle('visible', this.isVisible);
  },

  hide() {
    this.isVisible = false;
    this.el.classList.remove('visible');
  },

  async handleTweetSelection(tweetData) {
    if (!this.isVisible) this.toggle();
    this.currentTweet = tweetData;
    
    const body = document.getElementById('xposter-panel-body');
    const footer = document.getElementById('xposter-panel-footer');
    
    body.innerHTML = `
      <div class="xposter-selected-tweet">
        <div class="xposter-author">${tweetData.author}</div>
        <div>${tweetData.text.substring(0, 100)}${tweetData.text.length > 100 ? '...' : ''}</div>
      </div>
      <div class="xposter-loader">
        <div class="xposter-spinner"></div>
        <div style="font-size:12px; opacity:0.7">Analyzing & generating replies...</div>
      </div>
    `;
    footer.style.display = 'none';

    try {
      // Refresh config from storage
      this.config.settings = await storage.get('xposter_settings');
      this.config.apiKey = await storage.get('xposter_apikey');
      this.config.model = await storage.get('xposter_model');

      const replies = await groqService.generateReplies(tweetData, this.config);
      this.renderReplies(replies);
      footer.style.display = 'flex';
    } catch (e) {
      body.innerHTML = `
        <div class="xposter-error" style="padding:20px; text-align:center; color:#ff4444;">
          ⚠️ ${e.message === 'API_KEY_MISSING' ? 'Please set Groq API key in XPoster dashboard' : e.message}
          <button class="xposter-btn xposter-btn-secondary" style="margin-top:12px; width:100%" data-action="open-dashboard">Open Dashboard</button>
        </div>
      `;
    }
  },

  renderReplies(replies) {
    const body = document.getElementById('xposter-panel-body');
    body.innerHTML = `
      <div class="xposter-selected-tweet">
        <div class="xposter-author">${this.currentTweet.author}</div>
        <div style="opacity:0.8">${this.currentTweet.text.substring(0, 60)}...</div>
      </div>
      <div class="xposter-replies">
        ${replies.map((r, i) => `
          <div class="xposter-reply-card">
            <div class="xposter-reply-style">${r.style}</div>
            <div class="xposter-reply-text">${r.text}</div>
            <div class="xposter-reply-actions">
              <button class="xposter-btn xposter-btn-primary" data-action="post-now" data-text="${r.text.replace(/'/g, "&#39;")}">🚀 Post</button>
              <button class="xposter-btn xposter-btn-secondary" data-action="insert" data-text="${r.text.replace(/'/g, "&#39;")}">✍️ Draft</button>
              <button class="xposter-btn xposter-btn-secondary" data-action="copy" data-index="${i}" data-text="${r.text.replace(/'/g, "&#39;")}">📋</button>
              <button class="xposter-btn xposter-btn-secondary" data-action="draft" data-text="${r.text.replace(/'/g, "&#39;")}">💾</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  async copyReply(idx, text, btn) {
    const success = await utils.copyToClipboard(text);
    if (success && btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ Copied';
      setTimeout(() => btn.innerHTML = originalText, 2000);
    }
  },

  async insertReply(text) {
    await replyGenerator.insertReply(text);
  },

  async postNow(text) {
    const success = await replyGenerator.postNow(text);
    if (success) {
      // Small delay then reset panel
      setTimeout(() => this.renderInitial(), 1500);
    }
  },

  async saveDraft(text) {
    // Send to background to forward to dashboard
    const resp = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'SAVE_TO_XPOSTER',
        postText: text,
        replyTo: this.currentTweet.url
      }, resolve);
    });
    
    if (resp?.success) {
      alert('Draft saved to XPoster!');
    } else {
      alert('Error: XPoster dashboard must be open to save drafts.');
    }
  },

  makeDraggable() {
    const header = this.el.querySelector('.xposter-header');
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    header.onmousedown = dragMouseDown.bind(this);

    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag.bind(this);
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      this.el.style.top = (this.el.offsetTop - pos2) + "px";
      this.el.style.left = (this.el.offsetLeft - pos1) + "px";
      this.el.style.right = 'auto'; // Disable right-lock
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
};

// Expose to window for inline onclick handlers
window.floatingPanel = floatingPanel;
