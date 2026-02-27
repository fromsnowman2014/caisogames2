# CAISOGAMES V2: Multi-Agent System Architecture

## Executive Summary

CAISOGAMES V2는 Claude Code의 Agent Teams와 Gemini API를 결합하여 **완전 자동화된 게임 개발 팩토리**를 구축합니다. V1의 독립적인 에이전트 방식에서 벗어나, **계층적 조직 구조(Hierarchical Organization)**와 **에이전트 간 협업(Inter-Agent Collaboration)**을 통해 상업적 품질의 게임을 자동 생성합니다.

---

## 1. 아키텍처 개요 (Architecture Overview)

### 1.1 핵심 설계 원칙

1. **계층적 조직 (Hierarchical Organization)**
   - Project Manager가 모든 팀을 조율
   - 각 팀은 전문화된 서브 에이전트로 구성
   - 명확한 책임 분리 (Separation of Concerns)

2. **컨텍스트 공유 (Shared Context)**
   - 모든 에이전트가 프로젝트 상태에 접근
   - 에이전트 간 인사이트 공유
   - 일관된 아트 스타일 및 설계 유지

3. **반복적 개선 (Iterative Refinement)**
   - 각 단계에서 품질 검증
   - 피드백 루프를 통한 자동 개선
   - Best Practice 학습 및 적용

4. **Claude Code 네이티브 (Claude Code Native)**
   - Claude Code의 Task 도구 활용
   - 병렬 에이전트 실행 지원
   - 개발 환경과 완벽 통합

---

## 2. 에이전트 조직 구조 (Agent Organization)

```
┌─────────────────────────────────────────────────────────────┐
│          PROJECT MANAGER AGENT (Orchestrator)               │
│  - 전체 워크플로우 조율                                      │
│  - 팀 간 커뮤니케이션 관리                                    │
│  - 품질 게이트 검증                                          │
│  - 프로젝트 컨텍스트 유지                                     │
└─────────────────────────────────────────────────────────────┘
                              ▼
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  DESIGN TEAM  │    │   ART TEAM    │    │ ENGINEERING   │
├───────────────┤    ├───────────────┤    │     TEAM      │
│ • Concept     │◄──►│ • Generator   │◄──►├───────────────┤
│   Designer    │    │ • Validator   │    │ • Code Gen    │
│ • Level       │    │ • Animator    │    │ • Reviewer    │
│   Designer    │    │ • Audio       │    │ • Optimizer   │
│ • Narrative   │    │   Designer    │    │ • Debugger    │
│   Designer    │    └───────────────┘    └───────────────┘
└───────────────┘             ▲                    ▲
        │                     │                    │
        └────────►┌───────────┴────────┐◄──────────┘
                  │     QA TEAM        │
                  ├────────────────────┤
                  │ • Test Planner     │
                  │ • Test Executor    │
                  │ • Bug Reporter     │
                  │ • Regression Tester│
                  └────────────────────┘
                          ▼
                  ┌────────────────────┐
                  │ INTEGRATION TEAM   │
                  ├────────────────────┤
                  │ • Build Manager    │
                  │ • Asset Compiler   │
                  │ • Deploy Agent     │
                  └────────────────────┘
```

---

## 3. 에이전트 상세 명세 (Agent Specifications)

### 3.1 Project Manager Agent (PM)

**역할:** 모든 팀을 조율하고 프로젝트의 성공적인 완수를 책임지는 최상위 오케스트레이터

**책임:**
- 사용자 요구사항을 구체적인 태스크로 분해
- 각 팀에 적절한 작업 할당
- 팀 간 의존성 관리 및 순서 조정
- 품질 게이트 검증 (각 단계 완료 기준 확인)
- 프로젝트 컨텍스트 유지 및 업데이트
- 최종 결과물 승인

**입력:**
- 사용자 요구사항 (예: "픽셀 아트 스타일의 플랫포머 게임 제작")
- 프로젝트 제약사항 (타겟 플랫폼, 기술 스택 등)

**출력:**
- 상세 프로젝트 플랜
- 팀별 작업 지시서
- 진행 상황 보고서
- 최종 게임 패키지

**워크플로우:**
```
1. 요구사항 분석 및 태스크 분해
2. Design Team 활성화 → 게임 컨셉 수립
3. 컨셉 검증 후 Art Team + Engineering Team 병렬 활성화
4. 통합 검증 → QA Team 활성화
5. 버그 수정 반복 (Engineering ↔ QA)
6. Integration Team 활성화 → 최종 빌드
7. 사용자에게 전달
```

**Claude Code 통합:**
```python
# PM Agent는 Claude Code의 Task 도구를 사용하여 서브 에이전트 실행
# 예: 병렬 실행
await Task.run_parallel([
    Task("Design Team: Concept Design", design_team_prompt),
    Task("Design Team: Level Design", level_design_prompt),
])
```

---

### 3.2 Design Team

#### 3.2.1 Concept Designer Agent

**역할:** 게임의 핵심 메카닉, 장르, 플레이어 경험 설계

**책임:**
- 게임 장르 및 핵심 루프 정의
- 플레이어 능력 및 진행 시스템 설계
- 난이도 곡선 설계
- 게임 밸런스 초기 설정

**입력:**
- 사용자 요구사항
- 참조 게임 (선택사항)

**출력:**
```json
{
  "genre": "platformer",
  "core_loop": "Jump → Collect → Avoid Enemies → Reach Goal",
  "player_abilities": ["jump", "double_jump", "dash"],
  "progression": {
    "type": "level_based",
    "difficulty_curve": "gradual",
    "unlock_system": "ability_gates"
  },
  "unique_mechanics": ["wall_slide", "momentum_preservation"],
  "reference_games": ["Celeste", "Hollow Knight"]
}
```

