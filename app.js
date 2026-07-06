// ── State ──────────────────────────────────────────────────────────────────
const STATE = {
  apiKey: '',
  mode: 'notify',           // 'notify' | 'auto'
  selectedTimes: new Set([6, 8, 10, 12, 14, 17, 20]),
  postDate: new Date().toISOString().split('T')[0],
  posts: [],
  alarms: [],
  statsGenerated: 0,
  statsScheduled: 0,
  activeTopics: new Set([]),
  customRules: '',
  customCommand: '',
  model: 'llama-3.3-70b-versatile',
  notifPermission: Notification?.permission || 'default',
  isGenerating: false,  // Prevent concurrent API calls
  lastNotificationTime: '',
  postTypeMix: { hook: 40, thread: 15, poll: 15, listicle: 15, quote: 15 },
  filterType: 'all',
  
  // Trending Features
  trendData: null,          // { trends: [], summary: '', fetchedAt: '' }
  isFetchingTrends: false,
  trendSettings: {
    enabled: true,
    refreshInterval: 30,    // minutes
    threshold: 3,
    excluded: 'crypto, NFT, blockchain, politics, religion'
  },

  // Image Generation Settings
  imageSettings: {
    enabled: false,
    provider: 'dalle3',     // 'dalle3' | 'stability'
    openaiKey: '',
    stabilityKey: '',
    quality: 'standard',    // 'standard' | 'hd'
    style: 'digital-art',   // for stability
    autoGenerate: false,
    showPrompt: true
  },
  
  // Labs & Sections
  labsSectionState: {
    trends: true,
    ab: false,
    images: false,
    history: false,
    times: false
  },
  labsLastVisited: null,

  // Extension Settings
  extensionSettings: {
    enabled: true,
    defaultStyle: 'Viral',   // 'Professional' | 'Casual' | 'Viral'
    temperature: 0.7,
    maxTokens: 500,
    syncAt: null
  }
};

let TIMES = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','17:00','19:00',
  '20:00','22:00'
];
let TIME_LABELS = [
  '6 AM','7 AM','8 AM','9 AM','10 AM','11 AM',
  '12 PM','1 PM','2 PM','3 PM','5 PM','7 PM',
  '8 PM','10 PM'
];

const TOPICS = [];

const DEFAULT_RULES = `You are a viral Tech Twitter personality. Your audience: developers, CS students, ML engineers.

CONTENT TYPES:
1. HOOK: Standalone punchy tweet (max 280 chars).
2. THREAD: Numbered (1/n) multipart series (1/5, 2/5...). Return as "parts" array.
3. POLL: Question + 2-4 options (max 25 chars). Return as "question" and "options" array.
4. LISTICLE: Numbered list style tweet (use line breaks).
5. QUOTE: Bold hot take ending with a question.

STYLE:
- Topics: DSA, LeetCode, System Design, AI/ML, Python, Java, Backend.
- SARCASM style: dry developer humor.
- No hashtags. Sound human.

JSON FORMAT:
Return an array of objects. Each: "type" (hook, thread, poll, listicle, quote), "post" (text), "parts" (array for threads), "options" (array for polls).`;

// ── Save/Load ──────────────────────────────────────────────────────────────
function save() {
  localStorage.setItem('xposter', JSON.stringify({
    apiKey: STATE.apiKey,
    mode: STATE.mode,
    selectedTimes: [...STATE.selectedTimes],
    postDate: STATE.postDate,
    statsGenerated: STATE.statsGenerated,
    statsScheduled: STATE.statsScheduled,
    activeTopics: [...STATE.activeTopics],
    customRules: STATE.customRules,
    customCommand: STATE.customCommand,
    postTypeMix: STATE.postTypeMix,
    filterType: STATE.filterType,
    alarms: STATE.alarms,
    lastNotificationTime: STATE.lastNotificationTime,
    TIMES: TIMES,
    TIME_LABELS: TIME_LABELS,
    model: STATE.model,
    extensionSettings: STATE.extensionSettings
  }));
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem('xposter') || '{}');
    if (d.apiKey) STATE.apiKey = d.apiKey;
    if (d.mode) STATE.mode = d.mode;
    if (d.selectedTimes) STATE.selectedTimes = new Set(d.selectedTimes);
    if (d.postDate) STATE.postDate = d.postDate;
    if (d.statsGenerated) STATE.statsGenerated = d.statsGenerated;
    if (d.statsScheduled) STATE.statsScheduled = d.statsScheduled;
    if (d.activeTopics) STATE.activeTopics = new Set(d.activeTopics);
    if (d.customRules !== undefined) STATE.customRules = d.customRules;
    if (d.customCommand !== undefined) STATE.customCommand = d.customCommand;
    if (d.postTypeMix) STATE.postTypeMix = d.postTypeMix;
    if (d.filterType) STATE.filterType = d.filterType;
    if (d.trendSettings) STATE.trendSettings = { ...STATE.trendSettings, ...d.trendSettings };
    if (d.trendData) STATE.trendData = d.trendData;
    if (d.imageSettings) STATE.imageSettings = { ...STATE.imageSettings, ...d.imageSettings };
    if (d.labsSectionState) STATE.labsSectionState = { ...STATE.labsSectionState, ...d.labsSectionState };
    if (d.labsLastVisited) STATE.labsLastVisited = d.labsLastVisited;
    if (d.alarms) STATE.alarms = d.alarms;
    if (d.lastNotificationTime !== undefined) STATE.lastNotificationTime = d.lastNotificationTime;
    if (d.TIMES) TIMES = d.TIMES;
    if (d.TIME_LABELS) TIME_LABELS = d.TIME_LABELS;
    if (d.model) STATE.model = d.model;
    // Safety Migration: decommissioned model check
    if (STATE.model === 'mixtral-8x7b-32768') {
      STATE.model = 'llama-3.3-70b-versatile';
    }
    if (d.extensionSettings) STATE.extensionSettings = { ...STATE.extensionSettings, ...d.extensionSettings };


    const savedGroqKey =
  localStorage.getItem('groq_key');

  if (savedGroqKey) {
    STATE.apiKey = savedGroqKey;
}
  } catch(e) {}
}

// ── Initialize API Key ─────────────────────────────────────────────────────
function initializeAPIKey() {
  const savedKey = localStorage.getItem('groq_key');
  if (savedKey) {
    STATE.apiKey = savedKey;
  }
}

