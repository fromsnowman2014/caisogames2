# CAISOGAMES V2: AI-Driven Game Generation Architecture (Version 2 Design Document)

Caiso Games 1 (Archive): https://github.com/fromsnowman2014/CAISOGAMES

## 1. 개요 및 비전 (Overview & Vision)
CAISOGAMES V2의 핵심 목적은 단순한 게임 개발 플랫폼을 넘어, **Agent와 Gemini API Key를 활용해 극도로 고도화된 "완전 자동화 팩토리"**를 구축하는 것입니다. 
기존 V1에서는 각각의 게임이 파편화된 코드와 제한적인 그래픽으로 만들어졌으나, V2에서는 **AI 에이전트들이 스스로 게임 기획, 고품질 리소스 생성, 프로그래밍 및 디버깅을 수행할 수 있는 완벽한 뼈대(Engine & Architecture)와 에이전트(Agents)**를 설계합니다.

초기에는 이 '안정적인 AI 게임 개발 상태'를 확립하는 데 총력을 기울이며, 이후 기존 게임들의 컨셉을 흡수하여 실제 판매가 가능할 수준(Commercial Grade)의 **오래된 명작(Classic Masterpiece) 수준으로 완전히 재창조**하는 것이 궁극적인 목표입니다.

---

## 2. 코어 아키텍처: 멀티 에이전트 협업 시스템 (Multi-Agent Collaboration System)

완벽한 게임을 자동으로 찍어내기 위해, V2 아키텍처는 **계층적 조직 구조(Hierarchical Organization)**와 **에이전트 간 협업(Inter-Agent Collaboration)**을 통해 Claude Agent Teams와 Gemini API를 결합합니다.

### 2.1 조직 구조

```
PROJECT MANAGER AGENT (Orchestrator)
├── DESIGN TEAM
│   ├── Concept Designer (게임 메카닉 설계)
│   ├── Level Designer (레벨 구조 설계)
│   └── Narrative Designer (스토리 작성)
├── ART TEAM
│   ├── Asset Generator (Imagen 4로 스프라이트 생성)
│   ├── Style Validator (Gemini Vision으로 품질 검증)
│   ├── Animation Creator (스프라이트 애니메이션)
│   └── Audio Designer (효과음/BGM 생성)
├── ENGINEERING TEAM
│   ├── Code Generator (ECS 기반 게임 로직)
│   ├── Code Reviewer (품질 검증)
│   ├── Performance Optimizer (최적화)
│   └── Debug Agent (Self-Healing 버그 수정)
├── QA TEAM
│   ├── Test Planner (테스트 케이스 생성)
│   ├── Test Executor (Playwright 자동화)
│   └── Bug Reporter (버그 리포팅)
└── INTEGRATION TEAM
    ├── Build Manager (빌드 생성)
    ├── Asset Compiler (에셋 최적화)
    └── Deploy Agent (Vercel 배포)
```

### 2.2 핵심 개선사항 (V1 → V2)

| 기능 | V1 | V2 |
|------|-----|-----|
| **에이전트 구조** | 독립적, 파편화 | 계층적 조직, PM이 조율 |
| **이미지 품질** | 휴리스틱 검증 | Gemini Vision으로 실제 분석 |
| **투명 배경** | 흰 배경 → 사후 제거 | Imagen 4 네이티브 투명도 |
| **오디오** | 코드만 생성 | 실제 WAV/MP3 파일 생성 |
| **코드 품질** | 수동 리뷰 | 자동 리뷰 + Self-Healing |
| **테스트** | 랜덤 클릭 | 목표 지향적 시나리오 |
| **비용** | ~$0.15 per game | ~$0.08 per game (최적화) |

### 2.3 워크플로우 (Prompt-to-Game)

```
사용자 요청: "픽셀 아트 플랫포머 게임"
    ↓
PM Agent → 요구사항 분석 및 작업 분해
    ↓
Design Team (병렬) → 컨셉/레벨/스토리 설계
    ↓ (품질 게이트: 디자인 검증)
Art Team (병렬) → 에셋 생성 + 품질 검증
    ↓ (품질 게이트: 에셋 품질 > 90)
Engineering Team (병렬) → 코드 생성 + 리뷰 + 최적화
    ↓ (품질 게이트: 코드 품질 > 80)
Integration Team → 빌드 생성
    ↓ (품질 게이트: 빌드 성공)
QA Team → 자동화 테스트
    ├─ PASS → Deploy Team → Vercel 배포
    └─ FAIL → Debug Agent → 자동 수정 → 다시 QA
    ↓
✅ 완성된 게임 URL
```