**프롬프트 템플릿:**
```
You are an Expert Game Designer specializing in [GENRE] games.

Design a compelling game concept with the following requirements:
- Target audience: [AUDIENCE]
- Platform: [PLATFORM]
- Development constraints: [CONSTRAINTS]

Provide:
1. Core gameplay loop (3-5 steps)
2. Player abilities (with progression order)
3. Win/lose conditions
4. Difficulty curve design
5. Unique selling point (what makes this game special)

Output as structured JSON following the schema: [SCHEMA]
```

#### 3.2.2 Level Designer Agent

**역할:** 레벨 구조, 오브젝트 배치, 난이도 조절

**책임:**
- 레벨 레이아웃 생성
- 적/장애물 배치
- 수집품 위치 결정
- 레벨 간 난이도 조절

**입력:**
- Concept Designer의 게임 메카닉
- 아트 에셋 리스트 (Art Team으로부터)

**출력:**
```json
{
  "levels": [
    {
      "id": "level_1",
      "name": "Forest Entry",
      "difficulty": 1,
      "layout": {
        "width": 3000,
        "height": 600,
        "platforms": [
          {"x": 0, "y": 500, "width": 200, "type": "ground"},
          {"x": 300, "y": 400, "width": 150, "type": "floating"}
        ],
        "enemies": [
          {"x": 500, "y": 450, "type": "slime", "patrol_range": 100}
        ],
        "collectibles": [
          {"x": 350, "y": 350, "type": "coin"}
        ],
        "goal": {"x": 2800, "y": 500}
      },
      "estimated_completion_time": "2-3 minutes",
      "skill_requirements": ["basic_jump", "timing"]
    }
  ]
}
```

#### 3.2.3 Narrative Designer Agent

**역할:** 게임의 세계관, 캐릭터 설정, 스토리라인 작성

**책임:**
- 세계관 설정 및 배경 스토리
- 캐릭터 설정 및 동기
- 대사 작성 (NPC, 튜토리얼 등)
- 몰입감을 높이는 텍스트 요소

**입력:**
- 게임 컨셉
- 아트 스타일

**출력:**
```json
{
  "world": {
    "name": "The Forgotten Forest",
    "description": "A once-thriving woodland now corrupted by dark magic",
    "lore": "Centuries ago, the forest guardian fell into eternal slumber..."
  },
  "protagonist": {
    "name": "Caiso",
    "description": "A small spirit seeking to restore the forest",
    "motivation": "Find and awaken the forest guardian",
    "personality": ["curious", "determined", "playful"]
  },
  "dialogue": {
    "tutorial": [
      "Press SPACE to jump!",
      "Collect coins to unlock new abilities"
    ],
    "npc_1": {
      "name": "Old Tree",
      "lines": [
        "Young spirit... the path ahead is dangerous.",
        "But I sense courage in you. Go forth!"
      ]
    }
  }
}
```

---

### 3.3 Art Team

#### 3.3.1 Asset Generator Agent

**역할:** Gemini Imagen 4를 사용하여 고품질 게임 에셋 생성

**책임:**
- 스프라이트 생성 (캐릭터, 적, 아이템)
- 배경 아트워크 생성
- UI 에셋 생성
- 일관된 아트 스타일 유지

**입력:**
- Design Team의 에셋 요구사항
- 아트 스타일 가이드
- 참조 이미지 (선택사항)

**출력:**
- 고해상도 PNG 이미지 (투명 배경)
- 메타데이터 (크기, 용도, 생성 파라미터)

**Gemini API 통합:**
```python
import google.generativeai as genai

class AssetGeneratorAgent:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('imagen-4.0-generate-001')

    async def generate_sprite(self, request: AssetRequest) -> GeneratedAsset:
        # V2 개선사항: 스타일 참조 이미지 사용
        prompt = self._build_prompt(request)

        response = await self.model.generate_image(
            prompt=prompt,
            aspect_ratio="1:1",
            size={"width": 512, "height": 512},
            style_reference=request.style_reference,  # 새 기능
            negative_prompt="text, watermark, complex background, blur"
        )

        # 투명 배경 처리
        image = self._extract_transparency(response.image)

        return GeneratedAsset(
            image=image,
            metadata={
                "prompt": prompt,
                "model": "imagen-4.0",
                "size": (512, 512)
            }
        )

    def _build_prompt(self, request: AssetRequest) -> str:
        # 개선된 프롬프트 빌더
        style_templates = {
            "pixel_art": """
                Style: 16-bit pixel art, retro game sprite
                Requirements:
                - Clean, sharp edges (no anti-aliasing)
                - Limited color palette (16-32 colors)
                - Isolated subject on WHITE background
                - Game-ready proportions (character should be 32x32 or 64x64 equivalent)
                - Clear silhouette
                - No gradients or smooth shading
                - Pixel-perfect details
            """,
            "hand_drawn": """
                Style: Hand-drawn 2D game art, cartoon illustration
                Requirements:
                - Bold, clean outlines
                - Flat colors with minimal shading
                - Vibrant, saturated palette
                - Isolated subject on WHITE background
                - Game-ready design (clear at small sizes)
                - Expressive, stylized proportions
            """
        }

        base_prompt = f"""
Create a game asset: {request.description}

Asset Type: {request.asset_type}
Purpose: {request.purpose}

{style_templates.get(request.style, style_templates['pixel_art'])}

Important:
- Subject must be centered
- White background only (for transparency extraction)
- No text or UI elements
- Production-quality, commercial-grade artwork
"""
        return base_prompt
```

**반복 개선 루프:**
```
1. 초기 생성
2. Validator Agent에게 품질 검증 요청
   ↓ (품질 < 90%)
3. 피드백 기반 프롬프트 개선
4. 재생성 (최대 5회)
5. 최고 품질 iteration 선택
```

#### 3.3.2 Style Validator Agent

**역할:** 생성된 에셋의 품질 및 스타일 일관성 검증

**책임:**
- 아트 스타일 일치도 검증
- 기술적 품질 평가 (해상도, 투명도 등)
- 게임 내 사용 적합성 판단
- 개선 피드백 제공

**입력:**
- 생성된 이미지
- 아트 스타일 가이드
- 프로젝트 컨텍스트

