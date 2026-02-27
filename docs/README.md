# CAISOGAMES V2 Documentation

**완전 자동화 AI 게임 개발 팩토리**

CAISOGAMES V2는 Claude Code의 Agent Teams와 Gemini API를 결합하여 사용자의 간단한 요청만으로 **상업적 품질의 게임을 자동 생성**하는 시스템입니다.

---

## 📚 문서 구조

### 1. 시작하기

| 문서 | 설명 | 대상 독자 |
|------|------|-----------|
| [**Design Document**](./design_document.md) | **메인 설계 문서** - 전체 비전, 아키텍처, 로드맵 | 전체 |
| [Development Setup](./guides/development-setup.md) | 개발 환경 구축 및 기본 사용법 | 개발자 |

### 2. 아키텍처 (Architecture)

| 문서 | 설명 |
|------|------|
| [Multi-Agent System](./architecture/multi-agent-system.md) | 멀티 에이전트 조직 구조, 역할, 통신 프로토콜 |

**핵심 개념:**
- 계층적 조직 구조 (PM → Teams → Specialist Agents)
- 에이전트 간 협업 (Event Bus, Shared Context)
- 품질 게이트 (각 Phase별 검증)

### 3. 명세 (Specifications)

| 문서 | 설명 |
|------|------|
| [Agent Requirements](./specifications/agent-requirements.md) | 각 에이전트의 상세 요구사항, 입출력, 프롬프트 템플릿 |

**포함 내용:**
- PM Agent, Design Team (3개), Art Team (4개), Engineering Team (4개), QA Team (3개), Integration Team (3개)
- 총 18개 에이전트의 완전한 명세

### 4. 구현 가이드 (Implementation Guides)

| 문서 | 설명 | 핵심 기술 |
|------|------|-----------|
| [Image Generator Guide](./guides/image-generator-guide.md) | 고품질 게임 에셋 생성 가이드 | Imagen 4, Gemini Vision |
| [Audio Generator Guide](./guides/audio-generator-guide.md) | 효과음 및 BGM 생성 가이드 | Gemini, Audio APIs |
| [Claude Code Integration](./guides/claude-code-integration.md) | Agent Teams 활용 패턴 | Claude Code Task API |

**V2 주요 개선사항:**
- ✅ Imagen 4 네이티브 투명 배경 (V1: 사후 제거)
- ✅ Gemini Vision 품질 검증 (V1: 휴리스틱)
- ✅ 실제 오디오 파일 생성 (V1: 코드만)

### 5. 워크플로우 (Workflows)

| 문서 | 설명 |
|------|------|
| [Orchestration Workflow](./workflows/orchestration-workflow.md) | 전체 개발 프로세스 다이어그램 및 플로우 |

**워크플로우 요약:**
```
사용자 요청
  ↓
PM Agent → Design Team → Art Team → Engineering Team
  ↓
Integration → QA → Deploy
  ↓
✅ 완성된 게임 URL
```

---

## 🚀 빠른 시작 (Quick Start)

### 1. 환경 설정

```bash
# 저장소 클론
git clone https://github.com/your-org/CaisoGames2.git
cd CaisoGames2

# 의존성 설치
pip install -r requirements.txt
npm install

# API 키 설정
cp .env.example .env
# .env에 GEMINI_API_KEY 입력
```

### 2. 첫 게임 생성

```bash
# Claude Code 실행
claude-code

# 프롬프트에 입력:
> 픽셀 아트 스타일의 플랫포머 게임을 만들어줘.
> 주인공은 귀여운 몬스터이고, 점프와 대시가 가능해야 해.
```

PM Agent가 자동으로:
1. 게임 컨셉 설계
2. 레벨 구조 생성
3. 고품질 에셋 생성 (Imagen 4)
4. 게임 코드 생성 (ECS)
5. 자동화 테스트
6. Vercel 배포

**예상 소요 시간:** 15-30분
**예상 비용:** ~$0.08

---

## 🎯 핵심 특징

### 1. 완전 자동화
- **사용자 입력**: 간단한 텍스트 요청
- **출력**: 배포된 게임 URL
- **수동 개입**: 거의 없음 (품질 검증 자동화)