**상세 문서:**
- [Multi-Agent System Architecture](./architecture/multi-agent-system.md)
- [Agent Requirements Specification](./specifications/agent-requirements.md)
- [Orchestration Workflow](./workflows/orchestration-workflow.md)

---

## 3. 안정적인 AI 최적화 게임 엔진 (`@caisogames/ai-engine`)

AI 에이전트가 코드를 최소한으로 작성하면서도 버그 없이 상업적 품질의 게임을 만들 수 있도록, 프레임워크 자체를 극한으로 추상화하고 안정화합니다.

> **⚠️ 상세 API 명세**: [`docs/engine/engine-api-spec.md`](./engine/engine-api-spec.md) 참조 (엔진 개발의 Source of Truth)

### 3.1. Data-Driven & ECS (Entity-Component-System)
- 에이전트들이 복잡한 스파게티 코드를 짜는 것을 방지.
- 게임 요소를 데이터(JSON/Component)로만 정의하면 코어 엔진 System이 자동 처리 → AI 환각(Hallucination) 오류 최소화.
- **내장 컴포넌트**: `Transform`, `Sprite`, `Physics`, `PlayerController`, `Enemy`, `Collectible`, `Trigger`, `Camera`
- **내장 시스템**: `MovementSystem`, `PhysicsSystem`, `CollisionSystem`, `RenderSystem`, `AnimationSystem`, `AudioSystem`

### 3.2. 에이전트 친화적 API (Agent-Friendly API)
에이전트가 사용할 수 있는 최상위 API는 아래처럼 단순해야 합니다:

```typescript
// 엔티티 생성 (AI가 생성하는 코드의 전형적 패턴)
const player = Engine.createEntity('player');
player.addComponent(Component.Transform,  { position: { x: 100, y: 500 } });
player.addComponent(Component.PlayerController, { moveSpeed: 200, jumpForce: 400 });
player.addComponent(Component.Sprite, { texture: 'assets/player.png' });

// 이벤트/파티클 (한 줄 내장 API)
Engine.Particle.emit('jump_dust', { x: 100, y: 500 });
Engine.Audio.play('jump_sfx');
Engine.Camera.shake({ intensity: 0.5, duration: 200 });
```

- 충돌 처리, 중력 계산, 카메라 셰이크 등 상용 게임 필수 연출 전부 내장(Built-in).
- Code Generator Agent는 **내장 컴포넌트와 내장 API만 사용**하도록 프롬프트 제약 → 커스텀 코드 최소화.

### 3.3. 엔진 안정성 원칙
- **에이전트 코드는 엔진 내부를 건드리지 않는다**: 모든 게임 로직은 `games/` 폴더에서 엔진 API를 소비만 함.
- **타입 안전성**: TypeScript strict mode로 런타임 오류 사전 차단.
- **성능 기준**: 60 FPS @ Chrome (Canvas 2D 기준, 스프라이트 500개 이하 씬 기준).

---

## 4. V2 디렉토리/폴더 구조 (AI-First Directory Structure)