**출력:**
```json
{
  "overall_score": 92,
  "passed": true,
  "metrics": {
    "style_consistency": {
      "score": 95,
      "feedback": "Excellent pixel art style, matches reference perfectly"
    },
    "technical_quality": {
      "score": 90,
      "feedback": "Clean edges, but some pixels could be crisper"
    },
    "transparency": {
      "score": 88,
      "feedback": "Background mostly removed, minor artifacts at bottom-left"
    },
    "game_fit": {
      "score": 95,
      "feedback": "Perfect size and proportions for game use"
    },
    "composition": {
      "score": 92,
      "feedback": "Well-centered, clear silhouette"
    }
  },
  "improvement_suggestions": [
    "Increase pixel sharpness on character outline",
    "Clean up 3 stray pixels at coordinates (12, 45)"
  ],
  "approved_for_use": true
}
```

**Gemini Vision API 활용:**
```python
class StyleValidatorAgent:
    def __init__(self, api_key: str):
        self.vision_model = genai.GenerativeModel('gemini-2.0-flash-exp')

    async def validate(self, image: Image, style_guide: dict) -> ValidationResult:
        prompt = f"""
You are an Expert Art Director for game development.

Evaluate this game asset against the following criteria:

STYLE GUIDE:
{json.dumps(style_guide, indent=2)}

Analyze:
1. Style Consistency (0-100): Does it match the required art style?
2. Technical Quality (0-100): Resolution, clarity, edge quality
3. Transparency (0-100): Is background properly removed?
4. Game Fit (0-100): Appropriate size, proportions, and detail level
5. Composition (0-100): Centering, silhouette clarity

For each metric, provide:
- Numeric score
- Brief feedback (1-2 sentences)
- Specific improvement suggestions if score < 90

Overall pass threshold: 90/100
Output as JSON following schema: [SCHEMA]
"""

        response = await self.vision_model.generate_content([prompt, image])
        return self._parse_validation(response.text)
```

#### 3.3.3 Animation Creator Agent

**역할:** 스프라이트 애니메이션 생성 및 프레임 일관성 유지

**책임:**
- 애니메이션 프레임 생성 (idle, walk, jump 등)
- 프레임 간 일관성 검증
- 스프라이트 시트 조립
- 애니메이션 타이밍 정의

**입력:**
- 캐릭터 베이스 스프라이트
- 애니메이션 요구사항 (동작 리스트)

**출력:**
- 스프라이트 시트 (PNG)
- 애니메이션 메타데이터 (JSON)

```json
{
  "sprite_sheet": "character_animations.png",
  "animations": {
    "idle": {
      "frames": [0, 1, 2, 3],
      "frame_rate": 8,
      "loop": true
    },
    "walk": {
      "frames": [4, 5, 6, 7, 8, 9],
      "frame_rate": 12,
      "loop": true
    },
    "jump": {
      "frames": [10, 11, 12],
      "frame_rate": 10,
      "loop": false
    }
  },
  "frame_size": {"width": 64, "height": 64},
  "frames_per_row": 10
}
```

**프레임 일관성 검증:**
```python
async def verify_frame_consistency(self, frames: List[Image]) -> ConsistencyReport:
    """Gemini Vision을 사용하여 프레임 간 일관성 검증"""
    prompt = """
Analyze these animation frames for consistency:

Check:
1. Character proportions remain constant
2. Color palette is identical
3. Line thickness is uniform
4. Style is consistent across all frames
5. Smooth motion flow (no jarring jumps)

Rate consistency: 0-100
List any inconsistencies found.
"""

    response = await self.vision_model.generate_content([prompt] + frames)
    return self._parse_consistency_report(response.text)
```

#### 3.3.4 Audio Designer Agent

**역할:** Gemini를 활용한 사운드 이펙트 및 BGM 생성

**책임:**
- SFX 생성 (실제 오디오 파일)
- BGM 생성 및 루핑
- 오디오 품질 검증
- 게임 이벤트와 사운드 매칭

**V2 개선사항 (V1 대비):**
- ❌ V1: Web Audio API 코드만 생성
- ✅ V2: 실제 오디오 파일 생성 (WAV/MP3)

**구현 방안:**
```python
class AudioDesignerAgent:
    def __init__(self, api_key: str):
        self.gemini = genai.GenerativeModel('gemini-2.0-flash-exp')
        # V2: 외부 오디오 생성 API 통합
        self.audio_api = AudioGenerationAPI()  # MusicLM, Stable Audio 등

    async def generate_sfx(self, request: SFXRequest) -> AudioFile:
        # Step 1: Gemini로 사운드 디자인 파라미터 생성
        design_prompt = f"""
Design parameters for game sound effect: {request.description}

Category: {request.category}  # ui, gameplay, feedback, ambient
Duration: {request.duration}ms
Style: {request.style}  # retro, modern, realistic

Provide:
1. Sound type (beep, whoosh, impact, etc.)
2. Frequency range (low/mid/high)
3. Envelope (attack, decay, sustain, release)
4. Effects (reverb, distortion, etc.)
5. Reference sounds (optional)

Output as JSON.
"""

        params = await self.gemini.generate_content(design_prompt)

        # Step 2: 외부 API로 실제 오디오 생성
        audio_file = await self.audio_api.generate(
            description=request.description,
            parameters=params,
            format="wav",
            sample_rate=44100
        )

        # Step 3: 품질 검증
        quality = await self.validate_audio_quality(audio_file)

        if quality.score < 80:
            # 재생성 또는 개선
            audio_file = await self.improve_audio(audio_file, quality.feedback)

        return audio_file

    async def generate_bgm(self, request: BGMRequest) -> AudioFile:
        """배경음악 생성"""
        design_prompt = f"""
Compose background music for game scene: {request.scene}

Mood: {request.mood}  # upbeat, tense, peaceful, mysterious
Tempo: {request.tempo} BPM
Duration: {request.duration} seconds
Style: {request.style}  # chiptune, orchestral, electronic

Provide:
1. Instrument selection (3-5 instruments max)
2. Chord progression
3. Melodic pattern
4. Rhythm pattern
5. Loop points (for seamless looping)

Output as JSON for music generation API.
"""

        composition = await self.gemini.generate_content(design_prompt)

        # MusicLM 또는 유사 API로 실제 음악 생성
        bgm = await self.audio_api.generate_music(
            composition=composition,
            duration=request.duration,
            loopable=True
        )

        return bgm
```

