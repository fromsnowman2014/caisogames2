/**
 * Vercel Serverless Function: Gemini Imagen 4 Image Generation Proxy
 *
 * This function securely proxies image generation requests to Google's Imagen 4 API.
 * The GEMINI_API_KEY is stored only in Vercel environment variables.
 *
 * Endpoint: POST /api/gemini/imagen
 *
 * Request Body:
 * {
 *   "prompt": "detailed prompt string",
 *   "negative_prompt": "things to avoid",
 *   "aspect_ratio": "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
 *   "number_of_images": 1-4,
 *   "safety_filter_level": "block_most" | "block_some" | "block_few",
 *   "person_generation": "allow_adult" | "allow_all" | "dont_allow"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "images": [
 *     {
 *       "image_data": "base64_encoded_image",
 *       "mime_type": "image/png"
 *     }
 *   ],
 *   "usage": {
 *     "images_generated": 1
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
      prompt,
      negative_prompt = '',
      aspect_ratio = '1:1',
      number_of_images = 1,
      safety_filter_level = 'block_some',
      person_generation = 'dont_allow'
    } = req.body;

    // Validate required parameters
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: prompt'
      });
    }

    // Validate number_of_images
    if (number_of_images < 1 || number_of_images > 4) {
      return res.status(400).json({
        success: false,
        error: 'number_of_images must be between 1 and 4'
      });
    }

    console.log(`🎨 Imagen 4 Request: ${prompt.substring(0, 100)}...`);
    console.log(`   Aspect Ratio: ${aspect_ratio}`);
    console.log(`   Images: ${number_of_images}`);

    // Imagen 4 API endpoint
    const IMAGEN_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages?key=${GEMINI_API_KEY}`;

    // Build request body for Imagen API
    const imagenRequest = {
      prompt: prompt,
      negativePrompt: negative_prompt,
      numberOfImages: number_of_images,
      aspectRatio: aspect_ratio,
      safetyFilterLevel: safety_filter_level,
      personGeneration: person_generation
    };

    // Call Imagen API
    const imagenResponse = await fetch(IMAGEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(imagenRequest)
    });

    // Check if request was successful
    if (!imagenResponse.ok) {
      const errorText = await imagenResponse.text();
      console.error(`❌ Imagen API Error (${imagenResponse.status}):`, errorText);

      return res.status(imagenResponse.status).json({
        success: false,
        error: `Imagen API error: ${imagenResponse.statusText}`,
        details: errorText
      });
    }

    // Parse response
    const imagenData = await imagenResponse.json();

    // Extract images
    const images = imagenData.images || imagenData.generatedImages || [];

    if (images.length === 0) {
      console.error('❌ No images generated');
      return res.status(500).json({
        success: false,
        error: 'No images were generated',
        raw_response: imagenData
      });
    }

    console.log(`✅ Generated ${images.length} image(s)`);

    // Return success response
    return res.status(200).json({
      success: true,
      images: images.map(img => ({
        image_data: img.imageData || img.image || img.bytesBase64Encoded,
        mime_type: img.mimeType || 'image/png'
      })),
      usage: {
        images_generated: images.length
      }
    });

  } catch (error) {
    console.error('❌ Imagen API Error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