function updateAPIKeyDisplay() {
  const container = document.getElementById('api-key-container');
  if (!container) return;

  if (STATE.apiKey) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
        <div style="flex-grow: 1;">
          <label style="display: block; font-size: 12px; color: var(--gray-600); margin-bottom: 4px;">Saved Groq API Key</label>
          <div style="font-family: monospace; font-size: 13px; color: var(--gray-800); background: var(--gray-100); padding: 10px; border-radius: 6px; border: 1px solid var(--gray-200);">
            ${STATE.apiKey.substring(0, 10)}***${STATE.apiKey.substring(STATE.apiKey.length - 5)}
          </div>
        </div>
      </div>
      <button onclick="removeAPIKey()" style="width: 100%; padding: 10px; background: var(--red); color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        Remove API Key
      </button>
    `;
  } else {
    container.innerHTML = `
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; color: var(--gray-600); margin-bottom: 6px;">Groq API Key</label>
        <input
          type="password"
          id="api-key-input"
          placeholder="gsk_..."
          style="width: 100%; padding: 10px; border: 1px solid var(--gray-200); border-radius: 6px; font-family: monospace; font-size: 12px;"
        />
        <div style="font-size: 11px; color: var(--gray-500); margin-top: 6px">
          Get free key at <a href="https://console.groq.com" target="_blank">console.groq.com</a>
        </div>
      </div>
      <button onclick="saveAPIKey()" style="width: 100%; padding: 10px; background: #000; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        Save API Key
      </button>
    `;
  }
}

function saveAPIKey() {
  const input = document.getElementById('api-key-input');
  if (!input) return;
  const key = (input.value || '').trim();
  
  if (!key) {
    toast('⚠️ Please enter an API key');
    return;
  }
  
  if (!key.startsWith('gsk_')) {
    toast('⚠️ API key should start with gsk_');
    return;
  }
  
  STATE.apiKey = key;
  localStorage.setItem('groq_key', STATE.apiKey);
  save();
  updateAPIKeyDisplay();
  toast('✅ API key saved successfully');
}

function removeAPIKey() {
  if (confirm('Are you sure you want to remove your API key?')) {
    STATE.apiKey = '';
    localStorage.removeItem('groq_key');
    save();
    updateAPIKeyDisplay();
    toast('🗑️ API key removed');
  }
}

// ── Labs Tab Logic ────────────────────────────────────────────────────────
function initLabsTab() {
  STATE.labsLastVisited = new Date().toISOString();
  document.getElementById('labs-badge').style.display = 'none';
  save();

  // Restore section states
  Object.keys(STATE.labsSectionState).forEach(id => {
    const content = document.getElementById(`lsc-${id}`);
    const arrow = document.getElementById(`lsa-${id}`);
    if (content && arrow) {
      const isOpen = STATE.labsSectionState[id];
      content.style.display = isOpen ? 'block' : 'none';
      arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
  });

  updateTrendingStripUI();
  renderAnalytics();
}

function toggleLabsSection(id) {
  const content = document.getElementById(`lsc-${id}`);
  const arrow = document.getElementById(`lsa-${id}`);
  if (!content || !arrow) return;

  const isClosed = content.style.display === 'none';
  content.style.display = isClosed ? 'block' : 'none';
  arrow.style.transform = isClosed ? 'rotate(0deg)' : 'rotate(-90deg)';
  
  STATE.labsSectionState[id] = isClosed;
  save();
}

function renderAnalytics() {
  // Mock data for history
  document.getElementById('m-posted').textContent = STATE.statsScheduled || '42';
  document.getElementById('m-likes').textContent = (STATE.statsScheduled * 45) || '1,847';
  document.getElementById('m-eng').textContent = '3.2%';
}

// ── Trends Engine (Updated for Labs) ──────────────────────────────────────
async function fetchTrendingTopics(force = false) {
  if (STATE.isFetchingTrends) return;
  if (!STATE.apiKey) return;
  
  const now = Date.now();
  const cacheTtl = STATE.trendSettings.refreshInterval * 60 * 1000;
  
  if (!force && STATE.trendData && (now - new Date(STATE.trendData.fetchedAt).getTime()) < cacheTtl) {
    return;
  }

  STATE.isFetchingTrends = true;
  const btn = document.getElementById('refresh-trends-btn');
  if (btn) btn.classList.add('spinning');
  updateTrendingStripUI();

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.apiKey}`
      },
      body: JSON.stringify({
        model: STATE.model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a tech trend analyst. Return ONLY valid JSON.' },
          { role: 'user', content: `What are the top 15 trending topics in tech right now? Return this JSON: { "trends": [{"topic": "name", "momentum": "rising|peaked|evergreen", "tweetAngle": "one sentence", "hashtags": ["#tag1"]}], "fetchedAt": "${new Date().toISOString()}", "summary": "one sentence summary" }` }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) throw new Error('Trend fetch failed');
    const data = await resp.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    STATE.trendData = result;
    save();
  } catch (err) {
    console.error('Trends error:', err);
  } finally {
    STATE.isFetchingTrends = false;
    const btn = document.getElementById('refresh-trends-btn');
    if (btn) btn.classList.remove('spinning');
    updateTrendingStripUI();
  }
}

function scoreTrends(trends, userTopics) {
  const topicMap = {
    'DSA': ['algorithms', 'data structures', 'leetcode'],
    'System Design': ['distributed systems', 'microservices', 'scalability'],
    'AI/ML': ['llm', 'machine learning', 'openai', 'anthropic'],
    'Python': ['python', 'fastapi', 'uv'],
    'Java': ['java', 'spring boot'],
    'LeetCode': ['leetcode', 'coding interview'],
    'DevOps': ['docker', 'kubernetes', 'aws'],
    'Open Source': ['github', 'open source']
  };

  const excluded = (STATE.trendSettings.excluded || '').split(',').map(e => e.toLowerCase().trim());

  return (trends || [])
    .filter(t => !excluded.some(ex => t.topic.toLowerCase().includes(ex)))
    .map(trend => {
      const topicLower = trend.topic.toLowerCase();
      let score = 0;
      userTopics.forEach(ut => {
        const keywords = topicMap[ut] || [ut.toLowerCase()];
        keywords.forEach(kw => { if (topicLower.includes(kw)) score += 3; });
        if (topicLower.includes(ut.toLowerCase())) score += 5;
      });
      if (trend.momentum === 'rising') score += 2;
      return { ...trend, relevanceScore: score };
    })
    .filter(t => t.relevanceScore >= (STATE.trendSettings.threshold || 0))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}

