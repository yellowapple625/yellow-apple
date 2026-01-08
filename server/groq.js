/**
 * Groq AI Service - Fast LLM Inference
 * Uses Llama 3.3 70B for best quality
 */

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

class GroqService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required');
    }
    this.apiKey = apiKey;
    this.model = 'llama-3.3-70b-versatile'; // Best free model
    this.chatHistories = new Map();
  }

  /**
   * Generate completion
   */
  async generate(prompt, maxTokens = 1024) {
    try {
      const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('Groq generate error:', error.message);
      throw error;
    }
  }

  /**
   * Chat with conversation history
   */
  async chat(sessionId, message, systemPrompt = '') {
    try {
      // Get or create chat history
      if (!this.chatHistories.has(sessionId)) {
        this.chatHistories.set(sessionId, []);
      }
      const history = this.chatHistories.get(sessionId);

      // Build messages array
      const messages = [];
      
      // Add system prompt
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      // Add history (last 10 messages to save tokens)
      const recentHistory = history.slice(-10);
      messages.push(...recentHistory);

      // Add current message
      messages.push({ role: 'user', content: message });

      const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: 1024,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '';

      // Save to history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: reply });

      // Keep history manageable
      if (history.length > 20) {
        history.splice(0, 2);
      }

      return reply;
    } catch (error) {
      console.error('Groq chat error:', error.message);
      throw error;
    }
  }

  /**
   * Clear chat session
   */
  clearSession(sessionId) {
    this.chatHistories.delete(sessionId);
  }

  /**
   * Analyze food and get nutrition info
   */
  async analyzeFood(foodName) {
    const prompt = `You are a nutrition expert. Analyze this food item: "${foodName}"

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "isBranded": true/false,
  "brandName": "brand or null",
  "productType": "beverage/snack/meal/fast food/homemade/dessert",
  "unit": "ml" or "g",
  "standardServing": number,
  "servingDescription": "e.g., 1 bottle (200ml)",
  "ingredients": [
    {"name": "ingredient", "amount": "quantity", "category": "carb/protein/fat/vegetable/other"}
  ]
}`;

    const response = await this.generate(prompt);
    return this.parseJSON(response);
  }

  /**
   * Get detailed nutrition
   */
  async getNutrition(foodName, ingredients, portionSize, unit, isBranded) {
    const ingredientsList = ingredients?.map(i => typeof i === 'object' ? i.name : i).join(', ') || 'standard';
    
    const prompt = `You are a certified nutritionist. Provide accurate nutrition for "${foodName}" (${portionSize}${unit} serving).

${isBranded ? 'This is a branded product.' : `Ingredients: ${ingredientsList}`}

Return ONLY JSON (no markdown):
{
  "calories": number,
  "protein": number,
  "carbohydrates": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "cholesterol": number
}`;

    const response = await this.generate(prompt);
    return this.parseJSON(response);
  }

  /**
   * Analyze custom recipe
   */
  async analyzeRecipe(recipeName, ingredients) {
    const ingredientsList = ingredients.map(ing => 
      `${ing.name}: ${ing.amount} ${ing.unit}`
    ).join('\n');

    const prompt = `Calculate TOTAL nutrition for this recipe:

Recipe: ${recipeName || 'Custom Recipe'}
Ingredients:
${ingredientsList}

Return ONLY JSON:
{
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "totalFiber": number,
  "totalSugar": number,
  "totalSodium": number,
  "ingredients": [{"name": "item", "calories": num, "protein": num, "carbs": num, "fat": num}],
  "healthTip": "one sentence tip"
}`;

    const response = await this.generate(prompt);
    return this.parseJSON(response);
  }

  /**
   * Get healthier alternative
   */
  async getHealthierAlternative(foodName, ingredients) {
    const ingredientsList = ingredients?.map(i => typeof i === 'object' ? i.name : i).join(', ') || 'standard';
    
    const prompt = `Suggest a healthier version of "${foodName}" (ingredients: ${ingredientsList}).

Return ONLY JSON:
{
  "title": "Healthier ${foodName}",
  "changes": [{"original": "item", "replacement": "healthier item", "benefit": "why better"}],
  "cookingTips": ["tip1", "tip2"],
  "healthBenefits": "overall benefits",
  "calorieReduction": "estimated % reduction"
}`;

    const response = await this.generate(prompt);
    return this.parseJSON(response);
  }

  /**
   * Get health recommendation
   */
  async getRecommendation(foodName) {
    const prompt = `Give ONE short, friendly health tip about "${foodName}" (max 2 sentences).`;
    return this.generate(prompt, 150);
  }

  /**
   * Analyze food from image using vision model
   */
  async analyzeImageFood(base64Image, mimeType = 'image/jpeg') {
    // Using llama-3.2-11b-vision-preview (current available vision model)
    const visionModel = 'llama-3.2-11b-vision-preview';
    
    const prompt = `You are a professional nutritionist. Analyze this food image carefully.

Identify ALL food items visible in the image and estimate their portions.

Return ONLY valid JSON (no markdown):
{
  "identified": true,
  "foodItems": ["item1 with estimated portion", "item2 with estimated portion"],
  "mainDish": "primary food item name",
  "description": "brief description of the meal",
  "estimatedCalories": number,
  "estimatedProtein": number,
  "estimatedCarbs": number,
  "estimatedFat": number,
  "confidence": "high/medium/low",
  "healthScore": number from 1-10,
  "suggestions": ["improvement suggestion 1", "suggestion 2"]
}

If you cannot identify the food clearly, set "identified": false and explain in description.`;

    try {
      const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: visionModel,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:${mimeType};base64,${base64Image}` 
                } 
              }
            ]
          }],
          max_tokens: 1024,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Vision API error:', error);
        throw new Error(error.error?.message || `Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return this.parseJSON(content);
    } catch (error) {
      console.error('Vision analysis error:', error.message);
      throw error;
    }
  }

  /**
   * Parse JSON from AI response
   */
  parseJSON(text) {
    try {
      // Remove markdown code blocks
      let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Extract JSON
      const match = clean.match(/[\[{][\s\S]*[\]}]/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return JSON.parse(clean);
    } catch (e) {
      console.error('JSON parse error:', e.message);
      return null;
    }
  }
}

export default GroqService;