---

### 3.4 Engineering Team

#### 3.4.1 Code Generator Agent

**역할:** 게임 로직 코드 생성 (AI 엔진 기반)

**책임:**
- 게임 시스템 구현 (플레이어 컨트롤, 물리 등)
- ECS 아키텍처 기반 코드 생성
- AI 엔진 API 활용
- 클린 코드 원칙 준수

**입력:**
- Design Team의 게임 메카닉
- Level Designer의 레벨 데이터
- Art Team의 에셋 매니페스트

**출력:**
```typescript
// 예: 플레이어 컨트롤러 생성
import { Engine, Entity, Component } from '@caisogames/ai-engine';

// ECS 기반 코드 (AI가 생성)
const player = Engine.createEntity('player');

player.addComponent(Component.Transform, {
  position: { x: 100, y: 500 },
  scale: { x: 1, y: 1 }
});

player.addComponent(Component.Sprite, {
  texture: 'assets/player_idle.png',
  animations: {
    idle: { frames: [0, 1, 2, 3], fps: 8 },
    walk: { frames: [4, 5, 6, 7], fps: 12 }
  }
});

player.addComponent(Component.Physics, {
  velocity: { x: 0, y: 0 },
  gravity: 980,
  friction: 0.9,
  collider: { type: 'box', width: 32, height: 64 }
});

player.addComponent(Component.PlayerController, {
  moveSpeed: 200,
  jumpForce: 400,
  canDoubleJump: true
});

// 시스템 등록 (AI 엔진이 자동 처리)
Engine.registerSystem(new PlayerMovementSystem());
Engine.registerSystem(new PhysicsSystem());
Engine.registerSystem(new RenderSystem());
```

**프롬프트 템플릿:**
```
You are an Expert Game Programmer specializing in ECS architecture.

Generate TypeScript code for the following game mechanic:

MECHANIC: {mechanic_description}
ENGINE: @caisogames/ai-engine (ECS-based)
AVAILABLE COMPONENTS: Transform, Sprite, Physics, PlayerController, Enemy, Collectible
AVAILABLE SYSTEMS: Movement, Physics, Collision, Render, Animation

Requirements:
1. Use only engine-provided components (no custom components)
2. Follow ECS patterns (data in components, logic in systems)
3. Clean, readable code with comments
4. Type-safe TypeScript
5. Performance-optimized (avoid unnecessary loops)

Code structure:
- Entity creation
- Component attachment with configuration
- System registration (if needed)

Output clean code only (no markdown, no explanations).
```

#### 3.4.2 Code Reviewer Agent

**역할:** 생성된 코드의 품질, 성능, 보안 검증

**책임:**
- 코드 품질 분석 (가독성, 유지보수성)
- 성능 최적화 제안
- 버그 및 보안 취약점 탐지
- 베스트 프랙티스 준수 확인

**입력:**
- Code Generator의 생성 코드
- 프로젝트 코딩 스탠다드

**출력:**
```json
{
  "overall_score": 85,
  "passed": true,
  "issues": [
    {
      "severity": "warning",
      "category": "performance",
      "location": "src/systems/collision.ts:45",
      "message": "Nested loop in collision detection (O(n²))",
      "suggestion": "Use spatial hashing for O(n) performance",
      "code_snippet": "for (let i = 0; i < entities.length; i++) {\n  for (let j = 0; j < entities.length; j++) { ... }",
      "fixed_code": "const grid = new SpatialGrid(cellSize);\ngrid.insert(entities);\nconst collisions = grid.getNearby(entity);"
    },
    {
      "severity": "info",
      "category": "code_quality",
      "location": "src/entities/player.ts:12",
      "message": "Magic number detected",
      "suggestion": "Extract to named constant",
      "code_snippet": "if (velocity.y > 500) { ... }",
      "fixed_code": "const MAX_FALL_SPEED = 500;\nif (velocity.y > MAX_FALL_SPEED) { ... }"
    }
  ],
  "metrics": {
    "complexity": 12,  // Cyclomatic complexity
    "maintainability": 78,  // Maintainability index
    "test_coverage": 0,  // No tests yet
    "duplications": 2  // Code duplications found
  },
  "recommendations": [
    "Add unit tests for PlayerController",
    "Extract collision logic to separate module",
    "Consider using object pooling for particles"
  ]
}
```

#### 3.4.3 Performance Optimizer Agent

**역할:** 게임 성능 프로파일링 및 최적화

**책임:**
- FPS 측정 및 분석
- 메모리 사용량 모니터링
- 렌더링 최적화 (배칭, 컬링)
- 로딩 시간 개선

**입력:**
- 빌드된 게임
- 성능 요구사항 (타겟 60 FPS 등)

**출력:**
```json
{
  "performance_report": {
    "fps": {
      "average": 58,
      "min": 45,
      "max": 60,
      "target": 60,
      "passed": false
    },
    "memory": {
      "heap_used": "45 MB",
      "heap_limit": "128 MB",
      "texture_memory": "12 MB",
      "passed": true
    },
    "load_time": {
      "total": 2.3,  // seconds
      "assets": 1.8,
      "code": 0.5,
      "target": 2.0,
      "passed": false
    }
  },
  "bottlenecks": [
    {
      "location": "RenderSystem.update()",
      "issue": "Drawing 500+ sprites per frame without batching",
      "impact": "15 FPS drop",
      "optimization": "Implement sprite batching"
    },
    {
      "location": "Asset loading",
      "issue": "Loading all assets at startup",
      "impact": "2.3s load time",
      "optimization": "Lazy load level assets"
    }
  ],
  "optimizations_applied": [
    "Enabled sprite batching (10 FPS gain)",
    "Implemented frustum culling (5 FPS gain)",
    "Compressed textures with WebP (30% size reduction)"
  ]
}
```