```text
CAISOGAMES_V2/
├── package.json                    # 모노레포 워크스페이스 설정
├── docs/                           # 📚 아키텍처 및 기획 문서
│   ├── design_document.md          # 메인 디자인 문서 (이 문서)
│   ├── architecture/               # 아키텍처 상세 문서
│   │   └── multi-agent-system.md  # 멀티 에이전트 시스템 상세
│   ├── specifications/             # 요구사항 명세
│   │   └── agent-requirements.md  # 각 에이전트 상세 명세
│   ├── guides/                     # 구현 가이드
│   │   ├── image-generator-guide.md
│   │   ├── audio-generator-guide.md
│   │   ├── claude-code-integration.md
│   │   └── development-setup.md
│   └── workflows/                  # 워크플로우 문서
│       └── orchestration-workflow.md
│
├── agents/                         # 🤖 AI 에이전트 시스템
│   ├── project_manager/            # PM Agent (오케스트레이터)
│   ├── design_team/                # 디자인 팀
│   │   ├── concept_designer/
│   │   ├── level_designer/
│   │   └── narrative_designer/
│   ├── art_team/                   # 아트 팀
│   │   ├── asset_generator/        # Imagen 4 통합
│   │   ├── style_validator/        # Gemini Vision 검증
│   │   ├── animation_creator/
│   │   └── audio_designer/
│   ├── engineering_team/           # 엔지니어링 팀
│   │   ├── code_generator/         # ECS 코드 생성
│   │   ├── code_reviewer/
│   │   ├── optimizer/
│   │   └── debug_agent/            # Self-Healing
│   ├── qa_team/                    # QA 팀
│   │   ├── test_planner/
│   │   ├── test_executor/          # Playwright 통합
│   │   └── bug_reporter/
│   ├── integration_team/           # 통합 팀
│   │   ├── build_manager/
│   │   ├── asset_compiler/
│   │   └── deploy_agent/
│   └── shared/                     # 공용 유틸리티
│       ├── llm.py                  # Gemini API 클라이언트
│       ├── event_bus.py            # 에이전트 간 통신
│       └── context.py              # 프로젝트 컨텍스트 관리
│
├── packages/                       # 📦 공용 프레임워크
│   ├── ai-engine/                  # `@caisogames/ai-engine`
│   │   ├── src/
│   │   │   ├── core/               # ECS 코어
│   │   │   ├── components/         # 내장 컴포넌트
│   │   │   └── systems/            # 내장 시스템
│   │   └── package.json
│   ├── ui-system/                  # 공통 UI 라이브러리
│   └── asset-pipeline/             # 에셋 처리 파이프라인
│
├── generated-assets/               # 🎨 생성된 에셋 저장소
│   ├── sprites/
│   ├── backgrounds/
│   ├── ui/
│   └── audio/
│
└── games/                          # 🎮 완성된 게임들
    ├── feeding-caiso-reborn/       # V1 게임 재개발 버전
    └── caiso-mario-reborn/
```

**구조 설계 원칙:**
1. **분리된 관심사**: 각 에이전트는 독립된 디렉토리
2. **공유 컨텍스트**: `shared/` 디렉토리에서 공통 로직 관리
3. **명확한 계층**: Team → Specialist Agent → Implementation
4. **문서 우선**: `docs/`에 모든 설계 문서 중앙 관리

---

## 5. 명작 레벨 재개발 전략 (Commercial Masterpiece Re-development)

시스템의 안정적인 개발 상태가 확인된 이후, V1 게임 컨셉의 해부를 바탕으로 상업 수준의 게임을 재창조합니다.

### 5.0 V1 게임 분석 (What We Keep / What We Replace)

| 게임 | 유지할 컨셉 | 폐기할 것 | V2에서 추가할 것 |
|------|------------|----------|----------------|
| **feeding-caiso** | 음식을 먹여서 캐릭터를 키우는 핵심 루프 | 단일 `index.html` 구조, 임시 플레이스홀더 그래픽 | 스테이지/보스전 구조, 픽셀아트 스프라이트, BGM |
| **caiso-mario** | 횡스크롤 플랫포머, 점프 메카닉 | 180KB 단일 파일, 하드코딩된 레벨 | TileMap 기반 레벨, 정교한 물리 조작감, 적 AI 패턴 |

### 5.1 공통 재개발 기준

1. **상업적 퀄리티(Commercial Grade)의 그래픽**
   - 기존 Programmer Art 및 임시 리소스 전면 폐기.
   - Gemini 최상위 모델(Imagen 4)로 일관된 아트 스타일의 **완전한 스프라이트 시트** 생성.
   - 최소 해상도: 캐릭터 64×64px, 배경 1920×1080px 타일.
2. **완벽한 조작감과 피드백 (Perfect Polish)**
   - 화면 흔들림, 타격 임팩트, 점프 포물선, 코요테 타임(절벽 점프 유예) 등 "Game Feel" 요소 전부 구현.
   - 효과음 타격 타이밍은 프레임 단위로 조정 (Audio Designer Agent 담당).
3. **심도 깊은 시나리오 추가**
   - 단순 아케이드 룰을 넘어 Gemini Narrative Agent가 작성하는 텍스트 스토리와 NPC 대사 추가.
   - 오프닝 컷씬, 레벨 인트로, 엔딩 구성.

### 5.2 품질 수락 기준 (Definition of Done)

- [ ] 60 FPS 안정적 유지 (크롬 기준)
- [ ] 로딩 시간 2초 이하
- [ ] QA Agent 자동화 테스트 95% 이상 통과
- [ ] 모바일 터치 조작 지원
- [ ] Vercel 배포 후 접근 가능한 URL 생성

---