function updateTrendingStripUI() {
  const homePills = document.getElementById('trending-pills');
  const homeSummary = document.getElementById('trending-summary');
  
  const labsRising = document.getElementById('trending-pills-rising');
  const labsEvergreen = document.getElementById('trending-pills-evergreen');
  const labsSummary = document.getElementById('trending-summary-labs');
  const labsStatus = document.getElementById('trends-status');
  
  // If we have trend data, update whatever is available
  if (STATE.trendData && STATE.trendData.trends) {
    const rising = STATE.trendData.trends.filter(t => t.momentum === 'rising');
    const evergreen = STATE.trendData.trends.filter(t => t.momentum !== 'rising');

    const pillHtml = (list) => list.map(t => {
      const icon = t.momentum === 'rising' ? '🔥' : (t.momentum === 'peaked' ? '📉' : '🎯');
      const colorClass = t.momentum === 'rising' ? 'm-rising' : 'm-normal';
      return `
        <div class="t-pill ${colorClass}" onclick="addTempTopic('${t.topic.replace(/'/g, "\\'")}')" title="${t.tweetAngle}">
          <span class="p-icon">${icon}</span>
          <span class="p-text">${t.topic}</span>
        </div>
      `;
    }).join('');

    if (homePills) homePills.innerHTML = pillHtml(STATE.trendData.trends);
    if (homeSummary) homeSummary.textContent = STATE.trendData.summary || '';
    
    if (labsRising) labsRising.innerHTML = pillHtml(rising);
    if (labsEvergreen) labsEvergreen.innerHTML = pillHtml(evergreen);
    if (labsSummary) labsSummary.textContent = STATE.trendData.summary || '';
    
    if (labsStatus) {
      const mins = Math.round((Date.now() - new Date(STATE.trendData.fetchedAt).getTime()) / 60000);
      labsStatus.textContent = `Refreshed ${mins}m ago`;
    }

    // Relevance Matches (Labs only)
    const relevanceList = document.getElementById('relevance-list');
    if (relevanceList) {
      const top = scoreTrends(STATE.trendData.trends, [...STATE.activeTopics]);
      relevanceList.innerHTML = top.map(t => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:12px;">
          <div style="flex-grow:1;">
            <div style="font-weight:600;">${t.topic}</div>
            <div style="height:6px; background:var(--gray-200); border-radius:3px; margin-top:4px; width:100px; overflow:hidden;">
              <div style="width:${t.relevanceScore * 10}%; height:100%; background:var(--accent);"></div>
            </div>
          </div>
          <div style="font-weight:700; color:var(--gray-500); margin-right:12px;">${t.relevanceScore * 10}%</div>
          <button class="small-pill" onclick="addTempTopic('${t.topic}')">+ Inject</button>
        </div>
      `).join('');
    }
  } else {
    // Show empty state
    const msg = STATE.apiKey ? 'Click Refresh to discover trends' : '⚠️ Add API Key in Settings';
    if (homePills) homePills.innerHTML = `<div style="font-size:12px; color:var(--gray-400)">${msg}</div>`;
    if (labsRising) labsRising.innerHTML = `<div style="font-size:12px; color:var(--gray-400)">${msg}</div>`;
  }
}

function addTempTopic(topic) {
  STATE.activeTopics.add(topic);
  buildTopicTags();
  renderPosts(); // Refresh badges if posts exist
  toast(`📍 Added ${topic}`);
}

function addCustomTopic() {
  const input = document.getElementById('custom-topic-input');
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    STATE.activeTopics.add(val);
    input.value = '';
    buildTopicTags();
    save();
    toast(`✅ Added "${val}"`);
  }
}

function deleteTopic(topic) {
  STATE.activeTopics.delete(topic);
  buildTopicTags();
  save();
  toast(`🗑️ Removed "${topic}"`);
}

// ── Tabs / nav ────────────────────────────────────────────────────────────
async function generateImagePrompt(postContent, postType, topic) {
  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.apiKey}`
      },
      body: JSON.stringify({
        model: STATE.model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an expert at writing prompts for AI image generation. Return ONLY the prompt.' },
          { role: 'user', content: `Write a DALL-E image prompt for a tweet about: "${postContent}". Topic: ${topic}, Type: ${postType}. Style: clean minimal tech illustration, dark mode theme. No text in image.` }
        ],
        temperature: 0.7
      })
    });
    const data = await resp.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error('Prompt gen error:', err);
    return `Minimal tech illustration for ${topic} post, professional, 4k`;
  }
}

async function requestImage(postIdx) {
  const p = STATE.posts[postIdx];
  const settings = STATE.imageSettings;
  const key = settings.provider === 'dalle3' ? settings.openaiKey : settings.stabilityKey;

  if (!key) { toast(`⚠️ Add ${settings.provider.toUpperCase()} key in Settings`); return; }

  p.imageState = 'generating';
  renderPosts();

  try {
    const prompt = await generateImagePrompt(p.post, p.type, p.topic);
    p.imagePrompt = prompt;

    let result;
    if (settings.provider === 'dalle3') {
      result = await generateWithDallE(prompt, settings.openaiKey, settings.quality);
    } else {
      result = await generateWithStability(prompt, settings.stabilityKey, settings.style);
    }

    p.imageBase64 = result;
    p.imageState = 'ready';
    toast('🎨 Image generated!');
  } catch (err) {
    console.error('Image Error:', err);
    p.imageState = 'error';
    p.imageError = err.message;
    toast('❌ Generation failed');
  } finally {
    renderPosts();
    save();
  }
}

async function generateWithDallE(prompt, key, quality) {
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality })
  });
  if (!resp.ok) { const e = await resp.json(); throw new Error(e.error?.message || 'DALL-E failed'); }
  const data = await resp.json();
  const imageUrl = data.data[0].url;
  
  // Proxy or direct fetch (OpenAI works in browser if CORS is allowed, but usually not)
  // For local/demo purposes, we use the URL directly, but we attempt to fetch to base64
  const imgResp = await fetch(imageUrl);
  const blob = await imgResp.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function generateWithStability(prompt, key, style) {
  const resp = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
    body: JSON.stringify({
      text_prompts: [{ text: prompt, weight: 1 }, { text: 'text, blurry, faces', weight: -1 }],
      height: 1024, width: 1024, samples: 1, style_preset: style
    })
  });
  if (!resp.ok) { const e = await resp.json(); throw new Error(e.message || 'Stability failed'); }
  const data = await resp.json();
  return `data:image/png;base64,${data.artifacts[0].base64}`;
}

// ── X Media Upload ────────────────────────────────────────────────────
async function uploadMediaToX(base64Data) {
  // Mocking the upload since X API needs Auth handling
  // In a real OAuth flow as requested, this would call X upload v1.1
  console.log('Finalizing media upload flow...', base64Data.substring(0, 50));
  return 'MOCK_MEDIA_ID'; 
}

// ── Service Worker & Notifications ────────────────────────────────────────
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch(e) { console.warn('SW failed:', e); }
  }
}

async function requestNotifPermission() {
  if (!('Notification' in window)) { toast('Notifications not supported on this browser'); return; }
  const perm = await Notification.requestPermission();
  STATE.notifPermission = perm;
  updateNotificationBanner();
  if (perm === 'granted') {
    toast('🔔 Notifications enabled!');
    startAlarmClock();
  } else {
    toast('Notifications blocked — enable in browser settings');
  }
}

function updateNotificationBanner() {
  const container = document.getElementById('notif-banner-container');
  if (!container) return;

  if (!('Notification' in window)) {
    container.innerHTML = `
      <div class="notif-banner" style="background: #fef2f2; border-color: #fee2e2; margin-top: 12px;">
        <div class="notif-banner-text" style="color: #991b1b;">
          ⚠️ Notifications are not supported by this browser.
        </div>
      </div>
    `;
    return;
  }

  const permission = Notification.permission;
  if (permission === 'granted') {
    container.innerHTML = ''; // Hide if granted
  } else if (permission === 'denied') {
    container.innerHTML = `
      <div class="notif-banner" style="background: #fef2f2; border-color: #fee2e2; margin-top: 12px;">
        <div style="flex-grow: 1;">
          <div class="notif-banner-text" style="color: #991b1b;">
            <strong>⚠️ Notifications Blocked</strong><br>
            Please enable notifications in your browser site settings to receive posting reminders.
          </div>
        </div>
      </div>
    `;
  } else {
    // default
    container.innerHTML = `
      <div class="notif-banner" style="margin-top: 12px;">
        <div style="flex-grow: 1;">
          <div class="notif-banner-text">
            <strong>⏰ Get Reminders to Post</strong><br>
            Enable notifications so we can remind you when it's time to publish on X. Keep this tab open.
          </div>
          <button class="notif-enable-btn" onclick="requestNotifPermission()">Enable Notifications</button>
        </div>
      </div>
    `;
  }
}