#### 3.4.4 Debug Agent

**역할:** 버그 자동 탐지 및 수정

**책임:**
- 런타임 에러 분석
- 논리적 버그 탐지 (예: 충돌 미작동)
- 자동 핫픽스 생성
- 회귀 테스트 생성

**V2 개선사항:**
- Self-Healing 워크플로우
- 버그 재현 시나리오 자동 생성
- 근본 원인 분석 (Root Cause Analysis)

```python
class DebugAgent:
    async def analyze_error(self, error: RuntimeError) -> BugReport:
        """에러 분석 및 자동 수정"""

        # Step 1: 에러 컨텍스트 수집
        context = {
            "error_message": str(error),
            "stack_trace": error.stack_trace,
            "source_code": self._get_relevant_code(error.location),
            "game_state": self._capture_game_state(),
            "recent_changes": self._get_git_diff()
        }

        # Step 2: Gemini로 근본 원인 분석
        analysis_prompt = f"""
You are an Expert Debugger analyzing a game crash.

ERROR:
{context['error_message']}

STACK TRACE:
{context['stack_trace']}

RELEVANT CODE:
{context['source_code']}

GAME STATE:
{context['game_state']}

Analyze:
1. Root cause of the error
2. Why it occurred (logic flaw, edge case, etc.)
3. How to reproduce consistently
4. Step-by-step fix
5. Prevention strategy (how to avoid similar bugs)

Output as JSON.
"""

        analysis = await self.gemini.generate_content(analysis_prompt)

        # Step 3: 자동 핫픽스 생성
        fix_prompt = f"""
Based on this analysis:
{analysis}

Generate a code fix for file: {error.location.file}

Requirements:
- Minimal change (fix only the bug, don't refactor)
- Add null checks / validation if needed
- Include explanatory comment
- Preserve existing logic

Output the fixed code section only.
"""

        fixed_code = await self.gemini.generate_content(fix_prompt)

        # Step 4: 자동 적용 및 테스트
        await self._apply_fix(error.location, fixed_code)
        test_result = await self._run_regression_test()

        return BugReport(
            root_cause=analysis.root_cause,
            fix_applied=fixed_code,
            test_passed=test_result.success
        )
```

---

### 3.5 QA Team

#### 3.5.1 Test Planner Agent

**역할:** 테스트 케이스 자동 생성

**책임:**
- 기능별 테스트 케이스 설계
- 엣지 케이스 식별
- 테스트 우선순위 결정
- 커버리지 목표 설정

**입력:**
- 게임 메카닉 명세
- 생성된 코드

**출력:**
```json
{
  "test_suites": [
    {
      "name": "Player Movement",
      "priority": "high",
      "test_cases": [
        {
          "id": "PM-001",
          "name": "Player can jump",
          "steps": [
            "Start game",
            "Press SPACE key",
            "Verify player Y position increases",
            "Verify player returns to ground"
          ],
          "expected": "Player jumps and lands smoothly",
          "edge_cases": [
            "Jump while already jumping (double jump)",
            "Jump at level boundary",
            "Jump while moving horizontally"
          ]
        },
        {
          "id": "PM-002",
          "name": "Player cannot walk through walls",
          "steps": [
            "Start game",
            "Move player toward wall",
            "Verify player stops at wall",
            "Verify player X position does not exceed wall X"
          ],
          "expected": "Player collides with wall and stops"
        }
      ]
    }
  ],
  "coverage_goal": 85,
  "estimated_execution_time": "15 minutes"
}
```

#### 3.5.2 Test Executor Agent

**역할:** Playwright 기반 자동화 테스트 실행

**책임:**
- 테스트 케이스 자동 실행
- 시각적 회귀 테스트 (스크린샷 비교)
- 성능 측정 (FPS, 로딩 시간)
- 테스트 결과 수집

**V2 개선사항:**
- ❌ V1: 랜덤 클릭만 수행
- ✅ V2: 목표 지향적 테스트 (Goal-Oriented Testing)

```python
class TestExecutorAgent:
    async def execute_test_suite(self, suite: TestSuite) -> TestResults:
        """Playwright로 테스트 실행"""

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            await page.goto('http://localhost:3000')

            results = []
            for test_case in suite.test_cases:
                result = await self._execute_test_case(page, test_case)
                results.append(result)

            await browser.close()

        return TestResults(
            total=len(results),
            passed=sum(1 for r in results if r.passed),
            failed=sum(1 for r in results if not r.passed),
            details=results
        )

    async def _execute_test_case(self, page, test_case):
        """개별 테스트 케이스 실행"""

        try:
            # 테스트 단계 실행
            for step in test_case.steps:
                await self._execute_step(page, step)

            # 결과 검증
            passed = await self._verify_expected(page, test_case.expected)

            # 스크린샷 캡처 (시각적 회귀 테스트)
            screenshot = await page.screenshot()

            return TestResult(
                test_id=test_case.id,
                passed=passed,
                screenshot=screenshot,
                execution_time=time.time() - start_time
            )

        except Exception as e:
            return TestResult(
                test_id=test_case.id,
                passed=False,
                error=str(e)
            )

    async def _execute_step(self, page, step: str):
        """자연어 단계를 실제 액션으로 변환"""

        # Gemini로 자연어 → Playwright 액션 변환
        prompt = f"""
Convert this test step to Playwright code:
"{step}"

Available page methods:
- page.click(selector)
- page.press(key)
- page.fill(selector, text)
- page.wait_for_selector(selector)

Output Python code only (no explanation).
"""

        playwright_code = await self.gemini.generate_content(prompt)

        # 안전하게 실행
        await eval(playwright_code)  # 실제론 sandbox 필요
```

#### 3.5.3 Bug Reporter Agent

**역할:** 발견된 버그를 구조화하여 보고 및 Engineering Team에 전달

