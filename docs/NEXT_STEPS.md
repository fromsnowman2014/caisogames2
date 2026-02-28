# Next Steps - CaisoGames V2 Implementation

**Updated:** 2026-02-27
**Current Phase:** Phase 2 (Art Team) - Core Complete
**Next Phase:** Phase 2 Completion → Phase 3 (Engineering & QA)

---

## ✅ What's Been Completed

### Phase 1 (Foundation)
- ✅ Project structure and monorepo setup
- ✅ `@caisogames/ai-engine` ECS architecture (7 components, 5 systems)
- ✅ PM Agent with orchestration logic
- ✅ Design Team (3 agents): Concept, Level, Narrative designers
- ✅ Shared infrastructure: EventBus, ContextManager, LLM Service
- ✅ Vercel API proxy for Gemini text generation

### Phase 2 (Art Team) - Core
- ✅ Asset Generator Agent (Imagen 4 ready)
- ✅ Style Validator Agent (Gemini Vision ready)
- ✅ Animation Creator Agent
- ✅ Audio Designer Agent (placeholder)
- ✅ Vercel API endpoints: `/api/gemini/imagen`, `/api/gemini/vision`
- ✅ **NEW:** Manual Review Mode (user can approve/reject assets)
- ✅ Integrated Art Team pipeline test

---

## 🆕 NEW FEATURE: Manual Review Mode

### What It Does
Users can now manually approve or reject each generated asset instead of relying on automatic AI validation.

### How It Works

**1. Default Mode (AUTO):**
```python
agent.generate_assets(
    asset_requests,
    style_guide,
    review_mode="auto"  # Default: AI validates automatically
)
```
- Style Validator Agent automatically checks quality
- No user interaction needed
- Faster for batch processing

**2. Manual Mode (MANUAL):**
```python
agent.generate_assets(
    asset_requests,
    style_guide,
    review_mode="manual"  # User approves each asset
)
```
- User is prompted for each generated asset
- Can view asset details, prompt, and file location
- Options: `y` (approve), `n` (reject), `view` (show file path)
- Rejected assets marked for regeneration

### Testing Manual Review Mode

```bash
# Run the manual review demonstration
python3 agents/art_team/test_manual_review.py
```

This will:
1. Show AUTO mode (no user interaction)
2. Show MANUAL mode (you approve/reject each asset)
3. Display results summary

---

## 📋 IMMEDIATE NEXT STEPS

### 1. **Deploy to Vercel & Verify Real API** (HIGH PRIORITY)

**Status:** Infrastructure ready, needs deployment

**Steps:**
```bash
# 1. Deploy to Vercel
cd /path/to/CaisoGames2
vercel --prod

# 2. Verify environment variables
# Go to: https://vercel.com/your-project/settings/environment-variables
# Confirm: GEMINI_API_KEY is set

# 3. Test Imagen endpoint
curl -X POST https://caisogames2.vercel.app/api/gemini/imagen \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "pixel art robot cat, 64x64",
    "aspect_ratio": "1:1",
    "number_of_images": 1
  }'

# 4. Test Vision endpoint
curl -X POST https://caisogames2.vercel.app/api/gemini/vision \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-2.0-flash-exp",
    "prompt": "Describe this image",
    "image_data": "<base64_encoded_image>",
    "mime_type": "image/png"
  }'
```

**Expected Results:**
- Imagen endpoint returns base64-encoded PNG images
- Vision endpoint returns JSON analysis
- Both track token/image usage

**Files to Deploy:**
- `/api/gemini/imagen.js` ✅
- `/api/gemini/vision.js` ✅
- `/vercel.json` (already exists)

---

### 2. **Update Agents to Use Real API** (MEDIUM PRIORITY)

**Current State:** All agents use Mock mode

**Changes Needed:**

**File:** `/agents/shared/llm.py`
```python
# Line 51: Change from True to False
self.mock_mode = False  # Use real Gemini API
```

