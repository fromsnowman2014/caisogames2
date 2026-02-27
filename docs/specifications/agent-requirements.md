# Agent Requirements Specification

## 문서 개요

본 문서는 CAISOGAMES V2 멀티 에이전트 시스템의 각 에이전트에 대한 상세 요구사항을 정의합니다. 각 에이전트의 입출력 인터페이스, 프롬프트 템플릿, API 사용, 품질 기준, 에러 처리 등을 포함합니다.

---

## 1. Project Manager Agent

### 1.1 기본 정보

| 항목 | 내용 |
|------|------|
| 에이전트명 | ProjectManagerAgent |
| 타입 | Orchestrator |
| 우선순위 | Critical |
| 의존성 | 모든 팀 에이전트 |

### 1.2 책임 및 역할

**주요 책임:**
1. 사용자 요구사항을 구체적인 작업으로 분해
2. 팀별 작업 할당 및 우선순위 결정
3. 에이전트 간 의존성 관리
4. 품질 게이트 검증
5. 프로젝트 컨텍스트 유지
6. 진행 상황 모니터링 및 보고

**성공 기준:**
- 모든 팀이 명확한 작업 지시를 받음
- 의존성이 올바른 순서로 해결됨
- 품질 게이트 100% 통과
- 사용자 요구사항 100% 반영

### 1.3 입력 인터페이스

```typescript
interface PMAgentInput {
  // 사용자 요청
  userRequest: {
    description: string;           // "픽셀 아트 스타일의 플랫포머 게임"
    genre?: string;                // "platformer", "puzzle", etc.
    targetPlatform: string[];      // ["web", "desktop", "mobile"]
    constraints?: {
      maxDevelopmentTime?: number; // 시간 제약 (hours)
      budget?: number;               // API 비용 제약 (USD)
      technicalStack?: string[];    // ["TypeScript", "Phaser", etc.]
    };
  };

  // 참조 정보 (선택사항)
  references?: {
    similarGames?: string[];       // 참조할 게임 이름
    artStyleReference?: string;    // 이미지 URL 또는 설명
    designDocument?: string;       // 기존 디자인 문서 (있는 경우)
  };

  // 프로젝트 설정
  projectConfig: {
    projectName: string;
    version: string;               // Semantic versioning
    targetAudience: string;        // "casual gamers", "kids 8-12", etc.
  };
}
```

### 1.4 출력 인터페이스

```typescript
interface PMAgentOutput {
  // 프로젝트 플랜
  projectPlan: {
    phases: Phase[];
    totalEstimatedTime: number;    // hours
    estimatedCost: number;         // USD
    milestones: Milestone[];
  };

  // 팀별 작업 지시
  teamAssignments: {
    designTeam: DesignTeamTask[];
    artTeam: ArtTeamTask[];
    engineeringTeam: EngineeringTeamTask[];
    qaTeam: QATeamTask[];
    integrationTeam: IntegrationTeamTask[];
  };

  // 프로젝트 컨텍스트 (공유 상태)
  sharedContext: ProjectContext;

  // 진행 상황
  status: {
    currentPhase: string;
    completedMilestones: string[];
    nextActions: string[];
  };
}

interface Phase {
  id: string;
  name: string;                    // "Design", "Asset Creation", etc.
  status: "pending" | "in_progress" | "completed" | "blocked";
  dependencies: string[];          // 의존하는 Phase ID들
  estimatedDuration: number;       // hours
  qualityGate: QualityGate;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate?: string;
  deliverables: string[];
  completionCriteria: string[];
}
```

### 1.5 프롬프트 템플릿

**초기 분석 프롬프트:**
```
You are the Project Manager for an AI-powered game development team.

USER REQUEST:
{user_request}

TEAM CAPABILITIES:
- Design Team: Game concept, level design, narrative
- Art Team: Sprites, backgrounds, UI, animations, audio
- Engineering Team: Code generation, optimization, debugging
- QA Team: Automated testing, bug reporting
- Integration Team: Building, packaging, deployment

YOUR TASKS:
1. Analyze the user request and extract key requirements
2. Break down into concrete, actionable tasks
3. Assign tasks to appropriate teams
4. Determine dependencies and execution order
5. Estimate time and cost
6. Define quality gates for each phase

OUTPUT FORMAT: JSON following PMAgentOutput schema

IMPORTANT:
- Be realistic about time estimates
- Consider API costs (Gemini calls)
- Ensure all dependencies are explicit
- Define clear acceptance criteria
```

**진행 상황 모니터링 프롬프트:**
```
CURRENT PROJECT STATE:
{project_context}

COMPLETED WORK:
{completed_tasks}

PENDING WORK:
{pending_tasks}

ANALYZE:
1. Are we on track? (timeline, budget)
2. Any blockers or risks?
3. Quality gates passed?
4. Next immediate actions?

If issues detected, propose solutions.
Output as JSON.
```

### 1.6 API 사용

| API | 용도 | 예상 호출 수 | 비용 |
|-----|------|--------------|------|
| Gemini 2.0 Flash | 요구사항 분석, 작업 분해 | 2-3 per project | ~$0.01 |
| Gemini 2.0 Flash | 진행 상황 모니터링 | 5-10 per project | ~$0.02 |

**총 예상 비용:** ~$0.03 per project

### 1.7 품질 기준

**성공 기준:**
- [ ] 모든 팀 작업이 명확히 정의됨
- [ ] 의존성 그래프에 순환 참조 없음
- [ ] 각 Phase에 품질 게이트 정의됨
- [ ] 시간/비용 추정치가 합리적 범위 내