**책임:**
- 버그 재현 단계 정리
- 우선순위 분류 (Critical, High, Medium, Low)
- 스크린샷/비디오 첨부
- Engineering Team에 자동 할당

**출력:**
```json
{
  "bug_id": "BUG-042",
  "title": "Player falls through platform at high speed",
  "severity": "high",
  "category": "physics",
  "reproduction_steps": [
    "Start level 2",
    "Run at full speed (hold RIGHT)",
    "Jump onto the second platform",
    "Player clips through platform and falls"
  ],
  "expected_behavior": "Player lands on platform",
  "actual_behavior": "Player falls through platform",
  "frequency": "Occurs 7/10 attempts",
  "evidence": {
    "screenshot": "screenshots/bug-042.png",
    "video": "recordings/bug-042.mp4",
    "console_logs": "PhysicsSystem: collision check missed at frame 145"
  },
  "environment": {
    "browser": "Chrome 120",
    "os": "Windows 11",
    "game_version": "0.2.1-alpha"
  },
  "assigned_to": "Engineering Team - Debug Agent",
  "related_code": "src/systems/physics.ts:78-92"
}
```

---

### 3.6 Integration Team

#### 3.6.1 Build Manager Agent

**역할:** 게임 빌드 및 패키징 자동화

**책임:**
- 에셋 컴파일 (스프라이트 시트, 아틀라스 생성)
- 코드 번들링 및 최적화 (Vite/Webpack)
- 다중 플랫폼 빌드 (Web, Desktop, Mobile)
- 빌드 에러 처리

**워크플로우:**
```
1. 에셋 수집 및 검증
2. 스프라이트 시트 조립
3. TypeScript 컴파일
4. 번들링 (Tree-shaking, Minification)
5. 에셋 압축 (WebP, 오디오 압축)
6. HTML 생성 (인라인 또는 분리)
7. 빌드 검증 (로딩 테스트)
```

#### 3.6.2 Asset Compiler Agent

**역할:** 원본 에셋을 게임용 포맷으로 최적화

**책임:**
- 이미지 최적화 (WebP 변환, 압축)
- 스프라이트 시트 생성
- 텍스처 아틀라스 패킹
- 오디오 압축

**예시 출력:**
```json
{
  "sprite_sheets": [
    {
      "name": "player_animations.png",
      "source_images": ["idle_0.png", "idle_1.png", "walk_0.png", ...],
      "frames": 24,
      "layout": "grid",
      "optimizations": ["webp_conversion", "lossless_compression"],
      "size_before": "2.4 MB",
      "size_after": "380 KB",
      "reduction": "84%"
    }
  ],
  "texture_atlas": {
    "name": "ui_atlas.png",
    "packed_textures": ["button.png", "icon_coin.png", "health_bar.png"],
    "algorithm": "MaxRects",
    "efficiency": "92%"
  },
  "audio_optimizations": [
    {
      "file": "bgm_forest.mp3",
      "format": "mp3",
      "bitrate": "128kbps",
      "size_reduction": "65%"
    }
  ]
}
```

#### 3.6.3 Deploy Agent

**역할:** 게임을 배포 플랫폼에 업로드 및 퍼블리시

**책임:**
- Vercel/Netlify에 웹 빌드 배포
- Itch.io에 게임 업로드
- GitHub Pages 배포
- 버전 관리 (Semantic Versioning)

---

## 4. 에이전트 간 통신 프로토콜 (Inter-Agent Communication)

### 4.1 공유 컨텍스트 (Shared Context)

모든 에이전트가 접근 가능한 프로젝트 상태:

```json
{
  "project_id": "caiso-platformer-001",
  "version": "0.3.0",
  "phase": "development",  // concept, development, testing, deployment

  "design": {
    "genre": "platformer",
    "core_mechanics": ["jump", "dash", "wall_slide"],
    "target_audience": "casual gamers, ages 10+",
    "art_style": "pixel_art_16bit"
  },

  "assets": {
    "sprites": [
      {
        "id": "player_idle",
        "status": "approved",
        "file": "generated-assets/player/idle.png",
        "metadata": {...}
      }
    ],
    "audio": [...],
    "style_guide": {
      "color_palette": ["#2D2D2D", "#F4A460", "#8FBC8F"],
      "pixel_density": "16x16 base unit",
      "reference_image": "assets/style_ref.png"
    }
  },

  "code": {
    "entities": ["player", "enemy_slime", "coin"],
    "systems": ["movement", "physics", "collision"],
    "build_status": "passing"
  },

  "quality": {
    "test_coverage": 78,
    "known_bugs": 3,
    "performance_fps": 58
  }
}
```

### 4.2 이벤트 버스 (Event Bus)

에이전트 간 비동기 통신:

```python
from enum import Enum

class EventType(Enum):
    DESIGN_APPROVED = "design.approved"
    ASSET_GENERATED = "asset.generated"
    ASSET_APPROVED = "asset.approved"
    CODE_GENERATED = "code.generated"
    BUG_FOUND = "qa.bug_found"
    BUILD_COMPLETE = "build.complete"

class Event:
    type: EventType
    source_agent: str
    payload: dict
    timestamp: datetime

# 사용 예시
class ArtTeam:
    async def on_design_approved(self, event: Event):
        """Design Team이 컨셉을 승인하면 자동으로 에셋 생성 시작"""
        design = event.payload['design']

        # 병렬로 에셋 생성
        await asyncio.gather(
            self.generate_player_sprite(design),
            self.generate_enemy_sprites(design),
            self.generate_backgrounds(design)
        )

        # 완료 이벤트 발행
        EventBus.emit(Event(
            type=EventType.ASSET_GENERATED,
            source_agent="ArtTeam",
            payload={"asset_count": 15}
        ))
```

### 4.3 워크플로우 예시

**사용자 요청:** "픽셀 아트 스타일의 플랫포머 게임 제작"