## 6. 구현 로드맵 (Implementation Roadmap)

### Phase 1: Foundation (엔진 및 에이전트 기반 구축) - 1-2주
**목표**: 핵심 인프라 및 기본 에이전트 구현

**작업 항목:**
- [ ] 프로젝트 구조 생성 (모노레포 설정)
- [ ] `@caisogames/ai-engine` 기본 뼈대 (ECS 아키텍처)
- [ ] PM Agent 구현 (오케스트레이션 로직)
- [ ] 공유 컨텍스트 시스템 (Event Bus, State Management)
- [ ] Design Team 구현
  - [ ] Concept Designer
  - [ ] Level Designer
  - [ ] Narrative Designer
- [ ] Gemini API 통합 (기본 클라이언트)

**성공 기준:**
- PM Agent가 Design Team을 조율하여 게임 컨셉 생성 가능
- 디자인 품질 게이트 통과 (90점 이상)
- 문서: 아키텍처 문서 완성

### Phase 2: Asset Pipeline (고품질 에셋 생성) - 2-3주
**목표**: 상업적 품질의 에셋 자동 생성

**작업 항목:**
- [ ] Art Team 구현
  - [ ] Asset Generator (Imagen 4 통합)
  - [ ] Style Validator (Gemini Vision 통합)
  - [ ] Animation Creator (멀티 프레임 생성)
  - [ ] Audio Designer (실제 오디오 파일 생성)
- [ ] 반복 개선 루프 (최대 5회 iteration)
- [ ] 투명 배경 처리 (네이티브 + AI 세그멘테이션)
- [ ] 에셋 최적화 파이프라인
  - [ ] 스프라이트 시트 생성
  - [ ] 텍스처 아틀라스 패킹
  - [ ] 오디오 압축

**성공 기준:**
- 에셋 품질 검증 90% 이상 통과율
- 투명 배경 95% 이상 정확도
- 비용: $0.03 per asset 이하
- 문서: Image/Audio Generator 가이드 완성

### Phase 3: Engineering & QA (코드 생성 및 테스트) - 2주
**목표**: 안정적인 게임 코드 자동 생성

**작업 항목:**
- [ ] Engineering Team 구현
  - [ ] Code Generator (ECS 기반)
  - [ ] Code Reviewer (자동 품질 검증)
  - [ ] Performance Optimizer
  - [ ] Debug Agent (Self-Healing)
- [ ] QA Team 구현
  - [ ] Test Planner (테스트 케이스 자동 생성)
  - [ ] Test Executor (Playwright 통합)
  - [ ] Bug Reporter
- [ ] Integration Team
  - [ ] Build Manager
  - [ ] Asset Compiler
  - [ ] Deploy Agent (Vercel 통합)

**성공 기준:**
- 생성된 코드의 품질 점수 80% 이상
- 빌드 성공률 95% 이상
- 자동화 테스트 커버리지 85% 이상
- 문서: Claude Code Integration 가이드 완성

### Phase 4: Classic Masterpiece Rebuild (첫 게임 재개발) - 1주
**목표**: V1 게임을 상업 수준으로 재창조

**작업 항목:**
- [ ] `feeding-caiso-reborn` 재개발
  - [ ] V1 컨셉 분석 및 개선
  - [ ] 전체 에이전트 팀 투입
  - [ ] 픽셀 아트 스타일 적용
  - [ ] 상업 수준 에셋 생성
  - [ ] 완벽한 조작감 구현
  - [ ] QA 및 배포
- [ ] 성능 및 비용 최적화
- [ ] 사용자 피드백 수집

**성공 기준:**
- 전체 품질 점수 90% 이상
- FPS 60 안정적 유지
- 로딩 시간 2초 이하
- 총 개발 비용 $10 이하
- Vercel 배포 성공

### Phase 5: Factory Expansion (본격 공장화) - 지속적
**목표**: 다양한 장르의 게임 양산

**작업 항목:**
- [ ] `caiso-mario-reborn` 재개발
- [ ] 새로운 장르 확장
  - [ ] 퍼즐 게임
  - [ ] 방치형 게임
  - [ ] 슈팅 게임
- [ ] 에이전트 성능 개선 (학습 및 최적화)
- [ ] 커뮤니티 피드백 반영

**성공 기준:**
- 월 5개 이상 게임 생성
- 평균 품질 90% 이상 유지
- 평균 비용 $8 per game 이하

---

## 7. 기술 스택 (Tech Stack)

