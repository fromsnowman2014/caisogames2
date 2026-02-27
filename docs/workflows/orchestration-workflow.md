# Agent Orchestration Workflow

> **문서 버전:** 1.1 | **최종 업데이트:** 2026-02-27

---

## 전체 워크플로우 다이어그램

```
USER REQUEST: "픽셀 아트 플랫포머 게임 제작"
    ↓
┌─────────────────────────────────────────────────────────┐
│          PROJECT MANAGER AGENT                          │
│  1. 요구사항 분석 (모호하면 → 사용자에게 명확화 요청)       │
│  2. 작업 분해 및 팀 할당                                  │
│  3. 품질 게이트 기준 설정                                 │
│  4. 예상 비용/시간 추정                                   │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: DESIGN (병렬 실행)                             │
├─────────────────────────────────────────────────────────┤
│  Concept Designer  → 게임 메카닉 설계 (JSON 출력)         │
│  Level Designer    → 레벨 구조 설계 (JSON 출력)           │
│  Narrative Designer → 스토리/대사 작성 (JSON 출력)        │
└─────────────────────────────────────────────────────────┘
    ↓ [Quality Gate 1: Design Review]
    │  기준: 컨셉 명확성, 레벨 도달 가능성, 플레이 시간 합리성
    │  실패 시: Concept Designer 피드백 → 최대 2회 재시도
    │  2회 후에도 실패 시: 사용자에게 요구사항 명확화 요청 후 중단
    ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: ASSET CREATION (병렬 실행)                     │
├─────────────────────────────────────────────────────────┤
│  Asset Generator → Imagen 4로 스프라이트 생성             │
│     └─ Style Validator (즉시) → 품질 검증 (Gemini Vision) │
│     └─ 품질 < 90: 프롬프트 개선 후 재생성 (최대 5회)       │
│  Audio Designer  → 효과음/BGM 생성 (외부 Audio API)      │
│  Animation Creator → 스프라이트 시트 조립                 │
└─────────────────────────────────────────────────────────┘
    ↓ [Quality Gate 2: Asset Quality]
    │  기준: 에셋 품질 점수 ≥ 90, 투명 배경 정확도 ≥ 95%
    │  실패 시: 실패 에셋만 재생성 (최대 5회/에셋)
    │  5회 후에도 실패 시: 해당 에셋 건너뛰고 대체 에셋 사용 + 사용자 알림
    ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: CODE GENERATION (병렬 실행)                    │
├─────────────────────────────────────────────────────────┤
│  Code Generator → ECS 기반 게임 로직 생성                 │
│     └─ Engine API Spec에 정의된 API만 사용 (필수)          │
│  Code Reviewer  → 코드 품질 검증 (정적 분석)              │
│     └─ 품질 < 80: Code Generator에 피드백 → 수정 (최대 3회)│
│  Optimizer      → 성능 최적화 (렌더링 배칭, 메모리)        │
└─────────────────────────────────────────────────────────┘
    ↓ [Quality Gate 3: Code Quality]
    │  기준: 품질 점수 ≥ 80, TypeScript 빌드 오류 0개
    │  실패 시: Code Reviewer 피드백 → 재생성 (최대 3회)
    │  3회 후에도 실패 시: Debug Agent 개입 → 수동 수정 모드 전환
    ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 4: INTEGRATION                                   │
├─────────────────────────────────────────────────────────┤
│  Build Manager   → npm run build (Vite)                 │
│  Asset Compiler  → 텍스처 아틀라스 패킹, 오디오 압축       │
└─────────────────────────────────────────────────────────┘
    ↓ [Quality Gate 4: Build Success]
    │  기준: Vite 빌드 오류 0개, 번들 크기 ≤ 10MB
    │  실패 시: Debug Agent 개입 → 에러 로그 분석 → 자동 수정 (최대 3회)
    │  3회 후에도 실패 시: 🔴 파이프라인 중단 + 에러 보고서 사용자 전달
    ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 5: QA (자동화 테스트)                              │
├─────────────────────────────────────────────────────────┤
│  Test Planner  → 테스트 케이스 생성 (Test Suite JSON)     │
│  Test Executor → Playwright 자동화 실행                   │
│  Bug Reporter  → 버그 리포트 생성 (심각도 분류)            │
└─────────────────────────────────────────────────────────┘
    ↓
    ├─ PASS (Critical 버그 0개, 통과율 ≥ 95%)
    │     → PHASE 6: DEPLOYMENT
    │
    └─ FAIL
          → Critical 버그: Debug Agent → 자동 수정 → 다시 QA (최대 3회)
          → 3회 후에도 Critical 실패: 🔴 파이프라인 중단 + 버그 보고서 전달
          → High/Medium 버그만: 경고 포함하여 배포 진행 (PM이 판단)
    ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 6: DEPLOYMENT                                    │
├─────────────────────────────────────────────────────────┤
│  Deploy Agent → vercel deploy (자동 인증)                 │
│  → 배포 URL 검증 (HTTP 200 확인)                          │
└─────────────────────────────────────────────────────────┘
    ↓
✅ 완성된 게임 URL 반환 + 품질/비용 보고서
```