```
[PM Agent] 요청 분석
   ↓
   └─► [Design Team] 게임 컨셉 설계
         ├─► Concept Designer: 핵심 메카닉 정의
         ├─► Level Designer: 레벨 구조 설계
         └─► Narrative Designer: 스토리 작성
   ↓ (Design Approved 이벤트)
   ├─► [Art Team] 에셋 생성 (병렬)
   │     ├─► Asset Generator: 스프라이트 생성
   │     ├─► Validator: 품질 검증
   │     ├─► Animator: 애니메이션 생성
   │     └─► Audio Designer: 사운드 생성
   │
   └─► [Engineering Team] 코드 생성 (병렬)
         ├─► Code Generator: 게임 로직 구현
         ├─► Reviewer: 코드 리뷰
         └─► Optimizer: 성능 최적화
   ↓ (Assets + Code Ready 이벤트)
   └─► [Integration Team] 통합
         └─► Build Manager: 빌드 생성
   ↓ (Build Complete 이벤트)
   └─► [QA Team] 테스트
         ├─► Test Planner: 테스트 케이스 생성
         ├─► Test Executor: 자동화 테스트 실행
         └─► Bug Reporter: 버그 보고
   ↓ (만약 버그 발견)
   └─► [Engineering Team - Debug Agent] 버그 수정
         └─► 자동 핫픽스 적용
   ↓ (다시 QA로 회귀)
   └─► [QA Team] 재테스트
   ↓ (All Tests Passed 이벤트)
   └─► [Integration Team - Deploy Agent] 배포
         └─► Vercel에 퍼블리시
   ↓
[PM Agent] 사용자에게 완성된 게임 URL 전달
```

---

## 5. Claude Code 통합 (Claude Code Integration)

### 5.1 Task 도구 활용

Claude Code의 `Task` 도구를 사용하여 서브 에이전트 실행:

```python
# PM Agent의 워크플로우 예시
async def orchestrate_game_development(user_request: str):
    """사용자 요청을 받아 전체 개발 프로세스 조율"""

    # Phase 1: 디자인 (병렬 실행)
    design_results = await run_parallel_tasks([
        {
            "subagent_type": "general-purpose",
            "description": "Design game concept",
            "prompt": f"""
You are the Concept Designer agent.

User request: {user_request}

Design the core game mechanics following the template:
[CONCEPT_TEMPLATE]

Output as JSON.
"""
        },
        {
            "subagent_type": "general-purpose",
            "description": "Design game levels",
            "prompt": f"""
You are the Level Designer agent.

Based on this concept: [CONCEPT_WILL_BE_INJECTED]

Design 3 levels with increasing difficulty.
Output as JSON.
"""
        }
    ])

    # Phase 2: 에셋 생성 (디자인 승인 후)
    if validate_design(design_results):
        art_results = await run_parallel_tasks([
            {
                "subagent_type": "general-purpose",
                "description": "Generate player sprites",
                "prompt": f"""
You are the Asset Generator agent with Gemini Imagen 4 access.

Generate player character sprites based on:
{design_results['character_description']}

Art style: {design_results['art_style']}

Use the AssetGeneratorAgent class to generate:
1. Idle animation (4 frames)
2. Walk animation (6 frames)
3. Jump animation (3 frames)

Save to generated-assets/player/
"""
            },
            {
                "subagent_type": "general-purpose",
                "description": "Generate background art",
                "prompt": "..."
            }
        ])

    # Phase 3: 코드 생성
    code_results = await Task.run(
        subagent_type="general-purpose",
        description="Generate game code",
        prompt=f"""
You are the Code Generator agent.

Generate TypeScript code for:
- Player controller
- Enemy AI
- Collision system
- UI

Use @caisogames/ai-engine ECS architecture.
Design: {design_results}
Assets: {art_results}
"""
    )

    # Phase 4: QA
    qa_results = await Task.run(
        subagent_type="general-purpose",
        description="Run automated tests",
        prompt=f"""
You are the Test Executor agent.

Run Playwright tests on the built game:
{code_results['build_path']}

Execute all test cases and report bugs.
"""
    )

    # Phase 5: 배포
    if qa_results['all_passed']:
        deploy_result = await Task.run(
            subagent_type="general-purpose",
            description="Deploy game to Vercel",
            prompt="Deploy the game and return the live URL"
        )

        return deploy_result['url']
    else:
        # 버그 수정 루프
        await fix_bugs(qa_results['bugs'])
```

### 5.2 파일 시스템 통합

에이전트들이 Claude Code의 파일 도구를 사용:

```python
# 에이전트가 파일을 읽고 쓸 수 있음
async def generate_and_save_sprite(request: AssetRequest):
    """스프라이트 생성 및 저장"""

    # Gemini로 이미지 생성
    image = await gemini_imagen.generate(request.prompt)

    # Claude Code Write 도구 사용
    await claude_code.write_file(
        file_path=f"generated-assets/{request.category}/{request.name}.png",
        content=image.to_base64()
    )

    # 메타데이터도 저장
    await claude_code.write_file(
        file_path=f"generated-assets/{request.category}/{request.name}.json",
        content=json.dumps({
            "prompt": request.prompt,
            "model": "imagen-4.0",
            "timestamp": datetime.now().isoformat()
        })
    )
```

### 5.3 Git 통합

각 주요 단계마다 자동 커밋:

```python
async def commit_milestone(milestone: str, files: List[str]):
    """마일스톤 달성 시 자동 커밋"""

    await claude_code.bash(f"git add {' '.join(files)}")
    await claude_code.bash(f"""git commit -m "✨ {milestone}

Generated by CAISOGAMES V2 AI Agents

- Design: Approved
- Assets: {len(files)} files
- Quality: Validated
" """)
```

---

## 6. 품질 게이트 (Quality Gates)

각 단계마다 품질 기준을 통과해야 다음 단계 진행:

### 6.1 디자인 품질 게이트

```python
def validate_design(design: dict) -> bool:
    """디자인이 최소 기준을 충족하는지 검증"""

    checks = [
        design.get('core_loop') is not None,
        len(design.get('player_abilities', [])) >= 2,
        design.get('unique_mechanics') is not None,
        design.get('difficulty_curve') in ['gradual', 'steep', 'flat']
    ]

    return all(checks)
```

