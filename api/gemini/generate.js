/**
 * Vercel Serverless Function - Gemini Text Generation Proxy
 *
 * This function acts as a secure proxy for Gemini API calls.
 * The GEMINI_API_KEY is stored only in Vercel environment variables.
 *
 * Endpoint: POST /api/gemini/generate
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { model, prompt, system_instruction, temperature, max_tokens } = req.body;

    // Validate required fields
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prompt'
      });
    }

    // Get API key from environment (set in Vercel dashboard)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: API key not found'
      });
    }

    // Default to Gemini 2.0 Flash if no model specified
    const selectedModel = model || 'gemini-2.0-flash-exp';

    // Build Gemini API request
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRequest = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: temperature || 0.7,
        maxOutputTokens: max_tokens || 4000,
      }
    };

    // Add system instruction if provided
    if (system_instruction) {
      geminiRequest.systemInstruction = {
        parts: [{
          text: system_instruction
        }]
      };
    }

    // Call Gemini API
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequest)
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Gemini API error:', errorData);
      return res.status(geminiResponse.status).json({
        success: false,
        error: `Gemini API error: ${geminiResponse.statusText}`,
        details: errorData
      });
    }

    const data = await geminiResponse.json();

    // Extract generated text
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('Unexpected Gemini API response format:', data);
      return res.status(500).json({
        success: false,
        error: 'Unexpected API response format'
      });
    }

    // Count tokens (approximate)
    const tokensUsed = data.usageMetadata?.totalTokenCount || 0;

    // Return success response
    return res.status(200).json({
      success: true,
      text: generatedText,
      tokens_used: tokensUsed,
      model: selectedModel,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in generate handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