**File:** `/agents/art_team/asset_generator/agent.py`
```python
# Replace _create_mock_asset() with real Imagen 4 API call
async def _generate_with_imagen(self, prompt, size):
    # Call /api/gemini/imagen
    # Download and save actual PNG image
    # Return real file path
```

**File:** `/agents/art_team/style_validator/agent.py`
```python
# Replace _simulate_validation() with real Gemini Vision call
async def _validate_with_vision(self, image_path, style_guide):
    # Load image as base64
    # Call /api/gemini/vision
    # Parse real validation JSON
    # Return actual quality scores
```

---

### 3. **Integrate Art Team with PM Agent** (MEDIUM PRIORITY)

**Goal:** PM Agent can orchestrate Design Team → Art Team workflow

**Implementation:**

**File:** `/agents/project_manager/pm_agent.py`

```python
def create_game(
    self,
    user_request: str,
    number_of_levels: int = 3,
    review_mode: str = "auto"  # NEW PARAMETER
) -> Dict[str, Any]:
    """
    Full game creation pipeline.

    Workflow:
    1. Design Team (Concept → Level → Narrative)
    2. Art Team (Assets → Validation → Animation → Audio)
    3. Quality Gates
    """

    # Phase 1: Design (already working)
    concept = self.concept_designer.design_concept(user_request)
    levels = self.level_designer.design_levels(concept, number_of_levels)
    narrative = self.narrative_designer.design_narrative(concept, levels)

    # Quality Gate: Design
    design_score = self._quality_gate_design(concept, levels, narrative)

    # Phase 2: Art Team (NEW)
    from art_team import AssetGeneratorAgent, StyleValidatorAgent

    asset_gen = AssetGeneratorAgent()
    validator = StyleValidatorAgent()

    # Generate asset requests from design
    asset_requests = self._create_asset_requests(concept, levels, narrative)
    style_guide = self._create_style_guide(concept)

    # Generate assets with chosen review mode
    assets = asset_gen.generate_assets(
        asset_requests,
        style_guide,
        review_mode=review_mode  # Pass through from user
    )

    # Validate assets (only if auto mode)
    if review_mode == "auto":
        validation = validator.validate_batch(assets, style_guide)

        # Quality Gate: Assets
        if validation['summary']['pass_rate'] < ASSET_QUALITY_THRESHOLD:
            # Regenerate failed assets
            pass

    # Phase 3: Engineering Team (Phase 3)
    # ... code generation

    # Phase 4: QA Team (Phase 3)
    # ... testing

    # Phase 5: Deployment (Phase 3)
    # ... build and deploy
```

**Helper Methods to Add:**

```python
def _create_asset_requests(
    self,
    concept: Dict,
    levels: List[Dict],
    narrative: Dict
) -> List[Dict]:
    """Convert design into asset requests."""
    requests = []

    # Player sprite
    protagonist = narrative['characters']['protagonist']
    requests.append({
        "category": "sprite",
        "name": f"{protagonist['name']} Player Sprite",
        "description": protagonist['description'],
        "size": {"width": 64, "height": 64},
        "purpose": "player character"
    })

    # Enemy sprites
    for enemy_type in concept['obstacles_enemies']:
        requests.append({
            "category": "sprite",
            "name": f"{enemy_type} Enemy",
            "description": f"Enemy: {enemy_type}",
            "size": {"width": 48, "height": 48},
            "purpose": "enemy"
        })

    # Backgrounds
    for level in levels:
        requests.append({
            "category": "background",
            "name": f"{level['title']} Background",
            "description": level['description'],
            "size": {"width": 1920, "height": 600},
            "purpose": "level background"
        })

    return requests

def _create_style_guide(self, concept: Dict) -> Dict:
    """Create style guide from concept."""
    return {
        "artStyle": "pixel_art",  # Could be determined from concept
        "colorPalette": [],  # Extract from visual_style
        "mood": concept.get('visual_style', 'cheerful'),
        "constraints": {
            "maxColors": 16,
            "transparentBackground": True
        }
    }
```