// Update permission and banner on window focus (e.g. if user changed browser settings)
window.addEventListener('focus', () => {
  STATE.notifPermission = Notification?.permission || 'default';
  updateNotificationBanner();
});

function startAlarmClock() {
  // Tick every 30 seconds
  setInterval(() => {
    if (STATE.notifPermission !== 'granted') return;
    if (!STATE.alarms || STATE.alarms.length === 0) return;

    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const fireKey = `${dateStr} ${hhmm}`;

    // If already fired for this minute, skip
    if (STATE.lastNotificationTime === fireKey) {
      return;
    }

    const alarm = STATE.alarms.find(a => a.time === hhmm && (!a.date || a.date === dateStr));
    if (!alarm || !alarm.post) return;

    STATE.lastNotificationTime = fireKey;
    save();

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TRIGGER_ALARM',
        alarm: alarm
      });
    } else {
      // Fallback
      showPostingModal(alarm);
    }
  }, 30000);
}

function showPostingModal(alarm) {
  const modal = document.getElementById('confirm-modal');
  const text = document.getElementById('confirm-modal-text');
  const yesBtn = document.getElementById('confirm-modal-yes');

  text.textContent = `Time to post: "${alarm.post.substring(0, 60)}..."`;
  
  yesBtn.onclick = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(alarm.post)}`;
    window.open(url, '_blank');
    closeConfirmModal();
    toast('🚀 Opening X...');
  };

  modal.classList.add('show');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.remove('show');
}

function testNotification() {
  if (STATE.notifPermission !== 'granted') {
    toast('⚠️ Please enable notifications first!');
    return;
  }
  
  const dummyAlarm = {
    time: 'TEST',
    post: 'This is a test notification from X AutoPoster! 🚀'
  };

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'TRIGGER_ALARM',
      alarm: dummyAlarm
    });
    toast('🔔 Test notification sent to Service Worker');
  } else {
    checkAlarmsInPage(dummyAlarm);
    toast('🔔 Test notification triggered (fallback)');
  }
}

function checkAlarmsInPage(alarm) {
  const notif = new Notification('⏰ Time to post on X!', {
    body: alarm.post.substring(0, 100) + '…',
    icon: '/icon-192.png',
    tag: `alarm-${alarm.time}`,
  });
  notif.onclick = () => {
    window.focus();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(alarm.post)}`;
    window.open(url, '_blank');
  };
}

// ── Post Reminder Meter ──────────────────────────────────────────────────
function updatePostMeter() {
  const container = document.getElementById('post-meter-container');
  const timerEl = document.getElementById('meter-timer');
  const fillEl = document.getElementById('meter-fill');

  if (!container || !timerEl || !fillEl) return;

  if (!STATE.alarms || STATE.alarms.length === 0) {
    container.style.display = 'none';
    return;
  }

  const now = new Date();
  const nowTs = now.getTime();
  const dateStr = now.toISOString().split('T')[0];

  // Find next alarm today
  const upcomingAlarms = STATE.alarms
    .map(a => {
      const [h, m] = a.time.split(':');
      const d = new Date(now);
      d.setHours(parseInt(h), parseInt(m), 0, 0);
      return { ...a, timestamp: d.getTime() };
    })
    .filter(a => a.timestamp > nowTs)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (upcomingAlarms.length === 0) {
    container.style.display = 'none';
    return;
  }

  const next = upcomingAlarms[0];
  container.style.display = 'block';

  const diffMs = next.timestamp - nowTs;
  // Find label
  const timeLabel = TIME_LABELS[TIMES.indexOf(next.time)] || next.time;
  const mt = document.querySelector('.meter-title');
  if (mt) mt.textContent = `Next Post at ${timeLabel}`;
  const diffSec = Math.floor(diffMs / 1000);
  
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  
  timerEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

  // Progress relative to 1 hour (or 3 hours max)
  const maxRange = 3 * 3600 * 1000; // 3 hours
  const progress = Math.max(0, Math.min(100, (1 - (diffMs / maxRange)) * 100));
  fillEl.style.width = `${progress}%`;
  
  if (diffMs < 60000) { // Color turns red when under 1 min
    fillEl.style.background = 'var(--red)';
  } else {
    fillEl.style.background = 'linear-gradient(90deg, var(--accent), #a5f3fc)';
  }
}