### 6.2 에셋 품질 게이트

```python
def validate_asset(asset: GeneratedAsset) -> bool:
    """에셋이 사용 가능한 품질인지 검증"""

    validation_result = StyleValidatorAgent.validate(asset)

    return (
        validation_result.overall_score >= 90 and
        validation_result.metrics['transparency'].score >= 85 and
        validation_result.approved_for_use
    )
```

### 6.3 코드 품질 게이트

```python
def validate_code(code: str) -> bool:
    """코드가 표준을 충족하는지 검증"""

    review = CodeReviewerAgent.review(code)

    return (
        review.overall_score >= 80 and
        len([i for i in review.issues if i.severity == 'error']) == 0 and
        review.metrics['complexity'] < 15
    )
```

### 6.4 테스트 품질 게이트

```python
def validate_qa(test_results: TestResults) -> bool:
    """테스트 통과 기준"""

    return (
        test_results.pass_rate >= 95 and
        test_results.critical_bugs == 0 and
        test_results.performance['fps'].average >= 55
    )
```

---

## 7. 확장성 및 유지보수 (Scalability & Maintenance)

### 7.1 새 에이전트 추가

새로운 전문 에이전트를 쉽게 추가 가능:

```python
# agents/marketing_team/seo_agent.py
class SEOAgent(BaseAgent):
    """게임 설명, 키워드, 메타데이터 생성"""

    async def generate_store_listing(self, game: Game) -> StoreListing:
        prompt = f"""
Generate an App Store / Itch.io listing for:

Game: {game.title}
Genre: {game.genre}
Description: {game.description}

Create:
1. Catchy title (max 30 chars)
2. Short description (max 80 chars)
3. Full description (max 500 words)
4. Keywords (10-15 keywords)
5. Feature highlights (5 bullet points)
"""

        listing = await self.gemini.generate_content(prompt)
        return listing
```

### 7.2 에이전트 버전 관리

에이전트 프롬프트 및 로직 버저닝:

```
agents/
├── design_team/
│   ├── concept_designer/
│   │   ├── v1.0/
│   │   │   └── prompts/
│   │   ├── v2.0/  # 개선된 버전
│   │   │   └── prompts/
│   │   └── current -> v2.0  # 심볼릭 링크
```

### 7.3 성능 모니터링

에이전트 실행 메트릭 수집:

```python
class AgentMetrics:
    agent_name: str
    execution_count: int
    avg_execution_time: float
    success_rate: float
    api_calls: int
    cost: float  # Gemini API 비용

# 대시보드에서 모니터링
dashboard.show_metrics([
    {"agent": "AssetGenerator", "calls": 142, "cost": "$2.34", "success": "94%"},
    {"agent": "CodeGenerator", "calls": 23, "cost": "$0.45", "success": "100%"},
])
```

---

## 8. 비용 최적화 (Cost Optimization)

### 8.1 API 호출 최소화

- 결과 캐싱 (동일 프롬프트 재사용 방지)
- 배치 처리 (여러 에셋 한 번에 생성)
- 프롬프트 최적화 (토큰 수 최소화)

```python
# 캐싱 예시
@lru_cache(maxsize=100)
async def generate_with_cache(prompt: str, model: str):
    """동일 프롬프트는 캐시된 결과 반환"""
    return await gemini_api.generate(prompt, model)
```

### 8.2 모델 선택 전략

- 간단한 작업: Gemini 2.0 Flash (저렴)
- 복잡한 작업: Gemini 2.0 Pro (고품질)
- 이미지 생성: Imagen 4 (최고 품질)

```python
def select_model(task_complexity: str) -> str:
    """작업 복잡도에 따라 최적 모델 선택"""

    if task_complexity == "simple":
        return "gemini-2.0-flash-exp"  # $0.075 / 1M tokens
    elif task_complexity == "complex":
        return "gemini-2.0-pro-exp"    # $1.25 / 1M tokens
    else:
        return "gemini-2.0-flash-exp"  # 기본값
```

---

## 9. 로드맵 (Implementation Roadmap)

### Phase 1: Foundation (1-2주)
- [ ] 기본 에이전트 프레임워크 구축
- [ ] PM Agent 및 이벤트 버스 구현
- [ ] Design Team 구현 (3개 서브 에이전트)
- [ ] 공유 컨텍스트 시스템

### Phase 2: Asset Pipeline (2-3주)
- [ ] Art Team 구현 (Asset Generator, Validator)
- [ ] Gemini Imagen 4 통합
- [ ] 투명 배경 처리 개선
- [ ] Animation Creator 구현

### Phase 3: Engineering (2주)
- [ ] AI 엔진 (`@caisogames/ai-engine`) 설계
- [ ] Code Generator 구현
- [ ] Code Reviewer 및 Optimizer 구현
- [ ] Debug Agent (Self-Healing)

### Phase 4: QA & Integration (1-2주)
- [ ] QA Team 구현 (Planner, Executor, Reporter)
- [ ] Integration Team 구현
- [ ] 빌드 파이프라인 자동화

### Phase 5: Production (1주)
- [ ] 첫 게임 재개발 (feeding-caiso-reborn)
- [ ] 전체 워크플로우 검증
- [ ] 성능 및 비용 최적화

---

## 10. 결론

CAISOGAMES V2의 멀티 에이전트 시스템은:

✅ **완전 자동화**: 사용자 요청 → 완성된 게임 (수동 개입 최소)
✅ **상업적 품질**: Gemini 최상위 모델로 프로페셔널 수준 리소스
✅ **확장 가능**: 새 에이전트 추가 및 기능 확장 용이
✅ **Self-Healing**: 버그 자동 탐지 및 수정
✅ **Claude Code 네이티브**: 개발 환경과 완벽 통합

다음 문서: **Agent Requirements Specification** (각 에이전트의 상세 요구사항)
