# Development Setup & Usage Manual

> **문서 버전:** 1.1 | **최종 업데이트:** 2026-02-27  
> 이 가이드로 로컬 환경에서 에이전트 파이프라인을 실행하세요.

---

## 1. 환경 요구사항

| 도구 | 버전 | 확인 명령어 |
|------|------|------------|
| **Node.js** | v18 이상 | `node --version` |
| **Python** | 3.10 이상 | `python3 --version` |
| **npm** | v9 이상 | `npm --version` |
| **Claude Code** | 최신 버전 | `claude --version` |
| **Git** | 2.x 이상 | `git --version` |

**API Keys 필요:**
- `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com)에서 발급
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`: `"1"` (`.claude/settings.local.json`에 설정됨)
- `AUDIO_API_KEY`: (선택) Phase 2 오디오 생성 시 필요 — API 목록은 Phase 2 도중 확정

---

## 2. 설치

```bash
# 1) 저장소 클론
git clone https://github.com/fromsnowman2014/caisogames2.git
cd caisogames2

# 2) Python 가상환경 생성 및 활성화 (권장)
python3 -m venv venv
source venv/bin/activate   # Mac/Linux
# venv\Scripts\activate   # Windows

# 3) Python 의존성 설치 (Phase 1에서 requirements.txt 생성 예정)
# pip install -r requirements.txt

# 4) Node.js 의존성 설치 (Phase 1에서 package.json 생성 예정)
# npm install

# 5) 환경 변수 설정
cp .env.example .env       # Phase 1에서 .env.example 생성 예정
```

> ⚠️ **Phase 1 이전**: `requirements.txt`와 `package.json`(루트)은 Phase 1 엔진 구현 중 생성됩니다.
> 현재는 `docs/` 문서 작업 단계입니다.

---

## 3. 환경 변수 설정

`.env` 파일 (Phase 1에서 `.env.example` 제공 예정):

```bash
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Claude Code (이미 .claude/settings.local.json으로 설정됨)
# Claude Agent Teams는 Claude Code 실행 시 자동으로 인식

# 오디오 생성 API (Phase 2 확정 후 추가)
# SUNO_API_KEY=...
# ELEVENLABS_API_KEY=...

# 배포 (Phase 3 이후)
# VERCEL_TOKEN=...
```

---

## 4. 프로젝트 구조 이해

```
caisogames2/
├── .claude/
│   └── settings.local.json      # Claude Code Agent Teams 설정 ✅
├── docs/                         # 📚 현재 작업 중인 문서
│   ├── design_document.md        # 메인 설계 문서
│   ├── engine/
│   │   └── engine-api-spec.md   # 🔑 엔진 API (Code Agent의 성경)
│   ├── architecture/
│   ├── specifications/
│   ├── guides/
│   └── workflows/
├── agents/          (Phase 1 생성 예정) # 에이전트 파이썬 코드
├── packages/        (Phase 1 생성 예정) # @caisogames/ai-engine
├── games/           (Phase 4 생성 예정) # 실제 게임들
└── generated-assets/(Phase 2 생성 예정) # AI 생성 에셋
```

---

## 5. Claude Code로 실행하기

### 5.1 Claude Code Agent Teams 활성화 확인

`.claude/settings.local.json`에 아래 설정이 있어야 합니다:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### 5.2 대화형 게임 생성 (Phase 3 이후 사용 가능)

```bash
# Claude Code 실행
claude

# 프롬프트에 입력:
> 픽셀 아트 스타일의 플랫포머 게임을 만들어줘.
> 주인공은 귀여운 고양이이고, 점프와 이중점프가 가능해야 해.
> 적은 날아다니는 박쥐와 바닥을 순찰하는 슬라임으로 구성.
```

PM Agent가 자동으로 아래를 처리합니다:
1. 게임 컨셉 설계 (Design Team)
2. 고품질 스프라이트 생성 (Art Team + Gemini Imagen 4)
3. 게임 코드 생성 (Engineering Team + Engine API)
4. 자동화 테스트 (QA Team + Playwright)
5. Vercel 배포

**예상 소요 시간:** 15-30분  
**예상 비용:** ~$0.08 (Gemini API 기준)

### 5.3 단계별 에이전트 실행 (Phase 2 이후)

```bash
# 디자인 에이전트만 실행
python -m agents.project_manager.pm_agent \
  --phase design \
  --request "점프 액션 게임"

# 이미지 생성 에이전트 단독 테스트
python -m agents.art_team.asset_generator \
  --asset-type sprite \
  --description "cute pixel art cat character, 64x64, idle pose" \
  --style pixel_art \
  --output generated-assets/sprites/

# QA 테스트만 실행
python -m agents.qa_team.test_executor \
  --game-url http://localhost:3000
```

---

## 6. 로컬 게임 개발 서버 (Phase 1 이후)

```bash
# 게임 개발 서버 시작 (Vite HMR)
cd games/feeding-caiso-reborn
npm run dev   # http://localhost:3000에서 실행

# 엔진 패키지 빌드 (게임 코드 수정 전 실행)
cd packages/ai-engine
npm run build

# 전체 모노레포 빌드
npm run build --workspaces
```

---

## 7. 트러블슈팅

### API 키 오류
```bash
# 환경 변수 확인
echo $GEMINI_API_KEY

# .env 파일 확인 (직접 cat 대신 아래 사용)
python3 -c "from dotenv import dotenv_values; print(dotenv_values('.env').keys())"
```

### Gemini Rate Limit 초과
- 에이전트 동시 실행 수 줄이기 (`pm_agent --parallel-limit 2`)
- 캐싱 활성화 (`--use-cache` 플래그)
- 동일 에셋 재생성 방지: `generated-assets/` 캐시 확인

### Claude Code Agent Teams 미작동
```bash
# 설정 확인
cat .claude/settings.local.json

# 재시작
claude --debug
```

### TypeScript 빌드 오류 (Phase 1 이후)
```bash
# 타입 체크만 실행
cd packages/ai-engine
npx tsc --noEmit

# 자세한 오류 메세지
npx tsc --noEmit --pretty
```

### Playwright 테스트 실패
```bash
# 브라우저 설치 (최초 1회)
npx playwright install chromium

# 디버그 모드로 실행 (브라우저 창 표시)
npx playwright test --headed --debug
```

---

## 8. Phase별 개발 체크리스트

| Phase | 상태 | 주요 산출물 |
|-------|------|------------|
| **0. Documentation** | ✅ 완료 | `docs/` 전체 문서 |
| **1. Foundation** | 🔄 진행 예정 | `packages/ai-engine/`, PM Agent, Design Team |
| **2. Asset Pipeline** | ⏳ 대기 | Art Team, Imagen 4 통합, Audio API 결정 |
| **3. Engineering & QA** | ⏳ 대기 | Engineering Team, QA Team, Integration Team |
| **4. First Game** | ⏳ 대기 | `games/feeding-caiso-reborn/` 배포 |
| **5. Factory** | ⏳ 대기 | `caiso-mario-reborn/` + 신규 장르 |

---

**다음 단계:** [Multi-Agent System Architecture](../architecture/multi-agent-system.md)을 읽고 Phase 1 구현을 시작하세요.