// ── Groq API ──────────────────────────────────────────────────────────────
// ── Groq API ──────────────────────────────────────────────────────────────
async function callGoogleAI(prompt) {
  const key = STATE.apiKey;

  if (!key) {
    throw new Error('NO_KEY');
  }

  const rules = STATE.customRules || DEFAULT_RULES;
  const topics = [...STATE.activeTopics].join(', ');
  const times = getSelectedTimes();

  const fullPrompt = `${rules}

ACTIVE TOPICS FOR TODAY:
${topics}

Generate exactly ${times.length} tweets.

${prompt}

IMPORTANT:
Return ONLY valid JSON.

Example:

[
  {
    "post":"tweet text",
    "type":"hook",
    "time":"06:00",
    "topic":"DSA"
  }
]
`;

  const resp = await fetch(
    `https://api.groq.com/openai/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: STATE.model || 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.9,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    }
  );

  if (!resp.ok) {
    const errorText = await resp.text();

    console.error(
      'Groq API Error:',
      errorText
    );

    throw new Error(
      `Groq Error ${resp.status}: ${errorText}`
    );
  }

  const data = await resp.json();

  console.log(
    'Groq Response:',
    data
  );

  const raw =
    data?.choices?.[0]?.message?.content;

  if (!raw) {
    throw new Error(
      'Groq returned empty content'
    );
  }

  try {
    const parsed = JSON.parse(raw);
    // Ensure it's an array
    if (!Array.isArray(parsed)) {
      // Maybe it's wrapped in an object with a "data" or "posts" key
      if (parsed.data && Array.isArray(parsed.data)) {
        return parsed.data;
      }
      if (parsed.posts && Array.isArray(parsed.posts)) {
        return parsed.posts;
      }
      // Otherwise wrap it in an array
      return [parsed];
    }
    return parsed;
  } catch {
    const clean =
      raw
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) {
      if (parsed.data && Array.isArray(parsed.data)) {
        return parsed.data;
      }
      if (parsed.posts && Array.isArray(parsed.posts)) {
        return parsed.posts;
      }
      return [parsed];
    }
    return parsed;
  }
}
// ── Generate posts ─────────────────────────────────────────────────────────
async function generatePosts() {
  if (STATE.isGenerating) { toast('⏳ Already generating... please wait'); return; }
  if (!STATE.apiKey) {
    toast('⚠️ Please configure your API key in Settings first');
    switchTab('settings');
    return;
  }
  const times = getSelectedTimes();
  if (times.length === 0) { toast('Select at least one time slot'); return; }

  STATE.isGenerating = true;
  const btn = document.getElementById('gen-btn');
  const btnText = document.getElementById('gen-btn-text');
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Generating with Groq…';

  // Show skeletons
  const list = document.getElementById('posts-list');
  list.innerHTML = times.map(() => `
    <div class="skel">
      <div class="skel-line" style="width:35%"></div>
      <div class="skel-line" style="width:90%"></div>
      <div class="skel-line" style="width:70%"></div>
      <div class="skel-line" style="width:45%"></div>
    </div>
  `).join('');

  document.getElementById('posts-section').style.display = 'block';

  try {
    const topics = [...STATE.activeTopics].join(', ');
    let prompt = STATE.customCommand || 
      `Generate {{count}} viral tech tweets for today. Topics: {{topics}}. Times: {{times}}.`;
    
    let trendContext = '';
    let topTrends = [];
    if (STATE.trendSettings.enabled && STATE.trendData) {
      topTrends = scoreTrends(STATE.trendData.trends, [...STATE.activeTopics]);
      if (topTrends.length > 0) {
        trendContext = "\n\n🔥 TRENDING TOPICS (inject naturally):\n" + 
          topTrends.map((t, idx) => `${idx + 1}. [${t.momentum.toUpperCase()}] ${t.topic} — Angle: ${t.tweetAngle} — Tags: ${t.hashtags.join(' ')}`).join('\n') +
          "\n\nRules: Use trend's angle, include 1-2 hashtags, mark post with 'trendTag' in JSON.";
      }
    }

    const mix = Object.entries(STATE.postTypeMix)
      .map(([type, pct]) => `${type.toUpperCase()}: ${pct}%`)
      .join(', ');

    // Replace template variables
    prompt = prompt.replace('{{count}}', times.length)
                   .replace('{{topics}}', topics)
                   .replace('{{times}}', times.join(', '))
                   + trendContext
                   + `\n\nREQUIRED MIX: ${mix}.\nReturn each post with a "type" field.`;
    
    const rawPosts = await callGoogleAI(prompt);

    // Normalize posts
    STATE.posts = rawPosts.map((p, i) => ({
      post: p.post || p.text || p.content || p.tweet || p.message || '...',
      type: p.type || 'hook',
      trendTag: p.trendTag || null,
      parts: p.parts || null,
      question: p.question || null,
      options: p.options || null,
      time: (p.time && TIMES.includes(p.time)) ? p.time : times[i % times.length],
      topic: p.topic || 'General',
      date: STATE.postDate
    }));

    // Set alarms
    STATE.alarms = STATE.posts.map(p => ({ date: p.date, time: p.time, post: p.post }));
    save();

    STATE.statsGenerated += STATE.posts.length;
    if (STATE.mode === 'auto') STATE.statsScheduled += STATE.posts.length;

    renderPosts();
    renderStats();
    save();

    if (STATE.mode === 'auto') {
      toast(`✅ ${STATE.posts.length} posts scheduled!`);
    } else {
      toast(`✅ ${STATE.posts.length} posts ready to review`);
    }
  } catch(e) {
    const errMsg = e.message;
    if (errMsg.includes('429') || errMsg.includes('Too Many')) {
      list.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><div>Rate limit hit. Wait a few seconds and try again</div></div>`;
    } else if (errMsg === 'NO_KEY') {
      list.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div>Add your Groq API key in Settings</div></div>`;
    } else {
      list.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div>${errMsg || 'Generation failed — check API key & try again'}</div></div>`;
    }
  } finally {
    STATE.isGenerating = false;
  }

  if (btn) btn.disabled = false;
  if (btnText) btnText.textContent = 'Regenerate posts';
}