**검증 방법:**
```python
def validate_project_plan(plan: PMAgentOutput) -> ValidationResult:
    issues = []

    # 순환 의존성 검사
    if has_circular_dependencies(plan.projectPlan.phases):
        issues.append("Circular dependency detected in phases")

    # 품질 게이트 확인
    for phase in plan.projectPlan.phases:
        if not phase.qualityGate:
            issues.append(f"Phase {phase.name} missing quality gate")

    # 비용 합리성 검사
    if plan.projectPlan.estimatedCost > 50:  # $50 초과 시 경고
        issues.append("Estimated cost exceeds $50, review API usage")

    return ValidationResult(
        passed=len(issues) == 0,
        issues=issues
    )
```

### 1.8 에러 처리

| 에러 유형 | 처리 방법 |
|-----------|-----------|
| 모호한 사용자 요청 | 사용자에게 명확화 요청 (추가 질문) |
| 불가능한 제약사항 | 대안 제시 (예: 시간 연장, 기능 축소) |
| 팀 응답 타임아웃 | 재시도 (최대 3회), 실패 시 사용자 알림 |
| 품질 게이트 실패 | 해당 팀에 피드백 전달 및 재작업 지시 |

### 1.9 Claude Code 통합

```python
from typing import List, Dict
import asyncio

class ProjectManagerAgent:
    def __init__(self, gemini_api_key: str):
        self.gemini = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.context = ProjectContext()

    async def orchestrate(self, user_input: PMAgentInput) -> PMAgentOutput:
        """메인 오케스트레이션 로직"""

        # 1. 요구사항 분석
        analysis = await self._analyze_request(user_input)

        # 2. 작업 분해 및 할당
        plan = await self._create_project_plan(analysis)

        # 3. 검증
        validation = self.validate_plan(plan)
        if not validation.passed:
            plan = await self._refine_plan(plan, validation.issues)

        # 4. 컨텍스트 초기화
        self.context.initialize(plan)

        # 5. Phase별 실행
        for phase in plan.projectPlan.phases:
            if phase.status == "pending":
                await self._execute_phase(phase)

        return plan

    async def _execute_phase(self, phase: Phase):
        """개별 Phase 실행 (Claude Code Task 도구 활용)"""

        if phase.name == "Design":
            # Design Team 활성화 (병렬 실행)
            design_results = await self._run_parallel_claude_tasks([
                {
                    "subagent_type": "general-purpose",
                    "description": "Design game concept",
                    "prompt": self._build_concept_design_prompt()
                },
                {
                    "subagent_type": "general-purpose",
                    "description": "Design game levels",
                    "prompt": self._build_level_design_prompt()
                },
                {
                    "subagent_type": "general-purpose",
                    "description": "Write game narrative",
                    "prompt": self._build_narrative_prompt()
                }
            ])

            # 품질 게이트 검증
            if not self._validate_quality_gate(phase, design_results):
                raise QualityGateFailure(f"Design quality gate failed")

            # 컨텍스트 업데이트
            self.context.update({"design": design_results})

        elif phase.name == "Asset Creation":
            # Art Team 활성화
            art_results = await self._run_art_team()
            self.context.update({"assets": art_results})

        # ... 다른 Phase들

    async def _run_parallel_claude_tasks(self, tasks: List[Dict]) -> List[Any]:
        """Claude Code의 Task 도구로 병렬 실행"""

        # NOTE: 실제로는 Claude Code의 Task 도구 사용
        # 여기서는 개념적 구현
        results = await asyncio.gather(*[
            self._call_claude_task(task) for task in tasks
        ])

        return results
```

---

## 2. Design Team Agents

### 2.1 Concept Designer Agent

#### 2.1.1 기본 정보

| 항목 | 내용 |
|------|------|
| 에이전트명 | ConceptDesignerAgent |
| 타입 | Design Specialist |
| 우선순위 | High |
| 의존성 | None (최초 실행 에이전트) |

#### 2.1.2 입력 인터페이스

```typescript
interface ConceptDesignerInput {
  userRequest: string;             // 사용자 요청 원문
  genre?: string;                  // 장르 힌트
  targetAudience: string;
  references?: {
    similarGames?: string[];
    mechanicsToInclude?: string[]; // "double jump", "wall slide"
  };
}
```

#### 2.1.3 출력 인터페이스

```typescript
interface ConceptDesignerOutput {
  concept: {
    title: string;                 // 게임 제목
    genre: string;                 // "platformer", "puzzle", etc.
    tagline: string;               // 한 줄 설명
    coreLoop: string[];            // ["Move", "Jump", "Collect", "Win"]

    playerAbilities: Ability[];
    progressionSystem: {
      type: "linear" | "open_world" | "hub_based";
      unlockMechanism: string;     // "level_completion", "collectibles"
    };

    mechanics: {
      primary: string[];           // 핵심 메카닉
      secondary: string[];         // 보조 메카닉
      unique: string[];            // 차별화 요소
    };

    difficultyCurve: {
      type: "gradual" | "steep" | "flat";
      description: string;
    };

    winCondition: string;
    loseCondition: string;

    estimatedPlaytime: number;     // minutes
  };

  designRationale: string;         // 왜 이렇게 설계했는지 설명
  referenceGames: string[];        // 영감을 받은 게임들
}

interface Ability {
  id: string;
  name: string;
  description: string;
  unlockCondition?: string;
  cooldown?: number;               // seconds
}
```

