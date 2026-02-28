"""
Shared constants for CAISOGAMES V2 agents.
"""

import os

# Vercel Proxy URLs (API keys는 Vercel에만 존재)
VERCEL_PROXY_URL = os.environ.get("VERCEL_PROXY_URL", "https://caisogames2.vercel.app")

# Vercel API Endpoints
GEMINI_TEXT_ENDPOINT = f"{VERCEL_PROXY_URL}/api/gemini/generate"
GEMINI_IMAGEN_ENDPOINT = f"{VERCEL_PROXY_URL}/api/gemini/imagen"
GEMINI_VISION_ENDPOINT = f"{VERCEL_PROXY_URL}/api/gemini/vision"

# Default Models
GEMINI_PRO_MODEL = "gemini-2.0-pro-exp"
GEMINI_FLASH_MODEL = "gemini-2.0-flash-exp"
IMAGEN_4_MODEL = "imagen-4.0-generate-001"

# Generation Defaults
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 4000

# Quality Thresholds
DESIGN_QUALITY_THRESHOLD = 90
ASSET_QUALITY_THRESHOLD = 90
CODE_QUALITY_THRESHOLD = 80
QA_PASS_RATE_THRESHOLD = 95

# Quality Thresholds Dictionary (for agent imports)
QUALITY_THRESHOLDS = {
    "design": DESIGN_QUALITY_THRESHOLD,
    "asset": ASSET_QUALITY_THRESHOLD,
    "code": CODE_QUALITY_THRESHOLD,
    "qa": QA_PASS_RATE_THRESHOLD
}

# Cost Tracking
IMAGEN_4_COST_PER_IMAGE = 0.04  # USD
GEMINI_PRO_COST_PER_1M_TOKENS = 1.25  # USD
GEMINI_FLASH_COST_PER_1M_TOKENS = 0.075  # USD
