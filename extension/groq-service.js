// Groq AI API Service for Extension
const groqService = {
  async generateReplies(tweetData, config) {
    const { apiKey, settings } = config;
    
    if (!apiKey) {
      throw new Error('API_KEY_MISSING');
    }

    let targetModel = config.model || 'llama-3.3-70b-versatile';
    if (targetModel === 'mixtral-8x7b-32768') {
      targetModel = 'llama-3.3-70b-versatile';
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: PROMPTS.SYSTEM },
          { role: 'user', content: PROMPTS.formatPrompt(tweetData) }
        ],
        temperature: settings?.temperature || 0.7,
        max_tokens: settings?.maxTokens || 500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error?.error?.message || 'Failed to call Groq API');
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    return content.replies;
  }
};