#### 2.1.4 프롬프트 템플릿

```
You are an Expert Game Designer with 15+ years experience in [GENRE] games.

USER REQUEST:
{user_request}

TARGET AUDIENCE: {target_audience}
REFERENCE GAMES: {reference_games}

DESIGN A COMPELLING GAME CONCEPT:

1. CORE GAMEPLAY LOOP (3-5 steps)
   - Define the repeating cycle of actions
   - Must be engaging and clear
   - Examples: "Explore → Fight → Collect → Upgrade → Repeat"

2. PLAYER ABILITIES
   - Start with 2-3 basic abilities
   - Plan 2-4 unlockable abilities
   - Each ability should feel impactful
   - Ensure abilities combine well (synergy)

3. UNIQUE MECHANICS (What makes this game special?)
   - 1-3 innovative mechanics not commonly seen
   - Must enhance core loop
   - Should be easy to learn, hard to master

4. DIFFICULTY CURVE
   - How does challenge progress?
   - When are new mechanics introduced?
   - Boss/checkpoint placement strategy

5. WIN/LOSE CONDITIONS
   - Clear, measurable goals
   - Fair and achievable

CONSTRAINTS:
- Must be implementable in 2-4 weeks
- Suitable for {target_platform}
- Budget-conscious (reusable assets preferred)

OUTPUT: JSON following ConceptDesignerOutput schema

EXAMPLES OF GREAT DESIGN:
- Celeste: Tight controls + gradual difficulty + forgiving checkpoints
- Hollow Knight: Exploration + skill progression + optional challenges
- Baba Is You: Unique mechanic (rule manipulation) defines entire game
```

#### 2.1.5 품질 기준

```python
def validate_concept(concept: ConceptDesignerOutput) -> ValidationResult:
    issues = []

    # 핵심 루프 검증
    if len(concept.concept.coreLoop) < 3:
        issues.append("Core loop too simple (need 3+ steps)")

    # 능력 밸런스
    if len(concept.concept.playerAbilities) < 2:
        issues.append("Too few player abilities (need 2+)")

    # 유니크 메카닉 검증
    if not concept.concept.mechanics.unique:
        issues.append("No unique mechanics defined")

    # 플레이 타임 합리성
    if concept.concept.estimatedPlaytime < 5:
        issues.append("Playtime too short (< 5 min)")
    elif concept.concept.estimatedPlaytime > 120:
        issues.append("Playtime too long (> 2 hours, scope creep risk)")

    return ValidationResult(
        passed=len(issues) == 0,
        score=max(0, 100 - len(issues) * 10),
        issues=issues
    )
```

---

### 2.2 Level Designer Agent

#### 2.2.1 입력 인터페이스

```typescript
interface LevelDesignerInput {
  gameConcept: ConceptDesignerOutput;  // 컨셉 디자이너 결과
  numberOfLevels: number;              // 생성할 레벨 수
  artStyleConstraints?: {
    maxPlatformVarieties: number;      // 플랫폼 타입 종류
    maxEnemyVarieties: number;         // 적 종류
  };
}
```

#### 2.2.2 출력 인터페이스

```typescript
interface LevelDesignerOutput {
  levels: Level[];
  difficultyProgression: {
    curve: "linear" | "exponential" | "stepped";
    description: string;
  };
  totalEstimatedPlaytime: number;      // minutes
}

interface Level {
  id: string;
  name: string;
  difficulty: number;                  // 1-10 scale
  theme: string;                       // "forest", "cave", "castle"

  layout: {
    width: number;                     // pixels
    height: number;                    // pixels
    backgroundLayers: BackgroundLayer[];
    platforms: Platform[];
    enemies: Enemy[];
    collectibles: Collectible[];
    hazards: Hazard[];
    checkpoint?: Checkpoint;
    goal: Goal;
  };

  mechanics: {
    introduced: string[];              // 이 레벨에서 처음 등장하는 메카닉
    required: string[];                // 클리어에 필요한 메카닉
  };

  estimatedCompletionTime: string;     // "2-3 minutes"
  skillRequirements: string[];         // ["basic_jump", "wall_slide"]
  optionalChallenges?: Challenge[];    // 숨겨진 요소, 타임어택 등
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "ground" | "floating" | "moving" | "breakable";
  properties?: {
    movePattern?: "horizontal" | "vertical" | "circular";
    moveSpeed?: number;
    moveRange?: number;
  };
}

interface Enemy {
  x: number;
  y: number;
  type: string;                        // "slime", "bat", "spike_ball"
  behavior: "patrol" | "chase" | "stationary";
  patrolRange?: number;
  health?: number;
}

interface Collectible {
  x: number;
  y: number;
  type: "coin" | "gem" | "powerup";
  value: number;
  required: boolean;                   // 클리어에 필수인가?
}
```

#### 2.2.3 프롬프트 템플릿

