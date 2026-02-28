/**
 * Vercel Serverless Function: Gemini Vision API Proxy
 *
 * This function securely proxies vision analysis requests to Google's Gemini Vision API.
 * The GEMINI_API_KEY is stored only in Vercel environment variables.
 *
 * Endpoint: POST /api/gemini/vision
 *
 * Request Body:
 * {
 *   "model": "gemini-2.0-flash-exp" | "gemini-2.0-pro-exp",
 *   "prompt": "analysis instructions",
 *   "image_data": "base64_encoded_image",
 *   "mime_type": "image/png" | "image/jpeg" | "image/webp",
 *   "temperature": 0.7,
 *   "max_tokens": 2000
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "text": "analysis result",
 *   "usage": {
 *     "prompt_tokens": 100,
 *     "completion_tokens": 200,
 *     "total_tokens": 300
 *   }
 * }
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    // Get API key from environment
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not configured in Vercel');
      return res.status(500).json({
        success: false,
        error: 'API key not configured'
      });
    }

    // Extract parameters from request
    const {
      model = 'gemini-2.0-flash-exp',
      prompt,
      image_data,
      mime_type = 'image/png',
      temperature = 0.7,
      max_tokens = 2000
    } = req.body;

    // Validate required parameters
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: prompt'
      });
    }

    if (!image_data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: image_data (base64 encoded)'
      });
    }

    console.log(`👁️  Vision Request: ${prompt.substring(0, 100)}...`);
    console.log(`   Model: ${model}`);
    console.log(`   Image Type: ${mime_type}`);

    // Gemini API endpoint
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    // Build request body for Gemini Vision API
    const geminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: mime_type,
                data: image_data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: max_tokens,
        topP: 0.95,
        topK: 40
      }
    };

    // Call Gemini Vision API
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequest)
    });

    // Check if request was successful
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`❌ Gemini Vision API Error (${geminiResponse.status}):`, errorText);

      return res.status(geminiResponse.status).json({
        success: false,
        error: `Gemini Vision API error: ${geminiResponse.statusText}`,
        details: errorText
      });
    }

    // Parse response
    const geminiData = await geminiResponse.json();

    // Extract text from response
    const candidates = geminiData.candidates || [];
    if (candidates.length === 0) {
      console.error('❌ No candidates in response');
      return res.status(500).json({
        success: false,
        error: 'No response generated',
        raw_response: geminiData
      });
    }

    const content = candidates[0].content;
    const parts = content.parts || [];
    const text = parts.map(part => part.text).join('');

    // Extract usage metadata
    const usageMetadata = geminiData.usageMetadata || {};
    const usage = {
      prompt_tokens: usageMetadata.promptTokenCount || 0,
      completion_tokens: usageMetadata.candidatesTokenCount || 0,
      total_tokens: usageMetadata.totalTokenCount || 0
    };

    console.log(`✅ Vision analysis complete (${usage.total_tokens} tokens)`);

    // Return success response
    return res.status(200).json({
      success: true,
      text: text,
      usage: usage
    });

  } catch (error) {
    console.error('❌ Vision API Error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