### AI & Machine Learning
| 용도 | 모델/서비스 | 비고 |
|------|-----------|------|
| 이미지 생성 | Gemini Imagen 4 | 스프라이트, 배경, UI |
| 이미지 검증 | Gemini 2.0 Flash (Vision) | 품질 게이트 |
| 텍스트/코드 생성 | Gemini 2.0 Pro | 게임 설계, 코드 생성 |
| 오디오 생성 | **결정 필요** (Suno API / ElevenLabs SFX / Web Audio 합성) | Phase 2에서 확정 |
| 오케스트레이션 | Claude Code Agent Teams | PM → 팀 → 에이전트 호출 |

> ⚠️ **오디오 생성 주의**: Gemini는 현재 오디오 파일을 직접 생성하지 않습니다. Audio Designer Agent의 구체적인 외부 API는 Phase 2 착수 전 별도 POC(Proof of Concept)로 확정해야 합니다.

### 개발 환경
- **언어**: TypeScript (게임 엔진 + 게임 코드), Python (에이전트 파이프라인)
- **런타임**: Node.js 18+, Python 3.10+
- **빌드 도구**: Vite (게임 번들), esbuild (엔진 패키지)
- **패키지 관리**: npm workspaces (모노레포)

### 게임 엔진 (`@caisogames/ai-engine`)
- **아키텍처**: ECS (Entity-Component-System)
- **렌더링**: Canvas 2D API (WebGL 확장 고려)
- **물리**: 커스텀 경량 AABB 물리 엔진 (중력, 충돌, 플랫폼)
- **오디오**: Web Audio API (SFX 재생) + 외부 파일 로드
- **상세 API**: [`docs/engine/engine-api-spec.md`](./engine/engine-api-spec.md)

### 테스팅
- **E2E**: Playwright (QA Team 자동화)
- **Unit**: Jest (엔진 핵심 로직)
- **타입 체크**: TypeScript strict mode
- **QA Sandbox**: `eval()` 대신 Playwright의 `page.addScriptTag()` 활용 (보안)

### 배포
- **플랫폼**: Vercel (웹), Itch.io (게임 퍼블리싱)
- **CI/CD**: GitHub Actions
- **모니터링**: Sentry (에러 추적)

---

## 8. 참조 문서 (Reference Documentation)

> 📌 **데이터 계약(Interface Contract)의 Source of Truth**: `agent-requirements.md`
> 두 문서 간 인터페이스가 일치하지 않을 경우 **agent-requirements.md를 기준**으로 합니다.

### 아키텍처
- [Multi-Agent System Architecture](./architecture/multi-agent-system.md) - 에이전트 조직 구조, 역할, 코드 예제
- [Orchestration Workflow](./workflows/orchestration-workflow.md) - 워크플로우 다이어그램 및 종료 조건

### 명세
- [Agent Requirements Specification](./specifications/agent-requirements.md) - **18개 에이전트의 I/O 계약 (Source of Truth)**
- [Engine API Specification](./engine/engine-api-spec.md) - **`@caisogames/ai-engine` 공식 API 명세** ← Phase 1 필수 작성

### 구현 가이드
- [Development Setup](./guides/development-setup.md) - 개발 환경 구축 및 사용법 (상세 보완 필요)
- [Image Generator Guide](./guides/image-generator-guide.md) - Imagen 4 통합 및 프롬프트 엔지니어링
- [Audio Generator Guide](./guides/audio-generator-guide.md) - 오디오 생성 가이드 (외부 API 확정 후 업데이트)
- [Claude Code Integration](./guides/claude-code-integration.md) - Agent Teams 활용 패턴

---

## 9. 다음 단계 (Next Steps)

1. **즉시 시작**: Phase 1 Foundation 구현
   - 프로젝트 구조 생성
   - PM Agent 및 Design Team 구현
   - 첫 게임 컨셉 자동 생성 검증

2. **1주 내**: Phase 2 Asset Pipeline 착수
   - Imagen 4 통합
   - 첫 고품질 스프라이트 생성

3. **2주 내**: Phase 3 Engineering & QA
   - 첫 게임 코드 자동 생성
   - 자동화 테스트 실행

4. **3주 내**: Phase 4 첫 게임 완성
   - `feeding-caiso-reborn` 배포
   - 성능/비용 메트릭 수집

---

**문서 버전**: 2.0
**최종 업데이트**: 2026-02-27
**작성자**: CAISOGAMES V2 Development Team