// ── Render posts ───────────────────────────────────────────────────────────
function renderPosts() {
  const list = document.getElementById('posts-list');
  
  let visiblePosts = STATE.posts;
  if (STATE.filterType !== 'all') {
    visiblePosts = STATE.posts.filter(p => p.type === STATE.filterType);
  }

  if (!visiblePosts.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📝</div><div>No ${STATE.filterType === 'all' ? '' : STATE.filterType} posts found</div></div>`;
    return;
  }

  // Filter Row
  const filterRow = `
    <div class="filter-row">
      <span class="f-pill ${STATE.filterType === 'all' ? 'active' : ''}" onclick="setFilter('all')">All</span>
      <span class="f-pill ${STATE.filterType === 'hook' ? 'active' : ''}" onclick="setFilter('hook')">Hook</span>
      <span class="f-pill ${STATE.filterType === 'thread' ? 'active' : ''}" onclick="setFilter('thread')">Thread</span>
      <span class="f-pill ${STATE.filterType === 'poll' ? 'active' : ''}" onclick="setFilter('poll')">Poll</span>
      <span class="f-pill ${STATE.filterType === 'listicle' ? 'active' : ''}" onclick="setFilter('listicle')">List</span>
      <span class="f-pill ${STATE.filterType === 'quote' ? 'active' : ''}" onclick="setFilter('quote')">Quote</span>
    </div>
  `;

  list.innerHTML = filterRow + visiblePosts.map((p, i) => {
    const realIdx = STATE.posts.indexOf(p);
    const timeLabel = TIME_LABELS[TIMES.indexOf(p.time)] || p.time;
    const charLen = (p.post || '').length;
    
    let contentHtml = `<div class="post-text" id="pt-${realIdx}">${esc(p.post)}</div>`;
    
    if (p.type === 'thread' && p.parts) {
      contentHtml += `
        <div class="thread-parts">
          ${p.parts.slice(1).map(part => `<div class="thread-part">${esc(part)}</div>`).join('')}
        </div>`;
    } else if (p.type === 'poll') {
      const q = p.question || p.post;
      contentHtml = `<div class="post-text">${esc(q)}</div>`;
      if (p.options) {
        contentHtml += `
          <div class="poll-box">
            ${p.options.map(opt => `<div class="poll-option">${esc(opt)}</div>`).join('')}
          </div>`;
      }
    }

    const typeClass = `type-${p.type || 'hook'}`;

    return `
      <div class="post-card ${typeClass}" id="pc-${realIdx}">
        <div class="post-top">
          <div class="post-meta">
            <span class="post-idx">#${i + 1}</span>
            <span class="time-pill">🕐 ${timeLabel}</span>
            <span class="type-pill ${typeClass}">${p.type || 'hook'}</span>
          </div>
        </div>
        ${p.trending ? `<div class="trending-row"><span class="trend-badge">🔥 Trending take</span></div>` : ''}
        ${p.trendTag ? `<div class="trend-tag-badge"><span>🔥</span> ${p.trendTag}</div>` : ''}
        
        <!-- Image Zone -->
        ${STATE.imageSettings.enabled ? `
          <div class="image-zone ${p.imageState === 'ready' ? 'ready' : ''}">
            ${renderImageZone(p, realIdx)}
          </div>
        ` : ''}

        ${contentHtml}
        <div class="post-footer">
          <span class="char-ct ${charLen > 280 ? 'over' : ''}" id="cc-${realIdx}">${charLen}/280</span>
          <div class="post-btns">
            <button class="pbtn" onclick="editPost(${realIdx})" id="eb-${realIdx}">✏️ Edit</button>
            <button class="pbtn pbtn-post" onclick="postNow(${realIdx})" id="pb-${realIdx}">📤 Post</button>
            <button class="pbtn pbtn-del" onclick="deletePost(${realIdx})" id="db-${realIdx}">🗑️ Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function editPost(i) {
  const el = document.getElementById(`pt-${i}`);
  const eb = document.getElementById(`eb-${i}`);
  if (el.tagName === 'TEXTAREA') {
    STATE.posts[i].post = el.value;
    STATE.alarms[i] = { 
      date: STATE.posts[i].date, 
      time: STATE.posts[i].time, 
      post: el.value 
    };
    save();
    const div = document.createElement('div');
    div.className = 'post-text';
    div.id = `pt-${i}`;
    div.textContent = STATE.posts[i].post;
    el.replaceWith(div);
    eb.textContent = '✏️ Edit';
    updateChar(i, STATE.posts[i].post.length);
  } else {
    const ta = document.createElement('textarea');
    ta.className = 'post-edit-ta';
    ta.id = `pt-${i}`;
    ta.value = STATE.posts[i].post;
    ta.oninput = () => updateChar(i, ta.value.length);
    el.replaceWith(ta);
    ta.focus();
    eb.textContent = '✅ Save';
  }
}

function updateChar(i, len) {
  const el = document.getElementById(`cc-${i}`);
  if (el) { el.textContent = `${len}/280`; el.className = `char-ct ${len > 280 ? 'over' : ''}`; }
}

function deletePost(i) {
  if (confirm('Delete this post?')) {
    STATE.posts.splice(i, 1);
    STATE.alarms.splice(i, 1);
    STATE.statsGenerated = Math.max(0, STATE.statsGenerated - 1);
    save();
    renderPosts();
    renderStats();
    toast('🗑️ Post deleted');
  }
}

function postNow(i) {
  const p = STATE.posts[i];
  
  if (p.type === 'thread' && p.parts) {
    if (!confirm(`This will post ${p.parts.length} tweets in sequence. Continue?`)) return;
    
    p.parts.forEach((text, idx) => {
      setTimeout(() => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      }, idx * 2000);
    });
  } else {
    const text = p.post;
    navigator.clipboard.writeText(text).catch(() => {});
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  const btn = document.getElementById(`pb-${i}`);
  if (btn) { btn.textContent = '✅ Done'; btn.className = 'pbtn pbtn-done'; btn.onclick = null; }
  STATE.statsScheduled++;
  renderStats();
  save();
  toast('Opening X…');
}

let CURRENT_PICKER_VALUE = '18:30';

function toggleTimeList() {
  const p = document.getElementById('time-list-popup');
  const isHidden = p.style.display === 'none' || !p.style.display;
  p.style.display = isHidden ? 'block' : 'none';
}

function selectViralTime(val, label) {
  CURRENT_PICKER_VALUE = val;
  document.getElementById('selected-time-display').textContent = label;
  document.getElementById('time-list-popup').style.display = 'none';
  
  // Mark active
  document.querySelectorAll('.time-option').forEach(opt => opt.classList.remove('active'));
  event.target.classList.add('active');
}

function openNativePicker() {
  const n = document.getElementById('custom-time-picker');
  n.showPicker(); // Modern API
  document.getElementById('time-list-popup').style.display = 'none';
}

function handleNativeTimeChange(val) {
  if (!val) return;
  const [h, m] = val.split(':');
  const hh = parseInt(h);
  const label = (hh % 12 || 12) + ':' + m + (hh >= 12 ? ' PM' : ' AM') + ' (Custom)';
  selectViralTime(val, label);
}

function addCustomTime() {
  const t = CURRENT_PICKER_VALUE;
  if (!t) return;
  
  if (TIMES.includes(t)) {
    toast('⏰ Time slot already exists');
    return;
  }

  const [h, m] = t.split(':');
  const hh = parseInt(h);
  const label = (hh % 12 || 12) + ':' + m + (hh >= 12 ? ' PM' : ' AM');

  TIMES.push(t);
  TIME_LABELS.push(label);
  
  const combined = TIMES.map((v, i) => ({ t: v, l: TIME_LABELS[i] }))
    .sort((a,b) => a.t.localeCompare(b.t));
  
  TIMES = combined.map(c => c.t);
  TIME_LABELS = combined.map(c => c.l);

  const newIdx = TIMES.indexOf(t);
  STATE.selectedTimes.add(newIdx);

  buildTimeGrid();
  renderStats();
  save();
  toast(`✅ Added ${label}`);
}

// Close popup on click outside
document.addEventListener('click', (e) => {
  const container = document.getElementById('time-picker-container');
  const popup = document.getElementById('time-list-popup');
  if (container && !container.contains(e.target)) {
    if (popup) popup.style.display = 'none';
  }
});

// ── Stats ──────────────────────────────────────────────────────────────────
function renderStats() {
  const gen = document.getElementById('stat-gen');
  const sched = document.getElementById('stat-sched');
  const slots = document.getElementById('stat-slots');
  
  if (gen) gen.textContent = STATE.statsGenerated;
  if (sched) sched.textContent = STATE.statsScheduled;
  if (slots) slots.textContent = STATE.selectedTimes.size;
}

// ── Time slots ────────────────────────────────────────────────────────────
function getTimeIcon(label) {
  if (label.includes('AM')) {
    const hour = parseInt(label);
    if (hour >= 5 && hour < 8) return '🌅';
    return '☀️';
  } else {
    const hour = parseInt(label);
    if (hour === 12 || (hour >= 1 && hour < 5)) return '☀️';
    if (hour >= 5 && hour < 8) return '🌇';
    return '🌙';
  }
}

function buildTimeGrid() {
  const g = document.getElementById('time-grid');
  if (!g) return;
  
  const label = document.getElementById('slots-count-label');
  if (label) label.textContent = `Active Slots (${STATE.selectedTimes.size})`;

  g.innerHTML = TIMES.map((t, i) => {
    const label = TIME_LABELS[i];
    const icon = getTimeIcon(label);
    return `
      <div class="tslot ${STATE.selectedTimes.has(i) ? 'on' : ''}" onclick="toggleTime(${i}, this)">
        <span class="t-icon">${icon}</span>
        <span>${label}</span>
      </div>
    `;
  }).join('');
}

function toggleTime(i, el) {
  if (STATE.selectedTimes.has(i)) STATE.selectedTimes.delete(i);
  else STATE.selectedTimes.add(i);
  el.classList.toggle('on');
  renderStats();
  save();
}


function addCustomTime() {
  const sel = document.getElementById('custom-time-select');
  const manual = document.getElementById('custom-time-picker');
  
  let t = sel.value;
  if (t === 'custom') {
    t = manual.value;
    sel.style.display = 'block';
    manual.style.display = 'none';
  }
  if (!t) return;
  
  if (TIMES.includes(t)) {
    toast('⏰ Time slot already exists');
    return;
  }

  // Convert to label (e.g. 14:30 -> 2:30 PM)
  const [h, m] = t.split(':');
  const hh = parseInt(h);
  const label = (hh % 12 || 12) + ':' + m + (hh >= 12 ? ' PM' : ' AM');

  TIMES.push(t);
  TIME_LABELS.push(label);
  
  // Sort them
  const combined = TIMES.map((v, i) => ({ t: v, l: TIME_LABELS[i] }))
    .sort((a,b) => a.t.localeCompare(b.t));
  
  TIMES = combined.map(c => c.t);
  TIME_LABELS = combined.map(c => c.l);

  // Re-select if it was added
  const newIdx = TIMES.indexOf(t);
  STATE.selectedTimes.add(newIdx);

  buildTimeGrid();
  save();
  toast(`✅ Added ${label}`);
}

function toggleManualTime(val) {
  const manual = document.getElementById('custom-time-picker');
  const sel = document.getElementById('custom-time-select');
  if (val === 'custom') {
    manual.style.display = 'block';
    sel.style.display = 'none';
  }
}

function setQuickDate(type) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  document.querySelectorAll('.dpill').forEach(p => p.classList.remove('active'));

  if (type === 'today') {
    STATE.postDate = today.toISOString().split('T')[0];
    document.getElementById('date-today').classList.add('active');
  } else if (type === 'tomorrow') {
    STATE.postDate = tomorrow.toISOString().split('T')[0];
    document.getElementById('date-tomorrow').classList.add('active');
  } else if (type === 'custom') {
    const val = document.getElementById('post-date-picker').value;
    if (val) STATE.postDate = val;
  }
  
  save();
  toast(`🗓️ Post date: ${STATE.postDate}`);
}

function getSelectedTimes() {
  return [...STATE.selectedTimes].sort((a, b) => a - b).map(i => TIMES[i]);
}

// ── Topic tags ────────────────────────────────────────────────────────────
function buildTopicTags() {
  const container = document.getElementById('topic-tags');
  if (!container) return;

  const topics = [...STATE.activeTopics];
  if (topics.length === 0) {
    container.innerHTML = '<div style="font-size:12px; color:var(--gray-400); padding:8px 0;">No topics added yet. Add one below!</div>';
    return;
  }

  container.innerHTML = topics.map(t => `
    <div class="rule-tag active" style="display:flex; align-items:center; gap:6px;">
      ${t}
      <span onclick="deleteTopic('${t.replace(/'/g, "\\'")}')" style="cursor:pointer; opacity:0.6; font-size:14px; padding: 2px 4px; margin-right: -4px;">✕</span>
    </div>
  `).join('');
}

// ── Mode ──────────────────────────────────────────────────────────────────
function setMode(m) {
  STATE.mode = m;
  document.getElementById('mode-notify').classList.toggle('active', m === 'notify');
  document.getElementById('mode-auto').classList.toggle('active', m === 'auto');
  save();
}

function saveCustomSettings() {
  const customCommand = document.getElementById('custom-command-input')?.value || '';
  const customRules = document.getElementById('custom-rules-input')?.value || '';
  
  STATE.customCommand = customCommand.trim();
  STATE.customRules = customRules.trim();
  save();
  
  const statusEl = document.getElementById('settings-status');
  statusEl.textContent = '✅ Saved!';
  statusEl.style.color = '#0cce6b';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 2000);
  toast('✅ Settings saved');
}