---

### 4. **Select and Integrate Audio API** (LOW PRIORITY)

**Current State:** Audio Designer is placeholder only

**Options:**

**Option A: Stable Audio** (Recommended)
- Pros: High-quality music + SFX, flexible
- Cons: $11.99/month subscription
- API: https://stableaudio.com/

**Option B: ElevenLabs**
- Pros: Great for voice/SFX, realistic sounds
- Cons: More expensive for music
- API: https://elevenlabs.io/

**Option C: Web Audio Synthesis** (Free)
- Pros: Free, procedural generation, full control
- Cons: Requires code generation, limited realism
- Method: Use Gemini to generate Web Audio API code

**Implementation Steps:**

1. **Select API** (user decision required)
2. **Create Vercel Proxy** `/api/audio/generate.js`
3. **Update Audio Designer Agent**
4. **Test Audio Generation**
5. **Integrate with PM Agent**

---

### 5. **Implement Asset Optimization Pipeline** (LOW PRIORITY)

**Goal:** Optimize generated assets for web deployment

**Features Needed:**

1. **Sprite Sheet Assembly**
   - Combine animation frames into single sprite sheet
   - Generate frame metadata JSON
   - Optimize file size

2. **Texture Atlas Packing**
   - Pack multiple sprites into single texture
   - Reduce HTTP requests
   - Generate UV coordinates

3. **Image Optimization**
   - Convert PNG to WebP for smaller file size
   - Lossy compression for backgrounds
   - Lossless for sprites

4. **Audio Optimization**
   - Convert WAV to OGG/MP3
   - Normalize volume levels
   - Reduce file sizes

**Tools:**
- `sharp` (Node.js image processing)
- `ffmpeg` (audio conversion)
- `texture-packer` (sprite sheet packing)

---

### 6. **Implement Transparent Background Processing** (MEDIUM PRIORITY)

**Goal:** Ensure generated sprites have transparent backgrounds

**Current State:** Images generated with white backgrounds

**Options:**

**Option A: Imagen 4 Native Support**
- Check if Imagen 4 supports native transparent output
- If yes, add parameter to API request

**Option B: AI Segmentation**
- Use Gemini Vision or specialized model
- Detect subject boundaries
- Remove background automatically

**Option C: Post-Processing**
- Simple white → transparent conversion
- Risk: White pixels in sprite also removed
- Add alpha channel manually

**Recommended:** Option A + Option B fallback

**Implementation:**
```python
def remove_background(image_path: str) -> str:
    """Remove white background from image."""
    from PIL import Image

    img = Image.open(image_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    for item in data:
        # Change white (also shades) to transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))  # Transparent
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(image_path, "PNG")
    return image_path
```

---

## 📅 RECOMMENDED IMPLEMENTATION ORDER

### Week 1: Core Completion & Deployment
1. ✅ **DAY 1-2:** Deploy to Vercel
   - Push code to production
   - Verify API endpoints
   - Test with real GEMINI_API_KEY

2. ✅ **DAY 3-4:** Test Real Image Generation
   - Update agents to use production API
   - Generate real images with Imagen 4
   - Validate quality with Gemini Vision
   - Measure actual costs

3. ✅ **DAY 5:** Integrate PM Agent with Art Team
   - Add Art Team calls to PM Agent
   - Test end-to-end: Design → Art pipeline
   - Verify manual review mode works

### Week 2: Phase 2 Completion
1. **DAY 1-2:** Select and Integrate Audio API
   - Evaluate options
   - Implement chosen API
   - Test audio generation

2. **DAY 3-4:** Asset Optimization
   - Implement sprite sheet assembly
   - Add transparent background processing
   - Optimize file sizes

