# CAISOGAMES V2 - AI-Driven Game Generation Factory

**완전 자동화된 게임 개발 시스템** - Claude Code Agent Teams + Gemini API

[![Phase](https://img.shields.io/badge/Phase-1%20Foundation-blue)]()
[![Status](https://img.shields.io/badge/Status-Active-success)]()

---

## 🎯 프로젝트 개요

CAISOGAMES V2는 사용자의 간단한 텍스트 요청만으로 **상업적 품질의 게임을 자동 생성**하는 AI 시스템입니다.

**핵심 특징:**
- 🤖 **18개 전문 AI 에이전트** - 계층적 조직 구조
- 🎨 **고품질 에셋** - Gemini Imagen 4로 픽셀 아트 생성
- 🔄 **Self-Healing** - 버그 자동 탐지 및 수정
- 💰 **비용 효율** - 게임당 ~$0.08 (V1 대비 47% 절감)
- ⚡ **빠른 생성** - 15-30분 내 완성 (수동: 수주)

---

## 📊 현재 상태: Phase 1 Foundation

### ✅ 완료된 작업

| 구성 요소 | 상태 | 파일 |
|----------|------|------|
| **문서** | ✅ 100% | `docs/` (9개 문서, 30,000+ 단어) |
| **프로젝트 구조** | ✅ 100% | 디렉토리, 설정 파일 |
| **공유 유틸리티** | ✅ 100% | LLM Client, Event Bus, Context |
| **PM Agent** | ✅ 프로토타입 | `agents/project_manager/` |
| **Concept Designer** | ✅ 100% | `agents/design_team/concept_designer/` |

### 🔄 진행 중

- Level Designer Agent
- Narrative Designer Agent
- AI Engine 기본 구조 (`@caisogames/ai-engine`)

### ⏳ 다음 단계: Phase 2

- Art Team (Imagen 4 통합)
- Audio Designer (실제 오디오 파일 생성)
- 첫 게임 에셋 생성

---

## 🚀 빠른 시작

### 1. 사전 요구사항

```bash
# 확인
node --version  # v18 이상
python3 --version  # 3.10 이상
```

### 2. 설치

```bash
# 저장소 클론
git clone https://github.com/fromsnowman2014/caisogames2.git
cd caisogames2

# 의존성 설치 (Phase 1은 zero-dependency)
# npm install  # Phase 2에서 필요
# pip install -r requirements.txt  # Phase 2에서 필요

# 환경 변수 설정
cp .env.example .env
```

### 3. Phase 1 실행 (Design Team 테스트)

```bash
# Concept Designer 단독 실행
cd agents/design_team/concept_designer
python3 agent.py

# PM Agent를 통한 전체 워크플로우
cd agents/project_manager
python3 pm_agent.py "Create a pixel art platformer with a cute cat hero"
```

**예상 출력:**
```
╔═══════════════════════════════════════════════════════════╗
║  🎮 CAISOGAMES V2 - Project Manager Agent               ║
╚═══════════════════════════════════════════════════════════╝

Project ID: game-20260227-143022
User Request: Create a pixel art platformer with a cute cat hero

┌─────────────────────────────────────────────────────────┐
│  PHASE 1: DESIGN                                        │
└─────────────────────────────────────────────────────────┘

🎨 Concept Designer Agent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Request: Create a pixel art platformer with a cute cat hero
Genre: platformer
Platform: web

⏳ Generating concept with Gemini...

✅ Concept Design Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Title: Whisker's Adventure
🎮 Genre: platformer
💬 Tagline: A purr-fect journey through enchanted forests!

🔁 Core Loop:
   → Explore magical forest areas
   → Collect fish tokens
   → Avoid owl enemies
   → Unlock new abilities

⚡ Player Abilities (4 total):
   • Jump: Basic platforming jump
   • Double Jump: Unlock after collecting 10 fish
   • Wall Climb: Cling to walls and climb

✨ Unique Mechanics:
   • Stealth Mode: Hide in shadows to avoid owls
   • Fish Magnetism: Nearby fish are attracted when ability active

⏱️  Estimated Playtime: 25 minutes

📚 Reference Games: Celeste, Hollow Knight

💰 Cost: $0.0012
📊 Tokens: 1,234

╔═══════════════════════════════════════════════════════════╗
║  ✅ PHASE 1 COMPLETE                                     ║
╚═══════════════════════════════════════════════════════════╝

📁 Output Directory: output/game-20260227-143022
   ├─ project_context.json
   └─ concept.json
```

---

## 📁 프로젝트 구조

```
CaisoGames2/
├── docs/                           # 📚 완전한 설계 문서
│   ├── README.md                   # 문서 네비게이션
│   ├── design_document.md          # 메인 설계 문서
│   ├── architecture/               # 아키텍처
│   ├── specifications/             # 에이전트 명세
│   ├── guides/                     # 구현 가이드
│   └── workflows/                  # 워크플로우
│
├── agents/                         # 🤖 AI 에이전트들
│   ├── shared/                     # ✅ 공유 유틸리티
│   │   ├── llm.py                 # Vercel Proxy 기반 LLM 클라이언트
│   │   ├── event_bus.py           # 에이전트 간 통신
│   │   ├── context.py             # 프로젝트 상태 공유
│   │   └── constants.py
│   ├── project_manager/            # ✅ PM Agent (프로토타입)
│   │   └── pm_agent.py
│   └── design_team/
│       └── concept_designer/       # ✅ Concept Designer (완성)
│           ├── agent.py
│           └── prompts/
│
├── packages/                       # 📦 게임 엔진 (Phase 2)
│   └── ai-engine/                 # @caisogames/ai-engine
│
├── generated-assets/               # 🎨 AI 생성 에셋 (Phase 2)
│
└── games/                          # 🎮 완성된 게임 (Phase 4)
```

---

## 📖 주요 문서

### 시작하기
- [**Development Setup**](docs/guides/development-setup.md) - 환경 구축 및 사용법
- [**Design Document**](docs/design_document.md) - 전체 비전 및 로드맵

### 아키텍처
- [**Multi-Agent System**](docs/architecture/multi-agent-system.md) - 18개 에이전트 조직 구조
- [**Orchestration Workflow**](docs/workflows/orchestration-workflow.md) - 전체 워크플로우

### 명세
- [**Agent Requirements**](docs/specifications/agent-requirements.md) - 각 에이전트 상세 명세 (18,000+ 단어)

### 구현 가이드
- [**Image Generator Guide**](docs/guides/image-generator-guide.md) - Imagen 4 통합
- [**Audio Generator Guide**](docs/guides/audio-generator-guide.md) - 오디오 생성
- [**Claude Code Integration**](docs/guides/claude-code-integration.md) - Agent Teams 활용

---

## 🛠️ 기술 스택

### AI & ML
- **Gemini API**: Imagen 4 (이미지), Vision (검증), Pro/Flash (텍스트/코드)
- **Claude Code**: Agent Teams 오케스트레이션

### 개발
- **언어**: TypeScript (엔진), Python (에이전트)
- **런타임**: Node.js 18+, Python 3.10+
- **아키텍처**: ECS (Entity-Component-System)

### 배포
- **플랫폼**: Vercel (API Proxy + 게임 호스팅)
- **CI/CD**: GitHub Actions

---

## 🗺️ 로드맵

### ✅ Phase 1: Foundation (현재)
- [x] 문서 작성 (9개, 30,000+ 단어)
- [x] 프로젝트 구조 생성
- [x] 공유 유틸리티 (LLM, Event Bus, Context)
- [x] PM Agent 프로토타입
- [x] Concept Designer Agent
- [ ] Level Designer Agent
- [ ] Narrative Designer Agent

### 📍 Phase 2: Asset Pipeline (다음)
- [ ] Art Team 구현
- [ ] Imagen 4 통합
- [ ] Audio Designer (실제 WAV/MP3 생성)
- [ ] 첫 고품질 스프라이트 생성

### Phase 3: Engineering & QA
- [ ] Code Generator
- [ ] QA Team (Playwright)
- [ ] Self-Healing Debug Agent

### Phase 4: First Game
- [ ] `feeding-caiso-reborn` 완성
- [ ] Vercel 배포

### Phase 5: Factory
- [ ] 월 5개 이상 게임 생성

---

## 💡 핵심 개선사항 (V1 → V2)

| 영역 | V1 | V2 |
|------|-----|-----|
| **에이전트** | 5개 독립 | 18개 계층적 조직 |
| **이미지** | 휴리스틱 검증 | Gemini Vision 분석 |
| **투명 배경** | 사후 제거 | Imagen 4 네이티브 |
| **오디오** | 코드만 | 실제 WAV/MP3 |
| **비용** | ~$0.15/게임 | ~$0.08/게임 |
| **시간** | 1-2시간 | 15-30분 |

---

## 🤝 기여하기

현재 Phase 1 진행 중입니다. 기여를 원하시면:

1. Issue 생성
2. Feature Branch (`feature/agent-name`)
3. Pull Request

**우선순위:**
- Level Designer Agent 구현
- Narrative Designer Agent 구현
- AI Engine 기본 구조

---

## 📞 문의

- **GitHub Issues**: [이슈 생성](https://github.com/fromsnowman2014/caisogames2/issues)
- **Email**: dev@caisogames.com

---

## 📄 라이선스

MIT License

---

**다음 단계**: [Development Setup Guide](docs/guides/development-setup.md)에서 개발 환경을 구축하세요.