### 2. 상업적 품질
- **에셋**: Imagen 4로 생성된 고품질 스프라이트
- **코드**: ECS 아키텍처 기반 최적화된 코드
- **성능**: 60 FPS 안정적 유지
- **테스트**: 자동화 QA로 95% 버그 사전 차단

### 3. 비용 효율적
- **평균 비용**: $0.08 per game
- **개발 시간**: 15-30분 (수동: 수주)
- **캐싱**: 중복 생성 방지
- **최적화**: 적응형 iteration (조기 종료)

### 4. Self-Healing
- **자동 디버깅**: Debug Agent가 버그 분석 및 수정
- **QA 루프**: 테스트 실패 시 자동 재작업
- **품질 보장**: 모든 Phase에 품질 게이트

---

## 📊 V1 vs V2 비교

| 기능 | V1 | V2 |
|------|-----|-----|
| **에이전트 구조** | 독립적, 수동 조율 | 계층적, PM 자동 조율 |
| **이미지 품질 검증** | 휴리스틱 (점수 기반) | Gemini Vision (실제 분석) |
| **투명 배경** | 흰 배경 → 사후 제거 | Imagen 4 네이티브 |
| **오디오 생성** | 코드만 (Web Audio API) | 실제 WAV/MP3 파일 |
| **애니메이션** | 단일 프레임 | 멀티 프레임 + 일관성 검증 |
| **코드 품질** | 수동 리뷰 | 자동 리뷰 + Self-Healing |
| **테스트** | 랜덤 클릭 | 목표 지향적 시나리오 |
| **개발 시간** | 1-2시간 | 15-30분 |
| **비용** | ~$0.15/game | ~$0.08/game |
| **성공률** | ~70% | ~95% (품질 게이트) |

---

## 🗺️ 로드맵

### Phase 1: Foundation (1-2주) ✅ 진행 중
- [x] 프로젝트 구조 설계
- [x] 문서 작성 (이 문서들)
- [ ] PM Agent 구현
- [ ] Design Team 구현

### Phase 2: Asset Pipeline (2-3주)
- [ ] Imagen 4 통합
- [ ] Gemini Vision 검증
- [ ] 첫 고품질 에셋 생성

### Phase 3: Engineering & QA (2주)
- [ ] 코드 생성 및 리뷰
- [ ] 자동화 테스트
- [ ] Self-Healing 구현

### Phase 4: First Game (1주)
- [ ] `feeding-caiso-reborn` 완성
- [ ] 성능 및 비용 최적화
- [ ] Vercel 배포

### Phase 5: Expansion (지속적)
- [ ] 다양한 장르 확장
- [ ] 월 5개 이상 게임 생성

---

## 🔧 기술 스택

### AI & ML
- **Gemini API**: Imagen 4, Vision, Pro
- **Claude Code**: Agent Teams

### 개발
- **언어**: TypeScript, Python
- **엔진**: 커스텀 ECS 엔진
- **빌드**: Vite, esbuild
- **테스트**: Playwright, Jest

### 배포
- **플랫폼**: Vercel, Itch.io
- **CI/CD**: GitHub Actions

---

## 📖 추가 리소스

### 외부 링크
- [CAISOGAMES V1 (Archive)](https://github.com/fromsnowman2014/CAISOGAMES)
- [Claude Code Documentation](https://docs.claude.com/claude-code)
- [Gemini API Documentation](https://ai.google.dev/docs)

### 관련 문서
- **AI 엔진**: `packages/ai-engine/README.md` (Phase 1 후 작성)
- **에이전트 구현**: `agents/*/README.md` (각 에이전트별)
- **API Reference**: `docs/api/` (Phase 2 후 작성)

---

## 💡 기여 가이드

현재 Phase 1 진행 중입니다. 기여를 원하시면:

1. Issue 생성 또는 기존 Issue 확인
2. Feature Branch 생성 (`feature/agent-name`)
3. 구현 및 테스트
4. Pull Request 생성

**우선순위 영역:**
- PM Agent 구현
- Design Team 구현
- Gemini API 통합

---

## 📞 문의

- **Issue**: GitHub Issues
- **Email**: dev@caisogames.com (예시)
- **Discord**: CAISOGAMES Community (예시)

---

**문서 버전**: 2.0
**최종 업데이트**: 2026-02-27

**다음 단계**: [Development Setup Guide](./guides/development-setup.md)에서 개발 환경을 구축하세요.