```
You are an Expert Level Designer specializing in [GENRE] games.

GAME CONCEPT:
{game_concept}

DESIGN {number_of_levels} LEVELS:

LEVEL DESIGN PRINCIPLES:
1. **Progressive Difficulty**
   - Level 1: Tutorial (introduce 1-2 mechanics)
   - Level 2-3: Practice (combine mechanics)
   - Level 4+: Mastery (challenging combinations)

2. **Pacing**
   - Mix intense sections with breather moments
   - Place checkpoints before difficult segments
   - Collectibles guide player attention

3. **Teach Through Play**
   - Introduce mechanics in safe environment
   - Gradually increase complexity
   - Optional challenges for skilled players

4. **Visual Flow**
   - Use platforms to guide player path
   - Enemies placed to create interesting decisions
   - Hazards telegraph danger clearly

FOR EACH LEVEL, DEFINE:
- Layout (platform positions, enemy placement)
- Difficulty rating (1-10)
- Mechanics required to complete
- Estimated completion time
- Optional challenges (hidden collectibles, speedrun paths)

CONSTRAINTS:
- Level width: 2000-5000px (scrolling platformer)
- Level height: 600-1200px
- Max platforms per level: 30
- Max enemies per level: 15

OUTPUT: JSON following LevelDesignerOutput schema

REFERENCE EXAMPLES:
- Celeste Level 1: Safe tutorial, introduces jump + dash
- Super Meat Boy: Short levels, tight challenges, instant respawn
- Hollow Knight: Exploration focus, hidden paths reward curiosity
```

#### 2.2.4 레벨 검증 로직

```python
def validate_level(level: Level, concept: ConceptDesignerOutput) -> ValidationResult:
    issues = []

    # 플랫폼 도달 가능성 검증
    if not is_goal_reachable(level.layout):
        issues.append(f"Goal in {level.name} is unreachable")

    # 난이도 급증 방지
    if level.difficulty > prev_level.difficulty + 2:
        issues.append(f"Difficulty spike too steep in {level.name}")

    # 메카닉 점진적 도입 확인
    new_mechanics = set(level.mechanics.introduced)
    if len(new_mechanics) > 2:
        issues.append(f"Too many new mechanics in {level.name} ({len(new_mechanics)})")

    # 플레이 타임 합리성
    estimated_actions = (
        len(level.layout.platforms) * 2 +  # 점프 횟수
        len(level.layout.enemies) * 3 +    # 적 회피 시간
        len(level.layout.collectibles) * 1  # 수집 시간
    )
    expected_time = estimated_actions * 0.5  # 각 액션 0.5초 가정

    if expected_time < 30:  # 30초 미만
        issues.append(f"{level.name} too short (< 30s)")
    elif expected_time > 300:  # 5분 초과
        issues.append(f"{level.name} too long (> 5min)")

    return ValidationResult(
        passed=len(issues) == 0,
        issues=issues
    )

def is_goal_reachable(layout: Layout) -> bool:
    """간단한 도달 가능성 검사 (BFS)"""
    # 플레이어 시작 위치에서 목표 위치까지 플랫폼을 따라 도달 가능한지 확인
    # 실제 구현 시 물리 엔진 시뮬레이션 필요
    pass
```

---

### 2.3 Narrative Designer Agent

*(간결성을 위해 핵심만 기술)*

#### 입력
- `gameConcept`: 게임 컨셉
- `levels`: 레벨 정보

#### 출력
```typescript
interface NarrativeOutput {
  worldSetting: {
    name: string;
    description: string;
    lore: string;                      // 배경 스토리
  };

  characters: {
    protagonist: Character;
    npcs: Character[];
    antagonist?: Character;
  };

  dialogue: {
    tutorial: string[];
    levelIntros: { [levelId: string]: string };
    npcLines: { [npcId: string]: string[] };
  };

  storyBeats?: {                       // 선택적 스토리 이벤트
    opening: string;
    midpoint: string;
    climax: string;
    resolution: string;
  };
}

interface Character {
  name: string;
  description: string;
  personality: string[];
  motivation: string;
  backstory?: string;
}
```

#### 품질 기준
- 세계관이 게임 메카닉과 일관성 있음
- 대사가 간결하고 명확함 (모바일에서 읽기 쉬움)
- 캐릭터 개성이 뚜렷함

---

## 3. Art Team Agents

### 3.1 Asset Generator Agent

#### 3.1.1 기본 정보

| 항목 | 내용 |
|------|------|
| 에이전트명 | AssetGeneratorAgent |
| 타입 | Creative AI |
| 우선순위 | Critical |
| API | Gemini Imagen 4 |
| 의존성 | Design Team 완료 후 |

#### 3.1.2 입력 인터페이스

```typescript
interface AssetGeneratorInput {
  assetRequests: AssetRequest[];
  styleGuide: StyleGuide;
  projectContext: ProjectContext;
}

interface AssetRequest {
  id: string;
  category: "sprite" | "background" | "ui" | "icon" | "vfx";
  name: string;
  description: string;
  size: { width: number; height: number };
  purpose: string;                     // "player character", "enemy", etc.
  animationFrames?: number;            // 애니메이션용
  variants?: number;                   // 색상/스타일 변형 수
}

interface StyleGuide {
  artStyle: "pixel_art" | "hand_drawn" | "low_poly" | "realistic";
  colorPalette: string[];              // Hex colors
  pixelDensity?: string;               // "16x16", "32x32"
  referenceImage?: string;             // URL or base64
  mood: string;                        // "cheerful", "dark", "mysterious"
  constraints: {
    maxColors?: number;
    noText: boolean;
    transparentBackground: boolean;
  };
}
```

#### 3.1.3 출력 인터페이스