3. **DAY 5:** Phase 2 Final Testing
   - Run complete Art Team pipeline
   - Verify all assets generated correctly
   - Document actual costs

### Week 3-4: Phase 3 (Engineering & QA)
1. **Code Generator Agent**
2. **Code Reviewer Agent**
3. **Performance Optimizer Agent**
4. **Debug Agent**
5. **QA Team** (Playwright integration)
6. **Integration Team** (Build, Deploy)

---

## 🎯 PRIORITY CHECKLIST

### Critical (Do First)
- [ ] Deploy to Vercel with GEMINI_API_KEY
- [ ] Test `/api/gemini/imagen` endpoint
- [ ] Test `/api/gemini/vision` endpoint
- [ ] Update agents from Mock to Production mode
- [ ] Generate first real image with Imagen 4
- [ ] Validate first real image with Gemini Vision

### High Priority (Do Soon)
- [ ] Integrate PM Agent with Art Team
- [ ] Test manual review mode end-to-end
- [ ] Implement transparent background processing
- [ ] Create asset request builder from design data

### Medium Priority (Do This Week)
- [ ] Select audio API
- [ ] Implement sprite sheet assembly
- [ ] Add image optimization (PNG → WebP)
- [ ] Write deployment documentation

### Low Priority (Can Wait)
- [ ] Full texture atlas packing
- [ ] Audio optimization pipeline
- [ ] Advanced asset caching

---

## 📊 CURRENT PROJECT STATUS

### Phase 1: Foundation
**Status:** ✅ 100% Complete

### Phase 2: Art Team
**Status:** 🔄 80% Complete (Core Ready, Production Testing Pending)

**Completed:**
- Asset Generator Agent
- Style Validator Agent
- Animation Creator Agent
- Audio Designer Agent (placeholder)
- Vercel API endpoints
- Manual Review Mode
- Integrated testing

**Remaining:**
- Real API integration and testing
- PM Agent integration
- Audio API selection
- Asset optimization
- Transparent backgrounds

### Phase 3: Engineering & QA
**Status:** ⏳ 0% Complete (Next Phase)

### Phase 4: First Game
**Status:** ⏳ 0% Complete

---

## 💡 TIPS FOR NEXT STEPS

### When Testing Real API
1. Start with `number_of_images=1` to minimize costs
2. Use small sizes (64x64) for testing
3. Monitor token usage carefully
4. Cache successful results
5. Test manual review mode first

### When Integrating PM Agent
1. Start with 1 level, minimal assets
2. Test Design → Art pipeline separately
3. Add error handling for API failures
4. Implement retry logic with backoff
5. Log all API calls for debugging

### When Deploying
1. Set all environment variables first
2. Test each endpoint individually
3. Check CORS headers are correct
4. Monitor Vercel logs for errors
5. Use `vercel dev` for local testing first

---

## 📞 SUPPORT & RESOURCES

### Documentation
- Phase 1 Report: `/docs/phase1-completion-report.md`
- Phase 2 Report: `/docs/phase2-completion-report.md`
- Engine API Spec: `/docs/engine/engine-api-spec.md`
- Agent Requirements: `/docs/specifications/agent-requirements.md`

### Test Scripts
- Art Team Test: `python3 agents/art_team/test_art_team.py`
- Manual Review Test: `python3 agents/art_team/test_manual_review.py`
- PM Agent Test: `python3 agents/project_manager/pm_agent.py "test game"`

### Useful Commands
```bash
# Deploy to Vercel
vercel --prod

# Test locally with Vercel
vercel dev

# Run Art Team pipeline
python3 agents/art_team/test_art_team.py

# Test manual review mode
python3 agents/art_team/test_manual_review.py

# Check generated assets
tree generated-assets/

# View event history
python3 -c "from agents.shared.event_bus import event_bus; print(event_bus.get_history())"
```

---

**Last Updated:** 2026-02-27
**Next Review:** After Vercel deployment testing
**Contact:** Project team for questions or issues