---

## 품질 게이트 세부 기준 (Quality Gates)

| 게이트 | 기준 | 실패 처리 | 최대 재시도 | 재시도 소진 시 |
|--------|------|-----------|------------|---------------|
| **Gate 1: Design** | 컨셉 명확성, 레벨 도달 가능성 | Concept Designer 재작업 | 2회 | 사용자 명확화 요청 후 중단 |
| **Gate 2: Assets** | 품질 ≥ 90, 투명도 ≥ 95% | 해당 에셋만 재생성 | 5회/에셋 | 대체 에셋 사용 + 사용자 알림 |
| **Gate 3: Code** | 품질 ≥ 80, 빌드 오류 0 | Code Reviewer 피드백 → 재생성 | 3회 | Debug Agent 수동 개입 |
| **Gate 4: Build** | 빌드 성공, 번들 ≤ 10MB | Debug Agent 에러 분석 | 3회 | 🔴 파이프라인 중단 |
| **Gate 5: QA** | Critical 버그 0, 통과율 ≥ 95% | Debug Agent 수정 → QA 재실행 | 3회 | 🔴 중단 (Critical) / 경고 배포 (non-Critical) |

---

## 의존성 그래프

```
Design ─────────────────────────────────► Code
   │                                       ▲
   └──► Art ──► Animation Creator ─────────┤
          │                                │
          └──► Audio Designer ─────────────┘
                                           │
                                    Integration
                                           │
                                          QA
                                           │
                                        Deploy
```

**병렬 실행 가능 구간:**
- Phase 1: Concept + Level + Narrative (모두 병렬)
- Phase 2: Asset Generator + Audio Designer (병렬, Animation은 Asset 완료 후)
- Phase 3: Code Generator + Code Reviewer (순차, Reviewer는 Generator 완료 후)
- Phase 5: Test Planner + (Test Executor + Bug Reporter 순차)

---

## 비용 추적 (Cost Tracking)

PM Agent는 각 Phase 완료 후 실제 비용을 누적 추적하고, 예산 초과 시 경고합니다.

```
Phase 1 완료: Gemini Pro 토큰 비용 누계
Phase 2 완료: Imagen 4 이미지 생성 비용 누계
Phase 3 완료: Gemini Pro 코드 생성 비용 누계
...
최종 보고서: 실제 총 비용 vs 예상 비용
```

**예산 초과 임계값:**
- 예상 비용의 150% 초과 시: 사용자 알림 (계속 여부 확인)
- 예상 비용의 200% 초과 시: 파이프라인 일시 중단 (승인 필요)

---

**관련 문서:**
- [Multi-Agent System Architecture](../architecture/multi-agent-system.md)
- [Agent Requirements Specification](../specifications/agent-requirements.md)
- [Engine API Specification](../engine/engine-api-spec.md)