```typescript
interface AssetGeneratorOutput {
  generatedAssets: GeneratedAsset[];
  summary: {
    totalAssets: number;
    successCount: number;
    failedCount: number;
    totalIterations: number;
    totalCost: number;                 // USD
  };
}

interface GeneratedAsset {
  requestId: string;
  status: "success" | "failed";

  // 성공 시
  image?: {
    path: string;                      // 저장 경로
    format: "png" | "webp";
    size: { width: number; height: number };
    fileSize: number;                  // bytes
  };

  metadata: {
    prompt: string;
    model: string;
    iterations: number;
    bestIteration: number;
    qualityScore: number;
    generationTime: number;            // seconds
  };

  // 실패 시
  error?: {
    message: string;
    reason: string;
  };
}
```

#### 3.1.4 Imagen 4 프롬프트 빌더

```python
class AssetGeneratorAgent:
    STYLE_TEMPLATES = {
        "pixel_art": """
Style: 16-bit retro pixel art game sprite

Technical requirements:
- Sharp pixel edges (NO anti-aliasing, NO blur)
- Limited color palette: {palette_size} colors maximum
- Pixel-perfect details (no smooth gradients)
- Clean, readable silhouette
- Centered composition on WHITE background

Visual style:
- Retro game aesthetic (SNES/Genesis era)
- Each pixel intentional and crisp
- Flat colors with minimal dithering
- Strong outlines for clarity

Subject positioning:
- Perfectly centered in frame
- Appropriate size for {size}px canvas
- Clear spacing from edges
- Isolated subject (no environmental elements)
""",

        "hand_drawn": """
Style: Hand-drawn 2D game illustration

Art direction:
- Bold, confident outlines (2-3px thick)
- Flat color fills with subtle shading
- Vibrant, saturated color palette
- Cartoon/anime-inspired proportions
- Expressive, dynamic poses

Technical requirements:
- Vector-art quality (clean edges)
- White background for transparency extraction
- No textures or patterns
- Clear visual hierarchy

Mood: {mood}
""",

        # ... 다른 스타일들
    }

    def build_prompt(self, request: AssetRequest, style_guide: StyleGuide) -> str:
        """상세 프롬프트 생성"""

        base_style = self.STYLE_TEMPLATES[style_guide.artStyle].format(
            palette_size=style_guide.constraints.maxColors or 32,
            size=request.size.width,
            mood=style_guide.mood
        )

        # 카테고리별 추가 지침
        category_specific = self._get_category_instructions(request.category)

        # 색상 팔레트 힌트
        color_hint = ""
        if style_guide.colorPalette:
            color_hint = f"\nColor palette to use: {', '.join(style_guide.colorPalette)}"

        # 최종 프롬프트 조합
        full_prompt = f"""
Create a {request.category} for a {style_guide.artStyle} style game.

SUBJECT: {request.description}
PURPOSE: {request.purpose}

{base_style}

{category_specific}

{color_hint}

CRITICAL REQUIREMENTS:
- White (#FFFFFF) background ONLY (for transparency)
- No text, no UI elements, no watermarks
- Production-quality, commercial-grade artwork
- Perfectly centered subject
- Clean, game-ready asset

Negative prompt: text, words, letters, watermark, signature, complex background,
gradient background, multiple subjects, blur, soft edges, low quality
"""

        return full_prompt.strip()

    def _get_category_instructions(self, category: str) -> str:
        instructions = {
            "sprite": """
Sprite-specific requirements:
- Character should face RIGHT (standard game convention)
- Neutral pose (T-pose or idle stance)
- Limbs clearly separated (for animation rigging)
- Proportions consistent for pixel grid
- Maximum visual clarity at small sizes
""",

            "background": """
Background-specific requirements:
- Horizontal composition (landscape orientation)
- Depth suggestion (foreground, midground, background elements)
- Tileable edges if pattern-based
- Low detail density (won't distract from gameplay)
- Atmospheric perspective for depth
""",

            "ui": """
UI element requirements:
- High contrast for readability
- Consistent visual language (matches other UI)
- Clear affordances (buttons look clickable)
- Scalable design (works at multiple sizes)
- Game-appropriate aesthetic
""",

            # ... 기타 카테고리
        }

        return instructions.get(category, "")
```

#### 3.1.5 반복 개선 루프

```python
async def generate_with_refinement(
    self,
    request: AssetRequest,
    style_guide: StyleGuide,
    max_iterations: int = 5
) -> GeneratedAsset:
    """품질 기준 충족까지 반복 생성"""

    best_asset = None
    best_score = 0

    for iteration in range(1, max_iterations + 1):
        # 프롬프트 생성 (이전 피드백 반영)
        if iteration == 1:
            prompt = self.build_prompt(request, style_guide)
        else:
            prompt = self.improve_prompt(prompt, previous_feedback)

        # Imagen 4로 생성
        image = await self.imagen_api.generate(
            prompt=prompt,
            size=(request.size.width, request.size.height),
            aspect_ratio="1:1",
            negative_prompt=self._build_negative_prompt(style_guide)
        )

        # 품질 검증
        validation = await self.validator.validate(image, style_guide)

        logger.info(f"Iteration {iteration}: Score {validation.overall_score}")

        # 최고 점수 추적
        if validation.overall_score > best_score:
            best_score = validation.overall_score
            best_asset = image

        # 목표 달성 시 조기 종료
        if validation.overall_score >= 90:
            logger.info(f"Quality threshold reached at iteration {iteration}")
            break

        # 다음 iteration을 위한 피드백
        previous_feedback = validation.improvement_suggestions

    # 투명 배경 처리
    final_image = self._extract_transparency(best_asset)

    # 저장
    save_path = f"generated-assets/{request.category}/{request.name}.png"
    self._save_image(final_image, save_path)

    return GeneratedAsset(
        requestId=request.id,
        status="success",
        image={
            "path": save_path,
            "format": "png",
            "size": request.size,
            "fileSize": os.path.getsize(save_path)
        },
        metadata={
            "prompt": prompt,
            "model": "imagen-4.0-generate-001",
            "iterations": iteration,
            "bestIteration": iteration,
            "qualityScore": best_score,
            "generationTime": time.time() - start_time
        }
    )
```

