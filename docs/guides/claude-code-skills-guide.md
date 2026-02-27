# Claude Code 스킬 개발 가이드

게임 반복 개발을 위한 재사용 가능한 스킬 작성 방법

---

## 목차

1. [개요](#개요)
2. [스킬 vs 슬래시 커맨드](#스킬-vs-슬래시-커맨드)
3. [스킬 파일 구조](#스킬-파일-구조)
4. [게임 개발용 추천 스킬](#게임-개발용-추천-스킬)
5. [실전 예제](#실전-예제)
6. [베스트 프랙티스](#베스트-프랙티스)

---

## 개요

Claude Code의 **스킬(Skills)**과 **슬래시 커맨드(Slash Commands)**는 게임 개발 워크플로우를 자동화하고 표준화하는 강력한 도구입니다.

### 핵심 개념

- **스킬**: 자동으로 로드되어 Claude의 모든 응답에 영향을 주는 선언적 설정 파일
- **슬래시 커맨드**: 수동으로 호출하는 재사용 가능한 마크다운 프롬프트
- **Agent Skills 표준**: 여러 AI 도구에서 동작하는 오픈 스탠다드

### 왜 스킬을 사용해야 하나요?

- ✅ 반복 작업 자동화 (코드 리뷰, 테스트, 배포 등)
- ✅ 팀 컨벤션 통일 (코딩 스타일, 커밋 메시지, PR 템플릿)
- ✅ 개발 시간 단축 (잘 만든 스킬은 리뷰 시간 40% 감소)
- ✅ 에이전트 간 워크플로우 표준화

---

## 스킬 vs 슬래시 커맨드

### 스킬 (Skills)

**위치**: `.claude/skills/<skill-name>/SKILL.md`

**특징**:
- 자동으로 로드 (컨텍스트 기반)
- YAML frontmatter로 트리거 조건 정의
- 보조 파일 포함 가능 (템플릿, 예제 등)
- 더 복잡한 워크플로우에 적합

**예시**:
```markdown
---
name: game-design
description: Design a new game from user requirements
auto_trigger: true
keywords: ["game", "design", "concept", "mechanics"]
---

You are a game design expert. When the user requests a game design:

1. Analyze user requirements
2. Generate game concept using ConceptDesignerAgent
3. Validate design quality (score >= 70)
4. Save design to `games/<game-name>/design.json`
5. Print summary with key mechanics
```

### 슬래시 커맨드 (Slash Commands)

**위치**: `.claude/commands/<command-name>.md`

**특징**:
- 수동 호출 (`/command-name`)
- 간단한 마크다운 프롬프트
- 동적 인자 지원 (`$ARGUMENTS`)
- 빠른 실행에 적합

**예시**:
```markdown
Review the game design at `$ARGUMENTS` and provide feedback on:

1. Core loop completeness
2. Difficulty curve
3. Unique mechanics
4. Estimated playtime realism
5. Scope feasibility
```

### 선택 가이드

| 사용 사례 | 선택 |
|---------|------|
| 명시적 호출 필요 | 슬래시 커맨드 |
| 자동 적용 원함 | 스킬 |
| 단순 프롬프트 | 슬래시 커맨드 |
| 복잡한 워크플로우 | 스킬 |
| 보조 파일 필요 | 스킬 |

> **참고**: `.claude/commands/review.md`와 `.claude/skills/review/SKILL.md`는 모두 `/review` 커맨드를 생성하며 동일하게 작동합니다.

---

## 스킬 파일 구조

### 기본 구조

```
.claude/
├── skills/
│   ├── game-design/
│   │   ├── SKILL.md          # 메인 스킬 정의
│   │   ├── templates/
│   │   │   └── design.json   # 디자인 템플릿
│   │   └── examples/
│   │       └── platformer.json
│   ├── asset-generation/
│   │   ├── SKILL.md
│   │   └── prompts/
│   │       ├── sprite.txt
│   │       └── audio.txt
│   └── deploy-game/
│       └── SKILL.md
└── commands/
    ├── test.md
    └── review.md
```

### SKILL.md 템플릿

```markdown
---
name: skill-name
description: Short description for auto-loading
auto_trigger: true
keywords: ["keyword1", "keyword2"]
file_patterns: ["*.game.json", "design/*.json"]
---

# Skill Instructions

Detailed instructions for Claude when this skill is invoked.

## Steps

1. Step one
2. Step two
3. Step three

## Output Format

Expected output format...

## Examples

Example usage...
```

### YAML Frontmatter 필드

| 필드 | 설명 | 예시 |
|-----|------|------|
| `name` | 스킬 이름 (슬래시 커맨드명) | `game-design` |
| `description` | 자동 로딩 힌트 | `Design games from requirements` |
| `auto_trigger` | 자동 트리거 여부 | `true`, `false` |
| `keywords` | 트리거 키워드 | `["game", "design"]` |
| `file_patterns` | 파일 패턴 트리거 | `["*.game.json"]` |

---

## 게임 개발용 추천 스킬

### 1. 게임 디자인 스킬

**경로**: `.claude/skills/game-design/SKILL.md`

**용도**:
- 사용자 요청으로부터 게임 컨셉 생성
- ConceptDesignerAgent 통합
- 디자인 품질 검증
- JSON 스키마 출력

**트리거**: "게임 만들어줘", "create a game", "/game-design"

### 2. 에셋 생성 스킬

**경로**: `.claude/skills/generate-assets/SKILL.md`

**용도**:
- 스프라이트 생성 (이미지 생성 API)
- 오디오 생성 (오디오 생성 API)
- 병렬 생성으로 속도 향상
- 에셋 메타데이터 자동 저장

**트리거**: "generate sprites", "create audio", "/assets"

### 3. 게임 코드 생성 스킬

**경로**: `.claude/skills/implement-game/SKILL.md`

**용도**:
- 디자인 JSON에서 게임 로직 생성
- 엔진 API 통합 (Phaser, PixiJS 등)
- 에셋 로딩 코드 자동 생성
- 게임 루프 구현

**트리거**: "implement the game", "write game code", "/implement"

### 4. 테스트 & QA 스킬

**경로**: `.claude/skills/test-game/SKILL.md`

**용도**:
- 게임 플레이 테스트
- 성능 측정
- 버그 리포트 생성
- 회귀 테스트 자동화

**트리거**: "test the game", "/test"

### 5. 게임 배포 스킬

**경로**: `.claude/skills/deploy-game/SKILL.md`

**용도**:
- 빌드 프로세스 실행
- 에셋 최적화 (압축, 포맷 변환)
- 배포 플랫폼 업로드 (Vercel, Netlify 등)
- 배포 URL 생성

**트리거**: "deploy the game", "/deploy"

### 6. 디자인 리뷰 스킬

**경로**: `.claude/skills/review-design/SKILL.md`

**용도**:
- 디자인 품질 검증
- 스코프 리스크 평가
- 유니크 메카닉 검증
- 개선 제안 생성

**트리거**: "review design", "/review-design <file>"

### 7. 마일스톤 커밋 스킬

**경로**: `.claude/skills/milestone-commit/SKILL.md`

**용도**:
- 단계별 자동 커밋
- 표준화된 커밋 메시지
- 변경사항 요약
- Git 히스토리 관리

**트리거**: "commit milestone", "/commit <milestone>"

---

## 실전 예제

### 예제 1: 게임 디자인 스킬

**파일**: `.claude/skills/game-design/SKILL.md`

```markdown
---
name: game-design
description: Design a new game from user requirements using ConceptDesignerAgent
auto_trigger: true
keywords: ["game", "design", "concept", "create game", "make game"]
---

# Game Design Skill

당신은 CAISOGAMES V2의 게임 디자인 전문가입니다.

## 작업 프로세스

사용자가 게임 제작을 요청하면 다음 단계를 수행합니다:

### 1. 요구사항 분석
- 사용자 요청에서 장르, 메카닉, 타겟 플레이어 파악
- 불명확한 부분은 질문으로 명확히 하기

### 2. ConceptDesignerAgent 실행
```python
from agents.design_team.concept_designer.agent import ConceptDesignerAgent

agent = ConceptDesignerAgent()
concept = agent.design_concept(
    user_request="<사용자 요청>",
    genre="<파악한 장르>",
    platform="web"
)
```

### 3. 디자인 품질 검증
- 품질 점수 >= 70 확인
- 코어 루프 3단계 이상
- 플레이어 능력 2개 이상
- 유니크 메카닉 존재 확인

### 4. 디자인 저장
```bash
mkdir -p games/<game-name>
# Write concept to games/<game-name>/design.json
```

### 5. 요약 출력
사용자에게 다음 정보를 보여줍니다:
- 게임 제목 & 태그라인
- 코어 루프 (3-5 단계)
- 주요 플레이어 능력 (2-5개)
- 유니크 메카닉
- 예상 플레이 타임
- 품질 점수

## 출력 형식

```
🎮 게임 디자인 완료!

📌 제목: <title>
💬 태그라인: <tagline>

🔁 코어 루프:
   1. <step 1>
   2. <step 2>
   3. <step 3>

⚡ 플레이어 능력:
   • <ability 1>: <description>
   • <ability 2>: <description>

✨ 유니크 메카닉:
   • <mechanic 1>
   • <mechanic 2>

⏱️  예상 플레이 타임: <X> 분
⭐ 품질 점수: <score>/100

💾 저장 위치: games/<game-name>/design.json
```

## 다음 단계 제안

디자인 완료 후 사용자에게 제안:
- `/assets`: 게임 에셋 생성 (스프라이트, 오디오)
- `/implement`: 게임 코드 구현
- `/review-design`: 디자인 품질 재검토
```

---

### 예제 2: 에셋 생성 스킬

**파일**: `.claude/skills/generate-assets/SKILL.md`

```markdown
---
name: generate-assets
description: Generate game sprites and audio from design JSON
auto_trigger: false
keywords: ["assets", "sprites", "audio", "generate"]
file_patterns: ["**/design.json"]
---

# Asset Generation Skill

게임 디자인으로부터 스프라이트와 오디오 에셋을 생성합니다.

## 작업 프로세스

### 1. 디자인 JSON 읽기
```bash
# Read games/<game-name>/design.json
```

### 2. 에셋 리스트 생성
디자인에서 필요한 에셋 식별:
- **스프라이트**: 플레이어, 적, 배경, UI 요소
- **오디오**: BGM, 효과음 (점프, 공격, 아이템 획득 등)

### 3. 병렬 생성 (Claude Code Task 도구)
```python
assets = await claude_code.run_parallel_tasks([
    {
        "subagent_type": "general-purpose",
        "description": "Generate sprites",
        "prompt": f"Generate pixel art sprites for: {sprite_list}"
    },
    {
        "subagent_type": "general-purpose",
        "description": "Generate audio",
        "prompt": f"Generate 8-bit audio for: {audio_list}"
    }
])
```

### 4. 에셋 저장
```
games/<game-name>/assets/
├── sprites/
│   ├── player.png
│   ├── enemy1.png
│   └── background.png
├── audio/
│   ├── bgm.mp3
│   └── jump.wav
└── manifest.json
```

### 5. manifest.json 생성
```json
{
  "sprites": [
    {
      "id": "player",
      "path": "sprites/player.png",
      "width": 32,
      "height": 32
    }
  ],
  "audio": [
    {
      "id": "bgm",
      "path": "audio/bgm.mp3",
      "duration": 120
    }
  ]
}
```

## 출력 형식

```
🎨 에셋 생성 완료!

📦 스프라이트 (<N>개):
   ✅ player.png (32x32)
   ✅ enemy1.png (64x64)
   ✅ background.png (800x600)

🎵 오디오 (<N>개):
   ✅ bgm.mp3 (2:00)
   ✅ jump.wav (0:01)
   ✅ attack.wav (0:01)

💾 저장 위치: games/<game-name>/assets/
📄 매니페스트: games/<game-name>/assets/manifest.json
```

## 다음 단계

- `/implement`: 게임 코드 작성 (에셋 로딩 포함)
- `/preview-sprites`: 스프라이트 미리보기
```

---

### 예제 3: 마일스톤 커밋 슬래시 커맨드

**파일**: `.claude/commands/commit.md`

```markdown
Commit the current game development milestone with a standardized message.

## Milestone: $ARGUMENTS

### Steps

1. Run `git status` to check changes
2. Run `git diff` to review changes
3. Add relevant files:
   - `games/<game-name>/design.json` (if changed)
   - `games/<game-name>/assets/**` (if generated)
   - `games/<game-name>/src/**` (if implemented)
4. Create commit with message:

```
✨ <Milestone>

Generated by CAISOGAMES V2 AI Agents

Changes:
- <summary of changes>

Milestone: $ARGUMENTS
Quality: Validated
```

5. Print commit summary with SHA

## Output Format

```
📝 커밋 완료!

🔖 Milestone: <milestone>
📋 Commit SHA: <sha>
📁 Files: <N> files changed

변경 내역:
- <change 1>
- <change 2>

✅ 커밋 메시지:
<commit message>
```
```

**사용법**:
```bash
/commit "Phase 1: Design Complete"
/commit "Phase 2: Assets Generated"
/commit "Phase 3: Game Implemented"
```

---

### 예제 4: 게임 구현 스킬

**파일**: `.claude/skills/implement-game/SKILL.md`

```markdown
---
name: implement-game
description: Implement game code from design and assets
auto_trigger: false
keywords: ["implement", "code", "game code", "write code"]
---

# Game Implementation Skill

디자인과 에셋으로부터 게임 코드를 생성합니다.

## 전제 조건

다음 파일들이 존재해야 합니다:
- `games/<game-name>/design.json`
- `games/<game-name>/assets/manifest.json`

## 작업 프로세스

### 1. 디자인 & 에셋 로드
```bash
# Read design.json and manifest.json
```

### 2. 게임 엔진 선택
디자인의 복잡도에 따라 엔진 선택:
- **Simple**: 바닐라 Canvas API
- **Medium**: PixiJS
- **Complex**: Phaser 3

### 3. 프로젝트 구조 생성
```
games/<game-name>/src/
├── index.html
├── game.js
├── entities/
│   ├── Player.js
│   ├── Enemy.js
│   └── Collectible.js
├── systems/
│   ├── Physics.js
│   ├── Collision.js
│   └── Input.js
└── utils/
    ├── AssetLoader.js
    └── GameState.js
```

### 4. 코어 게임 로직 구현

#### 4.1 AssetLoader
```javascript
class AssetLoader {
  async loadManifest() {
    const manifest = await fetch('../assets/manifest.json').then(r => r.json());
    return manifest;
  }

  async loadAssets(manifest) {
    // Load sprites and audio
  }
}
```

#### 4.2 Player 클래스
디자인의 `playerAbilities`를 메서드로 구현:
```javascript
class Player {
  constructor(x, y, sprite) {
    this.x = x;
    this.y = y;
    this.sprite = sprite;
    // Initialize abilities from design
  }

  // Ability 1: Jump
  jump() { /* ... */ }

  // Ability 2: Attack
  attack() { /* ... */ }
}
```

#### 4.3 게임 루프
디자인의 `coreLoop`를 게임 루프에 구현:
```javascript
class Game {
  update(deltaTime) {
    // 1. Handle input
    this.input.update();

    // 2. Update entities
    this.player.update(deltaTime);
    this.enemies.forEach(e => e.update(deltaTime));

    // 3. Check collisions
    this.collision.checkAll();

    // 4. Update game state
    this.gameState.update();
  }

  render() {
    // Render all entities
  }
}
```

### 5. 승리/패배 조건 구현
디자인의 `winConditions`와 `loseConditions` 구현

### 6. 테스트 코드 생성
```javascript
// tests/game.test.js
describe('Game Core Loop', () => {
  test('Player can jump', () => { /* ... */ });
  test('Collision detection works', () => { /* ... */ });
  test('Win condition triggers', () => { /* ... */ });
});
```

## 출력 형식

```
💻 게임 구현 완료!

📁 생성된 파일 (<N>개):
   ✅ index.html
   ✅ game.js
   ✅ entities/Player.js
   ✅ entities/Enemy.js
   ✅ systems/Physics.js
   ✅ systems/Collision.js

🎮 구현된 기능:
   ✅ 코어 루프: <step 1> → <step 2> → <step 3>
   ✅ 플레이어 능력: <ability 1>, <ability 2>
   ✅ 승리 조건: <win condition>
   ✅ 패배 조건: <lose condition>

🧪 테스트:
   ✅ <N>개 테스트 케이스 생성

📂 위치: games/<game-name>/src/
```

## 다음 단계

- `/test`: 게임 테스트 실행
- `/preview`: 브라우저에서 게임 미리보기
- `/deploy`: 게임 배포
```

---

## 베스트 프랙티스

### 1. 스킬 설계 원칙

#### 단일 책임 원칙
각 스킬은 하나의 명확한 목적을 가져야 합니다.

❌ **나쁜 예**:
```markdown
---
name: do-everything
description: Design, generate assets, implement, test, and deploy game
---
```

✅ **좋은 예**:
```markdown
---
name: game-design
description: Design game concept from requirements
---

---
name: generate-assets
description: Generate sprites and audio from design
---

---
name: implement-game
description: Implement game code from design and assets
---
```

#### 명확한 인터페이스
스킬의 입력과 출력을 명확히 정의합니다.

```markdown
## 입력
- 필수: `games/<game-name>/design.json`
- 선택: `--style pixel-art` 플래그

## 출력
- `games/<game-name>/assets/sprites/*.png`
- `games/<game-name>/assets/manifest.json`
```

#### 에러 핸들링
예상 가능한 에러 상황을 명시합니다.

```markdown
## 에러 처리

### 디자인 파일 없음
```
❌ Error: design.json not found
💡 Tip: Run `/game-design` first to create design
```

### 품질 점수 미달
```
⚠️  Warning: Design quality score is 65/100 (threshold: 70)
❓ Continue anyway? (y/n)
```
```

---

### 2. 재사용성 높이기

#### 템플릿 활용
공통 패턴은 템플릿으로 분리합니다.

```
.claude/skills/game-design/
├── SKILL.md
└── templates/
    ├── platformer-design.json
    ├── shooter-design.json
    └── puzzle-design.json
```

스킬에서 템플릿 참조:
```markdown
Use the template at `templates/<genre>-design.json` as a starting point.
```

#### 변수와 플레이스홀더
동적 값은 변수로 처리합니다.

```markdown
## Variables

- `$GAME_NAME`: Name of the game (from design.json)
- `$ASSETS_DIR`: Path to assets directory (`games/$GAME_NAME/assets`)
- `$ENGINE`: Game engine (phaser, pixi, or canvas)

## Example

Generate game code for `$GAME_NAME` using `$ENGINE`:
```
// Load assets from $ASSETS_DIR
const assetLoader = new AssetLoader('$ASSETS_DIR');
```
```

---

### 3. 에이전트 통합

#### Task 도구로 병렬 실행
여러 에이전트를 동시에 실행하여 속도를 향상시킵니다.

```markdown
## 병렬 디자인 단계

Use Claude Code Task tool to run design agents in parallel:

```python
design_results = await claude_code.run_parallel_tasks([
    {
        "subagent_type": "general-purpose",
        "description": "Design game concept",
        "prompt": "You are ConceptDesignerAgent. Design: ..."
    },
    {
        "subagent_type": "general-purpose",
        "description": "Design game levels",
        "prompt": "You are LevelDesignerAgent. Design: ..."
    },
    {
        "subagent_type": "general-purpose",
        "description": "Write game narrative",
        "prompt": "You are NarrativeDesignerAgent. Write: ..."
    }
])
```
```

#### 에이전트 컨텍스트 공유
이전 단계의 출력을 다음 에이전트에 전달합니다.

```markdown
### 컨텍스트 전달

1. ConceptDesigner 실행 → `concept.json`
2. `concept.json`을 LevelDesigner에 전달:
   ```python
   prompt = f"""
   You are LevelDesignerAgent.

   Based on this concept:
   {json.dumps(concept, indent=2)}

   Design 3 progressive levels.
   """
   ```
```

---

### 4. 품질 관리

#### 검증 체크리스트
스킬 실행 후 품질을 검증합니다.

```markdown
## 품질 검증

실행 완료 후 다음을 확인합니다:

- [ ] 디자인 품질 점수 >= 70
- [ ] 코어 루프 3단계 이상
- [ ] 유니크 메카닉 존재
- [ ] JSON 스키마 유효성
- [ ] 파일 저장 성공
- [ ] 에러 없음
```

#### 테스트 자동화
각 스킬에 테스트 케이스를 포함합니다.

```markdown
## 테스트

스킬 개발 후 다음 명령으로 테스트:

```bash
# Test game-design skill
/game-design "platformer with a cat"

# Expected output:
# - games/cat-platformer/design.json exists
# - Quality score >= 70
# - Core loop has 3+ steps
```
```

---

### 5. 문서화

#### 사용 예제 제공
각 스킬에 실제 사용 예제를 포함합니다.

```markdown
## 사용 예제

### 예제 1: 플랫포머 게임 디자인

```bash
/game-design "Create a pixel art platformer where you play as a ninja"
```

**출력**:
- 게임 제목: "Shadow Ninja"
- 장르: Platformer
- 코어 루프: Run → Jump → Attack → Collect
- 플레이어 능력: Double Jump, Shuriken, Wall Climb
- 품질 점수: 85/100

### 예제 2: 슈팅 게임 디자인

```bash
/game-design "Space shooter with bullet hell mechanics"
```

**출력**:
- 게임 제목: "Cosmic Fury"
- 장르: Shoot 'em up
- 코어 루프: Move → Shoot → Dodge → Power-up
- 유니크 메카닉: Time-slow ability, Pattern-based boss fights
- 품질 점수: 78/100
```

#### 트러블슈팅 가이드
흔한 문제와 해결 방법을 문서화합니다.

```markdown
## 트러블슈팅

### 문제: "design.json not found"
**원인**: 디자인 단계를 건너뜀
**해결**: `/game-design` 먼저 실행

### 문제: 품질 점수가 너무 낮음 (< 70)
**원인**: 디자인이 너무 단순하거나 불완전함
**해결**:
1. 더 구체적인 게임 요청 제공
2. `/review-design`로 피드백 받기
3. 디자인 수정 후 재실행

### 문제: 에셋 생성 실패
**원인**: API 키 미설정 또는 할당량 초과
**해결**:
1. `GEMINI_API_KEY` 환경 변수 확인
2. API 할당량 체크
3. 에셋 수 줄이기 (스프라이트 5개 이하)
```

---

### 6. 성능 최적화

#### 병렬 처리 활용
독립적인 작업은 병렬로 실행합니다.

```markdown
## 성능 최적화

### Before (순차 실행 - 느림)
```python
sprites = generate_sprites(design)  # 30초
audio = generate_audio(design)      # 20초
# Total: 50초
```

### After (병렬 실행 - 빠름)
```python
results = await claude_code.run_parallel_tasks([
    generate_sprites_task,
    generate_audio_task
])
# Total: 30초 (가장 긴 작업 기준)
```

#### 캐싱 활용
반복 작업은 결과를 캐싱합니다.

```markdown
## 캐싱

디자인이 변경되지 않았다면 재사용:

```python
cache_key = f"{game_name}_{design_hash}"
if cache_exists(cache_key):
    print("✅ Using cached design")
    return load_cache(cache_key)
```
```

---

## 추가 자료

### 공식 문서
- [Claude Code 공식 문서](https://code.claude.com/docs)
- [Agent Skills 표준](https://github.com/anthropics/agent-skills)

### 커뮤니티 리소스
- [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code) - 스킬, 훅, 플러그인 모음
- [Claude Code 커스터마이제이션 가이드](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/)

### 참고 프로젝트
- CAISOGAMES V2 에이전트: `agents/design_team/`
- 기존 통합 가이드: `docs/guides/claude-code-integration.md`
- 엔진 API 스펙: `docs/engine/engine-api-spec.md`

---

**문서 버전**: 1.0
**최종 수정**: 2026-02-27
**작성자**: CAISOGAMES V2 개발팀