function updateTrendSetting(key, val) {
  STATE.trendSettings[key] = val;
  save();
  // Update UI state
  if (key === 'refreshInterval') {
    document.querySelectorAll('.small-pill').forEach(p => p.classList.remove('active'));
    document.getElementById(`ri-${val}`)?.classList.add('active');
  }
}

function updateImageSetting(key, val) {
  STATE.imageSettings[key] = val;
  if (key === 'provider') {
    document.getElementById('openai-key-zone').style.display = (val === 'dalle3') ? 'block' : 'none';
    document.getElementById('stability-key-zone').style.display = (val === 'stability') ? 'block' : 'none';
  }
  save();
}

function updateGlobalModel(val) {
  STATE.model = val;
  save();
  toast(`🤖 Model set to ${val}`);
}

function updateExtensionSetting(key, val) {
  STATE.extensionSettings[key] = val;
  save();
}

function syncExtensionNow() {
  const syncData = {
    type: 'XPOSTER_SYNC',
    settings: STATE.extensionSettings,
    apiKey: STATE.apiKey,
    model: STATE.model,
    timestamp: new Date().toISOString()
  };
  
  // Use postMessage to talk to any content script listening on this page
  window.postMessage(syncData, "*");
  
  STATE.extensionSettings.syncAt = syncData.timestamp;
  save();
  
  const statusEl = document.getElementById('ext-status-info');
  if (statusEl) statusEl.textContent = `Last synced: ${new Date().toLocaleTimeString()}`;
  toast('🔄 Sync signal sent to extension');
}

function handleExtensionMessages() {
  window.addEventListener('message', (event) => {
    // Only accept messages from ourselves (or extension injecting into us)
    if (event.source !== window) return;

    if (event.data.type === 'SAVE_TO_DRAFTS') {
      const { postText, replyTo } = event.data;
      const newPost = {
        post: postText,
        type: 'reply',
        time: 'Now',
        topic: 'AI Reply',
        date: new Date().toISOString().split('T')[0],
        replyTo: replyTo
      };
      
      STATE.posts.unshift(newPost);
      save();
      renderPosts();
      toast('💾 AI Reply saved to drafts!');
      
      // Notify extension of success
      window.postMessage({ type: 'SAVE_SUCCESS', postId: STATE.posts.length }, "*");
    }
    
    if (event.data.type === 'GET_CONFIG') {
       window.postMessage({
         type: 'CONFIG_RESPONSE',
         settings: STATE.extensionSettings,
         apiKey: STATE.apiKey
       }, "*");
    }
  });
}

function renderImageZone(p, i) {
  if (p.imageState === 'generating') {
    return `
      <div class="img-loader">
        <div class="progress-bar-container"><div class="progress-bar-fill"></div></div>
        <div style="font-size:12px; color:var(--gray-500)">Creating masterpiece...</div>
      </div>
    `;
  }
  if (p.imageState === 'ready' && p.imageBase64) {
    return `
      <img src="${p.imageBase64}" class="image-preview" onclick="window.open('${p.imageBase64}', '_blank')">
      <div class="image-meta">
        <div class="image-prompt-view">"${p.imagePrompt}"</div>
        <div style="display:flex; justify-content:space-between; margin-top:8px;">
           <button class="gen-img-btn" onclick="requestImage(${i})">🔄 Regenerate</button>
           <button class="gen-img-btn" style="color:var(--red)" onclick="removeImage(${i})">✕ Remove</button>
        </div>
      </div>
    `;
  }
  return `<button class="gen-img-btn" onclick="requestImage(${i})">🎨 Generate Image</button>`;
}