#### 3.1.6 비용 최적화

| 전략 | 구현 | 예상 절감 |
|------|------|-----------|
| 프롬프트 캐싱 | 동일 프롬프트 재사용 방지 | ~20% |
| 조기 종료 | 품질 90 도달 시 즉시 중단 | ~30% |
| 배치 생성 | 유사 에셋 동시 생성 | ~15% |
| 모델 선택 | 간단한 아이콘은 Flash 모델 | ~40% |

---

### 3.2 Style Validator Agent

*(핵심만 요약)*

#### 역할
생성된 이미지의 품질 및 스타일 일관성 검증

#### 검증 항목
1. **스타일 일관성** (25%): 아트 스타일 가이드 준수
2. **기술적 품질** (20%): 해상도, 선명도
3. **투명도** (20%): 배경 제거 품질
4. **게임 적합성** (20%): 크기, 가독성
5. **구도** (15%): 중앙 정렬, 실루엣

#### Gemini Vision 활용
```python
async def validate(self, image: Image, style_guide: StyleGuide) -> ValidationResult:
    prompt = f"""
Analyze this game asset against the style guide:

STYLE GUIDE:
- Art style: {style_guide.artStyle}
- Color palette: {style_guide.colorPalette}
- Mood: {style_guide.mood}

EVALUATE (score 0-100 each):
1. Style Consistency: Does it match the required art style?
2. Technical Quality: Sharp edges, clean lines, appropriate detail level?
3. Transparency: Is background fully removed (white bg → alpha)?
4. Game Fit: Appropriate size, readable at game resolution?
5. Composition: Centered, clear silhouette, good spacing?

For each metric:
- Numeric score (0-100)
- Brief feedback (1-2 sentences)
- Improvement suggestions if score < 90

Overall pass threshold: 90/100

Output as JSON: {{
  "overall_score": number,
  "passed": boolean,
  "metrics": {{
    "style_consistency": {{"score": number, "feedback": string}},
    ...
  }},
  "improvement_suggestions": [string]
}}
"""

    response = await self.gemini_vision.generate_content([prompt, image])
    return self._parse_validation(response.text)
```

---

### 3.3 Animation Creator Agent

#### 역할
스프라이트 애니메이션 프레임 생성 및 일관성 유지

#### 핵심 기능
1. **프레임 생성**: 각 애니메이션 동작별 프레임 생성
2. **일관성 검증**: 프레임 간 스타일/비율 유지 확인
3. **스프라이트 시트 조립**: 모든 프레임을 하나의 이미지로 병합
4. **메타데이터 생성**: 애니메이션 설정 (FPS, 루프 등)

#### 입력
```typescript
interface AnimationRequest {
  characterSprite: string;             // 베이스 스프라이트 경로
  animations: AnimationDefinition[];
}

interface AnimationDefinition {
  name: string;                        // "idle", "walk", "jump"
  frames: number;                      // 프레임 수
  description: string;                 // "character walking right"
  fps: number;                         // 애니메이션 속도
  loop: boolean;
}
```

#### 프레임 일관성 검증
```python
async def verify_frame_consistency(self, frames: List[Image]) -> bool:
    """Gemini Vision으로 프레임 간 일관성 체크"""

    prompt = """
Analyze these animation frames for consistency:

CHECK:
1. Character proportions identical across all frames
2. Color palette exactly the same
3. Line thickness/style uniform
4. Pixel density consistent (no scaling artifacts)
5. Smooth motion flow (no jarring transitions)

Rate consistency: 0-100
List any inconsistencies found.
"""

    response = await self.gemini_vision.generate_content([prompt] + frames)
    result = json.loads(response.text)

    return result['consistency_score'] >= 85
```

---

### 3.4 Audio Designer Agent

#### V2 개선사항
- V1: Web Audio API 코드만 생성
- V2: 실제 오디오 파일 생성 (WAV/MP3)

#### 구현 전략

**Option 1: Gemini + External Audio API**
```python
class AudioDesignerAgent:
    def __init__(self, gemini_key: str, audio_api_key: str):
        self.gemini = genai.GenerativeModel('gemini-2.0-flash-exp')
        # 외부 오디오 생성 API (예: Stable Audio, MusicLM)
        self.audio_api = StableAudioAPI(audio_api_key)

    async def generate_sfx(self, request: SFXRequest) -> AudioFile:
        # Step 1: Gemini로 사운드 디자인 파라미터 생성
        design_params = await self.gemini.generate_content(f"""
Design parameters for game sound effect: {request.description}

Category: {request.category}  # ui, gameplay, feedback
Duration: {request.duration}ms
Style: {request.style}  # retro, modern, realistic

Provide as JSON:
{{
  "sound_type": "beep|whoosh|impact|etc",
  "frequency_range": "low|mid|high",
  "envelope": {{"attack": 0.01, "decay": 0.1, "sustain": 0.5, "release": 0.2}},
  "effects": ["reverb", "distortion", ...],
  "description_for_audio_api": "8-bit coin collect sound, bright and cheerful"
}}
""")

        params = json.loads(design_params.text)

        # Step 2: 외부 API로 실제 오디오 생성
        audio = await self.audio_api.generate(
            description=params['description_for_audio_api'],
            duration=request.duration / 1000,  # ms to seconds
            style=request.style
        )

        return audio
```

