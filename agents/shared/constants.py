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

# Default Models (Updated 2026-03-01)
GEMINI_PRO_MODEL = "gemini-2.5-pro"  # Best model for complex reasoning
GEMINI_FLASH_MODEL = "gemini-2.5-flash"  # Fast model for general tasks
IMAGEN_4_MODEL = "imagen-4.0-generate-001"  # For image generation

# Generation Defaults
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 8000

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