function removeImage(i) {
  STATE.posts[i].imageBase64 = null;
  STATE.posts[i].imageState = null;
  renderPosts();
  save();
}

function loadCustomSettings() {
  const commandEl = document.getElementById('custom-command-input');
  const rulesEl = document.getElementById('custom-rules-input');
  const trendingToggle = document.getElementById('trend-enabled');
  const trendingEx = document.getElementById('trend-excluded');
  
  // Image handles
  const imgEnabled = document.getElementById('img-enabled');
  const imgProvider = document.getElementById('img-provider');
  const imgOpenAI = document.getElementById('img-openai-key');
  const imgStability = document.getElementById('img-stability-key');
  
  if (commandEl) {
    commandEl.value = STATE.customCommand || '';
    commandEl.placeholder = `Default: Generate {{count}} viral tech tweets...`;
  }
  
  if (rulesEl) {
    rulesEl.value = STATE.customRules || '';
    rulesEl.placeholder = `Default:\n${DEFAULT_RULES}`;
  }

  const globalModel = document.getElementById('global-model');
  if (globalModel) globalModel.value = STATE.model || 'llama-3.3-70b-versatile';

  if (trendingToggle) trendingToggle.checked = STATE.trendSettings.enabled;
  if (trendingEx) trendingEx.value = STATE.trendSettings.excluded;

  // Image loads
  if (imgEnabled) imgEnabled.checked = STATE.imageSettings.enabled;
  if (imgProvider) {
    imgProvider.value = STATE.imageSettings.provider;
    updateImageSetting('provider', imgProvider.value); 
  }
  if (imgOpenAI) imgOpenAI.value = STATE.imageSettings.openaiKey;
  if (imgStability) imgStability.value = STATE.imageSettings.stabilityKey;

  buildTypeMixSettings();
  
  document.querySelectorAll('.small-pill').forEach(p => p.classList.remove('active'));
  document.getElementById(`ri-${STATE.trendSettings.refreshInterval}`)?.classList.add('active');

  // Extension loads
  const extEnabled = document.getElementById('ext-enabled');
  const extStyle = document.getElementById('ext-style');
  const extTemp = document.getElementById('ext-temp');
  const extTokens = document.getElementById('ext-tokens');
  const extStatus = document.getElementById('ext-status-info');

  if (extEnabled) extEnabled.checked = STATE.extensionSettings.enabled;
  if (extStyle) extStyle.value = STATE.extensionSettings.defaultStyle;
  if (extTemp) extTemp.value = STATE.extensionSettings.temperature;
  if (extTokens) extTokens.value = STATE.extensionSettings.maxTokens;
  if (extStatus && STATE.extensionSettings.syncAt) {
    extStatus.textContent = `Last synced: ${new Date(STATE.extensionSettings.syncAt).toLocaleTimeString()}`;
  }
}

function buildTypeMixSettings() {
  const container = document.getElementById('type-mix-container');
  if (!container) return;

  const types = ['hook', 'thread', 'poll', 'listicle', 'quote'];
  const colors = { hook: '#6b7280', thread: '#3b82f6', poll: '#a855f7', listicle: '#f59e0b', quote: '#ef4444' };

  container.innerHTML = types.map(t => `
    <div style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; align-items:center;">
        <span style="font-size:12px; font-weight:600; text-transform:capitalize; color:${colors[t]}">${t}</span>
        <span id="mix-val-${t}" style="font-size:11px; font-family:monospace; background:var(--gray-100); padding:2px 6px; border-radius:4px;">${STATE.postTypeMix[t]}%</span>
      </div>
      <input type="range" min="0" max="100" value="${STATE.postTypeMix[t]}" oninput="updateTypeMix('${t}', this.value)" style="width:100%; cursor:pointer;">
    </div>
  `).join('');
  updateMixTotal();
}

function updateTypeMix(type, val) {
  STATE.postTypeMix[type] = parseInt(val);
  document.getElementById(`mix-val-${type}`).textContent = val + '%';
  updateMixTotal();
  save();
}

function updateMixTotal() {
  const total = Object.values(STATE.postTypeMix).reduce((a, b) => a + b, 0);
  const totalEl = document.getElementById('type-mix-total');
  if (totalEl) {
    totalEl.textContent = `Total: ${total}%`;
    totalEl.style.color = total === 100 ? '#0cce6b' : '#ef4444';
  }
}

function setFilter(type) {
  STATE.filterType = type;
  renderPosts();
}

function resetCustomSettings() {
  if (confirm('Are you sure you want to reset command and rules to defaults?')) {
    STATE.customCommand = '';
    STATE.customRules = '';
    save();
    loadCustomSettings();
    toast('🔄 Command & rules reset to defaults');
  }
}

// ── Tabs / nav ────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${tab}`).classList.add('active');
  document.getElementById(`nav-${tab}`).classList.add('active');
}

// ── Helpers ───────────────────────────────────────────────────────────────
function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Init ──────────────────────────────────────────────────────────────────
function init() {
  load();
  initializeAPIKey();
  registerSW();
  buildTimeGrid();
  buildTopicTags();
  renderStats();
  startAlarmClock();
  handleExtensionMessages();

  // Meter Update Loop
  setInterval(updatePostMeter, 1000);
  updatePostMeter();

  // Date picker & pills init
  const datePicker = document.getElementById('post-date-picker');
  if (datePicker) {
    datePicker.value = STATE.postDate;
    
    // Highlight correct quick pill
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    document.querySelectorAll('.dpill').forEach(p => p.classList.remove('active'));
    if (STATE.postDate === today) {
      document.getElementById('date-today')?.classList.add('active');
    } else if (STATE.postDate === tomorrow) {
      document.getElementById('date-tomorrow')?.classList.add('active');
    }
  }

  updateNotificationBanner();
  updateAPIKeyDisplay();
  loadCustomSettings();

  // Trends init
  fetchTrendingTopics();
  updateTrendingStripUI();

  // Clear last fired if it's a new day
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  if (!STATE.lastNotificationTime.startsWith(dateStr)) {
    STATE.lastNotificationTime = '';
    save();
  }

  // Check for pending post from notification
  const urlParams = new URLSearchParams(window.location.search);
  const pending = urlParams.get('pendingPost');
  if (pending) {
    // Clear the URL param without reload
    window.history.replaceState({}, document.title, "/");
    showPostingModal({ post: pending });
  }

  // Restore posts if any from today
  if (STATE.posts && STATE.posts.length > 0) {
    document.getElementById('posts-section').style.display = 'block';
    renderPosts();
  }

  // Labs Badge Check
  checkLabsNotifications();
}

function checkLabsNotifications() {
  const badge = document.getElementById('labs-badge');
  if (!badge) return;

  // Dummy logic for badge: if it's been more than 4 hours since last visit
  const lastVisit = STATE.labsLastVisited ? new Date(STATE.labsLastVisited).getTime() : 0;
  const fourHours = 4 * 60 * 60 * 1000;
  
  if (Date.now() - lastVisit > fourHours) {
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', init);