**Option 2: Procedural 생성 (코드 기반)**
```python
# V1 방식 유지하되, 실제 실행하여 WAV 파일 생성
async def generate_procedural_sfx(self, request: SFXRequest) -> AudioFile:
    # Gemini로 Web Audio API 코드 생성
    code = await self.gemini.generate_content(f"""
Generate Web Audio API code for: {request.description}
Output JavaScript function only.
""")

    # Node.js 환경에서 실행하여 WAV 파일 생성
    wav_file = await self.execute_webaudio_code(code, request.duration)

    return AudioFile(path=wav_file, format="wav")
```

---

## 4. Engineering Team Agents

### 4.1 Code Generator Agent

#### 역할
AI 엔진 기반 게임 코드 자동 생성

#### 핵심 원칙
1. **ECS 아키텍처**: Entity-Component-System 패턴 강제
2. **AI 엔진 API 우선**: 직접 Canvas 조작 금지
3. **타입 안전성**: TypeScript strict mode
4. **가독성**: 주석 및 명확한 변수명

#### 입력
```typescript
interface CodeGeneratorInput {
  gameConcept: ConceptDesignerOutput;
  levels: Level[];
  assets: AssetManifest;               // 생성된 에셋 목록
  targetEngine: "@caisogames/ai-engine";
}
```

#### 출력
```typescript
interface CodeGeneratorOutput {
  files: {
    [filePath: string]: string;        // 파일 경로 → 코드 내용
  };

  entities: EntityDefinition[];
  systems: SystemDefinition[];
  components: ComponentDefinition[];

  buildConfig: {
    entry: string;
    dependencies: string[];
  };
}
```

#### 프롬프트 템플릿 (ECS 강제)

```
You are an Expert Game Programmer specializing in ECS (Entity-Component-System) architecture.

GAME CONCEPT:
{game_concept}

ASSETS AVAILABLE:
{asset_manifest}

ENGINE: @caisogames/ai-engine

GENERATE TYPESCRIPT CODE:

1. ENTITIES
   - Define all game entities (player, enemies, items, etc.)
   - Use ONLY engine-provided components
   - No custom components (engine handles everything)

2. SYSTEMS
   - Movement system (player controls, enemy AI)
   - Physics system (gravity, collision)
   - Render system (sprite drawing)
   - Animation system (sprite frame changes)

3. GAME LOGIC
   - Initialization (load assets, create entities)
   - Game loop (update systems each frame)
   - Win/lose conditions

AVAILABLE COMPONENTS (from AI Engine):
- Transform: position, rotation, scale
- Sprite: texture, animations
- Physics: velocity, gravity, collider
- PlayerController: moveSpeed, jumpForce
- Enemy: behavior, patrol, health
- Collectible: value, collected state

AVAILABLE SYSTEMS (from AI Engine):
- MovementSystem: handles player input
- PhysicsSystem: applies gravity, detects collisions
- RenderSystem: draws sprites to canvas
- AnimationSystem: updates sprite frames

CODE STRUCTURE:
```typescript
// src/entities/player.ts
import { Engine, Component } from '@caisogames/ai-engine';

export function createPlayer(x: number, y: number) {
  const player = Engine.createEntity('player');

  player.addComponent(Component.Transform, {
    position: { x, y },
    scale: { x: 1, y: 1 }
  });

  player.addComponent(Component.Sprite, {
    texture: 'assets/player/idle.png',
    animations: {
      idle: { frames: [0, 1, 2, 3], fps: 8 },
      walk: { frames: [4, 5, 6, 7], fps: 12 }
    }
  });

  player.addComponent(Component.Physics, {
    velocity: { x: 0, y: 0 },
    gravity: 980,
    collider: { type: 'box', width: 32, height: 64 }
  });

  player.addComponent(Component.PlayerController, {
    moveSpeed: 200,
    jumpForce: 400
  });

  return player;
}
```

REQUIREMENTS:
- Clean, readable TypeScript
- Comments explaining non-obvious logic
- Type-safe (no `any` types)
- Performance-optimized (no nested loops)
- Follow engine conventions

OUTPUT: Complete project file structure as JSON
{{
  "files": {{
    "src/main.ts": "...",
    "src/entities/player.ts": "...",
    ...
  }}
}}
```

#### 코드 검증

```python
def validate_generated_code(code: str) -> ValidationResult:
    issues = []

    # ECS 패턴 준수 확인
    if "canvas.getContext" in code:
        issues.append("Direct canvas manipulation forbidden (use Engine.render)")

    if "class" in code and "extends Entity" not in code:
        issues.append("Custom classes forbidden (use engine components)")

    # TypeScript 타입 체크
    try:
        result = subprocess.run(
            ["npx", "tsc", "--noEmit", "--strict"],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            issues.append(f"TypeScript errors: {result.stderr}")
    except Exception as e:
        issues.append(f"Type check failed: {str(e)}")

    # 복잡도 체크
    complexity = calculate_cyclomatic_complexity(code)
    if complexity > 15:
        issues.append(f"Code too complex (complexity: {complexity})")

    return ValidationResult(
        passed=len(issues) == 0,
        issues=issues
    )
```

---

### 4.2 Code Reviewer Agent

*(요약)*

#### 검토 항목
1. **코드 품질** (30%): 가독성, 유지보수성
2. **성능** (25%): 알고리즘 효율성
3. **보안** (20%): 잠재적 취약점
4. **베스트 프랙티스** (25%): 패턴 준수

#### 자동 수정 제안
```python
async def review_and_suggest_fix(self, code: str) -> ReviewResult:
    prompt = f"""
Review this game code and suggest improvements:

CODE:
{code}

ANALYZE:
1. Performance issues (nested loops, unnecessary recalculations)
2. Code smells (magic numbers, duplicated code)
3. Security vulnerabilities
4. Best practice violations

For each issue:
- Severity: error|warning|info
- Location: file:line
- Description
- Fixed code snippet

Output as JSON.
"""

    review = await self.gemini.generate_content(prompt)
    return self._parse_review(review.text)
```

---

### 4.3 Performance Optimizer Agent

#### 최적화 영역
1. **렌더링**: 스프라이트 배칭, 프러스텀 컬링
2. **물리**: 공간 분할 (Spatial Hashing)
3. **에셋**: 텍스처 압축, 아틀라스
4. **로딩**: 지연 로딩, 프리로딩

---

### 4.4 Debug Agent

#### Self-Healing 워크플로우

```python
async def auto_fix_bug(self, error: RuntimeError) -> BugFix:
    # 1. 에러 컨텍스트 수집
    context = self._gather_error_context(error)

    # 2. 근본 원인 분석
    analysis = await self.gemini.generate_content(f"""
Analyze this game crash:

ERROR: {error.message}
STACK: {error.stack}
CODE: {context.code}

Determine:
1. Root cause
2. Why it occurred
3. How to fix (minimal change)
4. Prevention strategy

Output as JSON.
""")

    # 3. 자동 핫픽스 생성
    fix = await self.gemini.generate_content(f"""
Generate code fix based on analysis:
{analysis}

Requirements:
- Minimal change (fix only, no refactor)
- Add validation if needed
- Include explanatory comment

Output fixed code section only.
""")

    # 4. 자동 적용 및 테스트
    await self._apply_fix(error.location, fix)
    test_passed = await self._run_regression_test()

    return BugFix(
        applied=True,
        test_passed=test_passed,
        fix_code=fix
    )
```

---

## 5. QA Team Agents

*(간결화)*

### 5.1 Test Planner
- 기능별 테스트 케이스 자동 생성
- 엣지 케이스 식별
- 커버리지 목표 설정

### 5.2 Test Executor
- Playwright 기반 자동화
- 시각적 회귀 테스트 (스크린샷 비교)
- 성능 측정 (FPS, 로딩 시간)

### 5.3 Bug Reporter
- 버그 구조화 보고
- 재현 단계 정리
- 우선순위 분류

---

## 6. Integration Team Agents

### 6.1 Build Manager
- 에셋 컴파일
- 코드 번들링 (Vite/Webpack)
- 멀티 플랫폼 빌드

### 6.2 Asset Compiler
- 스프라이트 시트 조립
- 텍스처 아틀라스 생성
- 오디오 압축

### 6.3 Deploy Agent
- Vercel/Netlify 배포
- Itch.io 업로드
- 버전 관리

---

## 7. 공통 요구사항

### 7.1 모든 에이전트가 준수해야 할 사항

1. **로깅**: 모든 주요 작업 로깅
2. **에러 처리**: 명확한 에러 메시지
3. **타임아웃**: 무한 대기 방지 (30s timeout)
4. **재시도**: 일시적 실패 시 최대 3회 재시도
5. **비용 추적**: API 호출 비용 기록

### 7.2 프롬프트 작성 가이드라인

1. **명확성**: 작업이 명확히 정의됨
2. **예시**: 좋은 출력 예시 포함
3. **제약사항**: 기술적/비즈니스 제약 명시
4. **출력 포맷**: JSON 스키마 제공
5. **품질 기준**: 성공 기준 명시

### 7.3 품질 게이트 템플릿

```python
class QualityGate:
    def __init__(self, name: str, criteria: List[Criterion]):
        self.name = name
        self.criteria = criteria

    def evaluate(self, output: Any) -> GateResult:
        results = [c.check(output) for c in self.criteria]

        return GateResult(
            passed=all(r.passed for r in results),
            score=sum(r.score for r in results) / len(results),
            details=results
        )

# 사용 예시
design_quality_gate = QualityGate("Design Quality", [
    Criterion("Has core loop", lambda d: len(d.coreLoop) >= 3),
    Criterion("Unique mechanic", lambda d: bool(d.mechanics.unique)),
    Criterion("Playtime reasonable", lambda d: 5 <= d.estimatedPlaytime <= 120)
])
```

---

## 8. 다음 단계

이 명세서를 바탕으로 다음 문서를 작성합니다:

1. **Image Generator Implementation Guide**: Imagen 4 통합 상세 가이드
2. **Audio Generator Implementation Guide**: 오디오 생성 상세 가이드
3. **Claude Code Integration Guide**: Claude Code 활용 패턴
4. **Orchestration Workflow**: 전체 워크플로우 다이어그램
5. **Development Setup Manual**: 개발 환경 구축 가이드

---

**문서 버전**: 1.0
**최종 수정**: 2026-02-27
**작성자**: CAISOGAMES V2 Architecture Team
