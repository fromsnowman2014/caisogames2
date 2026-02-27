# 🏂 Ski Caiso — Design Document V1.1

> **작성일**: 2026-02-27  
> **버전**: V1.1 (무한 맵 생성 & 난이도 스케일링 확장판)  
> **장르**: 2D 횡스크롤 물리 기반 엔드리스 러너 (Endless Runner / Physics Arcade)  
> **핵심 레퍼런스**:
> - **Tiny Wings** — 지형 곡선을 이용한 가속/펌핑(Pumping) 메카닉, 절차적 지형 생성
> - **Alto's Adventure** — 끝없는 설원 활강, 장애물 넘기, 공중 회전 트릭, 부드러운 아트 스타일
> - **Ski Safari** — 지형 내 동물/장애물 피하기, 거리 기반 무한 콘텐츠

---

## 📌 목차

1. [게임 개요](#1-게임-개요)
2. [핵심 재미 요소 (Core Loop)](#2-핵심-재미-요소)
3. [비주얼 & 아트 스타일](#3-비주얼--아트-스타일)
4. [조작 방식 및 컨트롤](#4-조작-방식-및-컨트롤)
5. [물리 엔진 상세](#5-물리-엔진-상세)
6. [무한 맵 절차적 생성 시스템 ⭐](#6-무한-맵-절차적-생성-시스템)
7. [난이도 스케일링 상세](#7-난이도-스케일링-상세)
8. [지형 구간 (Chunk) 카탈로그](#8-지형-구간-chunk-카탈로그)
9. [UI 및 점수 시스템](#9-ui-및-점수-시스템)
10. [기술 아키텍처 요약](#10-기술-아키텍처-요약)

---

## 1. 게임 개요

**"Ski Caiso"**는 끝없이 이어지는 곡선형 눈 덮인 설산 지형을 왼쪽에서 오른쪽으로 돌파하며, 최대한 멀리 진행하는 것을 목표로 하는 2D 횡스크롤 스키 게임입니다.

아주 작고 귀여운 핸드드로잉 감성의 Caiso(스키어)를 4방향 키로 조작하여, 지형의 굴곡에서 속도를 얻고, 절벽에서 도약하고, 공중에서 트릭을 부리며 설원을 달립니다. 게임 맵은 **무한히 절차적으로 생성**되어 끝이 없으며, 진행 거리가 늘어날수록 지형이 점점 험난해집니다.

---

## 2. 핵심 재미 요소 (Core Loop)

```
[게임 시작]
    ↓
[지형 읽기 → Down 키로 내리막 가속 (Pumping)]
    ↓
[속도 축적 → 언덕 오르막 자연 도약]
    ↓
[Up 키로 추가 점프 / Left·Right 키로 공중 회전 트릭]
    ↓
[완벽한 착지 → 스피드 부스트 + 트릭 점수]
    ↓
[점점 험해지는 지형: 강(River), 절벽(Cliff), 급경사(Steep)]
    ↓
[속도/점프 실패 → 진행 불가 → 게임 오버 / 기록 갱신]
```

1. **지형의 리듬 타기 (Pumping)** — *Tiny Wings* 차용  
   내리막에서 `Down` 키로 가속력을 폭발시키고, 오르막 전 손을 떼어 관성으로 자연스럽게 날아오르는 리듬 메카닉.

2. **공중 트릭 (Mid-air Tricks)** — *Alto's Adventure* 차용  
   체공 상태에서 `Left`/`Right` 키로 백플립/프론트플립을 돌리고, 완벽 착지 시 속도 보너스 및 점수 배수 획득.

3. **한계 극복 (Endless Challenge)**  
   거리가 멀어질수록 강, 협곡, 급경사가 등장해 충분한 속도와 정확한 점프 타이밍 없이는 진행 불가. 고난도에서 이를 뚫어내는 순간의 성취감이 핵심.

---

## 3. 비주얼 & 아트 스타일

- **아기자기한 핸드드로잉 (Miniature Hand-Drawn)**
  - 수채화/크레파스 질감의 포근한 2D 일러스트 설원 배경
  - 스키어 캐릭터는 화면의 3~5% 크기로 아주 작게 표현 → 광활한 자연의 스케일 강조
  - 손으로 그린 듯 선의 강약이 살아있는 지형 라인

- **패럴랙스(Parallax) 배경 레이어**

  | 레이어 | 속도 비율 | 내용 |
  |--------|----------|------|
  | `sky` | 0.05x | 구름이 천천히 흘러가는 하늘 |
  | `mountains_far` | 0.15x | 희미하게 보이는 먼 산봉우리 |
  | `mountains_mid` | 0.35x | 중경의 설산 실루엣 |
  | `trees` | 0.6x | 전경 전나무 숲 |
  | `terrain` | 1.0x | 실제 물리 지형 (스키어와 동기) |

- **동적 카메라**
  - 스키어 속도가 높을수록 살짝 줌아웃하여 앞을 더 잘 보여줌
  - 도약 시 수직 방향으로 카메라가 부드럽게 따라오고, 착지 시 살짝 충격 흔들림(Camera Shake)

---

## 4. 조작 방식 및 컨트롤

| 입력 키 | 상태 | 액션 | 물리 효과 |
|---------|------|------|-----------|
| **⬇️ Down** | 지면 활강 중 | **무게 싣기 (Pumping)** | 중력 가속도 배율 ×2.0 적용. 내리막에서 최대 가속, 오르막에서는 오히려 감속을 유발 |
| **⬆️ Up** | 언덕 끝자락 / 점프 직전 | **도약력 증폭 (Jump Boost)** | 수직 방향 임펄스(Impulse) 추가 적용. 타이밍을 언덕 Lip에서 맞출수록 최대 도약 |
| **⬅️ Left** | 공중 체공 중 | **백플립 (Backflip)** | 반시계 방향 각속도(Angular Velocity) 부여 |
| **➡️ Right** | 공중 체공 중 | **프론트플립 (Frontflip)** | 시계 방향 각속도(Angular Velocity) 부여 |

### 착지 판정
```
스키어 각도 vs 지형 경사각 차이:
  0° ~ 15°  → ✅ Perfect Landing:  속도 손실 0% + 스피드 부스트 +20%
 16° ~ 35°  → 🟡 Good Landing:    속도 손실 10%
 36° ~ 60°  → 🔶 Rough Landing:   속도 손실 40%, 눈보라 이펙트
 61° ~ 180° → 💥 Crash:           게임 오버 (스키어가 설원에 굴러 넘어짐)
```

---

## 5. 물리 엔진 상세

### 5.1 핵심 물리 상수

```javascript
const PHYSICS = {
  gravity:            1200,   // px/s² — 기본 중력 가속도
  pumpMultiplier:     2.0,    // Down 키 입력 시 중력 배율
  friction:           0.02,   // 눈 마찰 계수 (거의 없음 → 매끄러운 활강감)
  airResistance:      0.995,  // 체공 중 공기 저항 배율 (매 프레임 속도에 곱)
  jumpImpulse:        650,    // Up 키 추가 수직 임펄스 (px/s)
  maxSpeed:           2000,   // 지형 최대 허용 속도 (px/s)
  angularSpeed:        8.0,   // Left/Right 키 회전 각속도 (rad/s)
  angularDamping:      0.98,  // 공중 각속도 감쇠 (매 프레임)
};
```

### 5.2 경사각 기반 가속도 계산

```
지형 경사 θ에 따른 자연 가속도:
  가속도_x = sin(θ) × gravity × (pumpMultiplier if Down else 1.0)

  θ가 양수(내리막) → 오른쪽 방향 가속
  θ가 음수(오르막) → 오른쪽 방향 감속 (= 속도 소모)
```

### 5.3 지형 충돌

- 지형은 연속된 **폴리라인(Polyline)**으로 구성
- 스키어 바닥 점(Ski Tip)이 지형 폴리라인과 교차하면 즉각 착지 판정
- 착지 순간 스키어 회전각과 지형 법선 벡터(Normal Vector) 각도 차이를 계산 → 착지 등급 결정

---

## 6. 무한 맵 절차적 생성 시스템 ⭐

무한으로 새로운 지형이 만들어져 같은 배치가 반복되지 않으면서도, 난이도가 자연스럽게 올라가는 것이 핵심입니다.

### 6.1 기본 설계 철학

- 지형은 **고정된 레벨이 아니라** 플레이어가 진행할수록 실시간으로 오른쪽 끝에 새 지형 Chunk를 이어붙이는 방식으로 무한 생성됩니다.
- **Chunk 기반 생성(Chunk-based Streaming)**: 지형을 일정 너비(예: 800px)의 Chunk 단위로 쪼개고, 화면 오른쪽 끝을 넘어가면 새 Chunk를 생성하여 연결합니다.
- 이미 지나친 왼쪽의 Chunk는 **메모리에서 즉시 해제(Unload)** — 무한 진행에도 메모리 누수 없음.

```
[Chunk 0] → [Chunk 1] → [Chunk 2] → [Chunk 3 (생성 중)] → ...
  (이미 통과)   (화면 밖)   (화면에 표시)   (다음 예비 생성)
```

### 6.2 Chunk 생성 파이프라인

```
1. 현재 난이도 단계(DifficultyTier) 조회
        ↓
2. 해당 Tier의 Chunk 풀(Pool)에서 패턴 가중치 랜덤 선택
        ↓
3. 지형 포인트 파라미터 계산
   (파형 주기, 진폭, 특수 장애물 여부)
        ↓
4. 베지어 곡선 보간으로 부드러운 폴리라인 생성
        ↓
5. 이전 Chunk의 끝 점에 연속성 있게 이어붙이기
   (끝 점의 높이·경사각 일치 보장)
        ↓
6. 물리 엔진에 새 지형 Collider 등록
        ↓
7. 비주얼 렌더(눈 레이어, 나무, 배경 오브젝트) 배치
```

### 6.3 지형 생성 수식

지형의 Y좌표는 여러 파형을 합성하여 생성합니다.

```javascript
/**
 * 지형 높이 계산 (절차적 합성 파형)
 * @param {number} x       - 월드 X 좌표
 * @param {object} params  - 현재 Tier의 파라미터
 */
function getTerrainY(x, params) {
  const {
    baseY,          // 기본 지면 높이
    amp1, freq1,    // 저주파 큰 파형 (넓은 언덕)
    amp2, freq2,    // 중주파 파형   (일반 굴곡)
    amp3, freq3,    // 고주파 파형   (잔진동, 자갈길 느낌)
    seed            // 매 Chunk마다 달라지는 랜덤 시드
  } = params;

  return baseY
    + amp1 * Math.sin(freq1 * x + seed)
    + amp2 * Math.sin(freq2 * x + seed * 1.3)
    + amp3 * Math.sin(freq3 * x + seed * 2.7);
}
```

이 세 파형의 **진폭(Amplitude)과 주파수(Frequency)를 난이도에 따라 조절**하는 것이 무한 맵 난이도 변화의 핵심입니다.

### 6.4 특수 지형 오브젝트 삽입

각 Chunk 생성 시 아래 조건에 따라 특수 오브젝트를 삽입합니다:

| 오브젝트 | 트리거 조건 | 생성 방식 |
|----------|-----------|----------|
| **강 (River)** | 거리 > 1km이고 랜덤 15% 확률 (Tier 2+) | 지형에 연속 하강 → 수면 레이어 삽입 → 이후 지형 재상승 |
| **협곡 (Cliff Gap)** | 거리 > 3km이고 랜덤 10% 확률 (Tier 3+) | 지형 포인트가 갑자기 수직 하강했다가 우측에서 다시 상승 |
| **눈 더미 (Snow Mound)** | 언제나 랜덤 25% 확률 | 지형 위에 반원형 돌출 오브젝트 — 속도가 낮으면 막힘 |
| **점프대 (Ramp)** | 이전 Chunk가 강이나 협곡인 경우 | 이전 지형 끝에 가파른 오르막 배치하여 도약 유도 |
| **나무 장애물** | 랜덤 20% (Tier 2+) | 지형 위에 충돌 가능한 나무 배치 — 닿으면 Crash |

---

## 7. 난이도 스케일링 상세

### 7.1 난이도 Tier 정의

진행 거리(Distance)를 기준으로 자동으로 Tier가 올라갑니다. 지형 생성 파라미터가 Tier별로 바뀌는 방식으로 구현합니다.

| Tier | 거리 구간 | 별칭 | 지형 진폭 | 주파수 | 특수 장애물 |
|------|----------|------|----------|--------|-----------|
| **1** | 0 ~ 500m | 🌿 초원 입문 | 낮음 (80px) | 느림 | 없음 |
| **2** | 500m ~ 1.2km | 🌲 숲 경사 | 중간 (150px) | 보통 | 작은 강 (10%) |
| **3** | 1.2km ~ 2.5km | ⛰️ 중턱 | 높음 (220px) | 빠름 | 강(15%), 협곡(5%) |
| **4** | 2.5km ~ 4km | 🏔️ 고지대 | 매우 높음 (300px) | 매우 빠름 | 강(20%), 협곡(10%), 나무 |
| **5** | 4km ~ 6km | 🌪️ 폭풍 설원 | 극단 (400px) | 불규칙 | 강(25%), 협곡(15%), 눈더미 |
| **6** | 6km ~ | 💀 극한의 산 | 카오스 (500px+) | 매우 불규칙 | 모든 장애물 고밀도 |

### 7.2 Tier별 생성 파라미터 상세표

```javascript
const TIER_PARAMS = {
  1: {
    amp1: 80,   freq1: 0.003,   // 넓고 완만한 언덕
    amp2: 20,   freq2: 0.010,
    amp3: 5,    freq3: 0.030,
    riverProb: 0,   cliffProb: 0,   treeProb: 0,
    moundProb: 0.05
  },
  2: {
    amp1: 150,  freq1: 0.004,
    amp2: 40,   freq2: 0.015,
    amp3: 10,   freq3: 0.045,
    riverProb: 0.10,  cliffProb: 0,   treeProb: 0,
    moundProb: 0.15
  },
  3: {
    amp1: 220,  freq1: 0.005,
    amp2: 70,   freq2: 0.020,
    amp3: 20,   freq3: 0.060,
    riverProb: 0.15,  cliffProb: 0.05,  treeProb: 0.10,
    moundProb: 0.20
  },
  4: {
    amp1: 300,  freq1: 0.006,
    amp2: 100,  freq2: 0.025,
    amp3: 30,   freq3: 0.080,
    riverProb: 0.20,  cliffProb: 0.10,  treeProb: 0.20,
    moundProb: 0.25
  },
  5: {
    amp1: 400,  freq1: 0.007,
    amp2: 150,  freq2: 0.035,
    amp3: 50,   freq3: 0.100,
    riverProb: 0.25,  cliffProb: 0.15,  treeProb: 0.25,
    moundProb: 0.30
  },
  6: {
    amp1: 500,  freq1: (x) => 0.006 + 0.003 * Math.random(),  // 불규칙
    amp2: 200,  freq2: (x) => 0.030 + 0.020 * Math.random(),
    amp3: 80,   freq3: 0.120,
    riverProb: 0.30,  cliffProb: 0.20,  treeProb: 0.35,
    moundProb: 0.40
  }
};
```

### 7.3 연속 장애물 방지 규칙 (Fairness Rules)

무한 생성이더라도 플레이어가 "불공평하다"고 느끼지 않도록 다음 규칙을 반드시 지킵니다:

```
규칙 1: 강(River) 또는 협곡(Cliff) 생성 직전 Chunk는
        반드시 완만한 내리막 + 점프대(Ramp)를 배치하여
        플레이어가 충분히 속도를 쌓을 기회를 제공한다.

규칙 2: 강/협곡 직후 Chunk는 반드시 완만한 구간으로 시작하여
        착지 충격 후 회복 시간을 준다.

규칙 3: 강/협곡이 연속으로 2번 이상 나타나지 않도록
        사이에 최소 1개의 일반 Chunk를 강제 삽입한다.

규칙 4: 나무 장애물은 항상 피할 수 있는 위치(위 혹은 아래 공간 확보)에만 배치.
```

### 7.4 난이도 전환 부드러운 블렌딩

Tier 경계에서 갑자기 파라미터가 변하면 부자연스럽습니다. 이를 막기 위해 **Lerp(Linear Interpolation)**로 파라미터를 부드럽게 전환합니다.

```javascript
// 현재 파라미터 = Tier N 파라미터와 Tier N+1 파라미터를 거리 비율로 보간
function getBlendedParams(distance) {
  const tierIdx = getTierIndex(distance);
  const nextTierIdx = Math.min(tierIdx + 1, MAX_TIER);
  const t = getTierBlendFactor(distance); // 0.0 ~ 1.0
  return lerpParams(TIER_PARAMS[tierIdx], TIER_PARAMS[nextTierIdx], t);
}
```

---

## 8. 지형 구간 (Chunk) 카탈로그

각 Chunk는 사전 정의된 **패턴 타입(Pattern Type)** 중 하나로 분류되어, 해당 Tier에서 허용된 타입 중 가중치 기반으로 랜덤 선택됩니다.

| 패턴 코드 | 이름 | 형태 | 허용 Tier | 선택 가중치 |
|----------|------|------|---------|-----------|
| `GENTLE_ROLL` | 완만한 파도 | 완만한 사인파 1~2개 | 1~6 | Tier1: 90%, Tier6: 10% |
| `STEEP_DROP` | 급경사 하강 | 가파른 내리막 → 완만 | 2~6 | Tier1: 0%, Tier4+: 30% |
| `BIG_HILL` | 거대 언덕 | 큰 단일 오르막 | 1~6 | 균등 20% |
| `VALLEY_LEAP` | 계곡 도약 | 내리막 → 강/협곡 → 오르막 | 3~6 | Tier3+: 15% |
| `MOGUL_FIELD` | 모굴 지대 | 짧고 빠른 파형 연속 | 4~6 | Tier4+: 20% |
| `RAMP_LAUNCH` | 점프대 | 급격한 상향 경사 | 2~6 | 전후 강/협곡 시 강제 |
| `FLAT_RECOVERY` | 평탄 회복 구간 | 거의 평지 | 1~6 | 강/협곡 직후 강제 |

---

## 9. UI 및 점수 시스템

### 9.1 점수 계산

```
최종 점수 = 거리 점수 + 트릭 점수 × 콤보 배수

거리 점수:   진행 거리 × Tier 배율
             Tier 배율: 1(1x)  2(1.5x)  3(2x)  4(3x)  5(4x)  6(6x)

트릭 점수:
  단순 회전(360° 1번):           +100점
  더블 플립(360° × 2, 한 체공):  +350점
  트리플 플립(360° × 3):         +800점
  Perfect Landing 보너스:         +50점 (착지 시마다)
  콤보 배수: 연속 Perfect        × 1.5 / × 2.0 / × 3.0 (3연속/5연속/10연속)
```

### 9.2 HUD 구성

```
┌─────────────────────────────────────┐
│  🏔️ 1,234 m         🏆 45,200 pts  │  ← 상단 좌: 거리 / 우: 점수
│                                     │
│                                     │
│         [스키어]                    │
│         ↓ (지형)                    │
│                                     │
│  ╔══════════════╗                   │
│  ║ 🔥 COMBO ×3  ║  ← 콤보 팝업     │
│  ╚══════════════╝                   │
│                                     │
│  💥 DOUBLE BACKFLIP! +350           │  ← 트릭 팝업 (중앙)
└─────────────────────────────────────┘
```

### 9.3 게임 오버 & 베스트 기록

- Crash 발생 시 스키어가 눈보라를 일으키며 구르는 물리 연출(Ragdoll) 후 결과 화면 이동
- 결과 화면: 진행 거리, 최대 트릭, 최대 콤보, 총 점수 표시
- 로컬 스토리지에 **Top 10 베스트 기록** 저장
- "한 번 더(Retry)" 버튼으로 즉시 재도전 가능

---

## 10. 기술 아키텍처 요약

### 10.1 권장 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| **렌더링** | HTML5 Canvas (2D Context) | 가볍고 빠름, 모바일 호환 |
| **물리 엔진** | 자체 구현 (Simple Slope Physics) | Matter.js 등 라이브러리 없이 경사/관성/각도 직접 계산 → 퍼포먼스 최적화 |
| **지형 생성** | 절차적 Sine 합성 + Chunk Streaming | 메모리 효율적인 무한 지형 |
| **모듈 시스템** | Native ES6 Modules (번들러 없음) | 빌드 시스템 없이 즉시 실행 |

### 10.2 핵심 파일 구조

```
games/ski-caiso/
├── index.html
├── src/
│   ├── core/
│   │   ├── Game.js           # 메인 루프, FSM
│   │   └── Physics.js        # 경사 물리, 충돌, 착지 판정
│   ├── terrain/
│   │   ├── TerrainGenerator.js  # 절차적 Chunk 생성 (사인 합성)
│   │   ├── ChunkManager.js      # Chunk 스트리밍/언로드
│   │   └── ObstacleSpawner.js   # 강/협곡/나무 배치
│   ├── entities/
│   │   ├── Skier.js          # 스키어 물리 상태, 회전, 트릭 판정
│   │   └── Camera.js         # 동적 줌, 스무딩
│   ├── difficulty/
│   │   └── DifficultyManager.js # Tier 계산, 파라미터 블렌딩
│   ├── rendering/
│   │   ├── TerrainRenderer.js   # 눈 지형 드로잉
│   │   ├── ParallaxRenderer.js  # 배경 레이어 패럴랙스
│   │   └── ParticleSystem.js    # 눈보라, 트릭 이펙트
│   └── ui/
│       ├── HUD.js            # 거리, 점수, 콤보 HUD
│       └── ResultScreen.js   # 게임 오버 결과 화면
└── assets/
    ├── sprites/              # 스키어 애니메이션 스프라이트시트
    └── backgrounds/          # 패럴랙스 배경 레이어
```

### 10.3 무한 맵 메모리 관리

```javascript
// Chunk 관리 원칙
const CHUNK_WIDTH = 800;       // px
const PRELOAD_AHEAD = 3;       // 항상 화면 앞 3 Chunk 미리 생성
const UNLOAD_BEHIND = 2;       // 화면 뒤 2 Chunk 이상 지나면 즉시 해제

// 매 프레임 호출
function updateChunks(cameraX) {
  // 1. 오른쪽으로 새 Chunk 생성 (필요 시)
  while (lastChunkEndX < cameraX + CHUNK_WIDTH * PRELOAD_AHEAD) {
    spawnNextChunk();
  }
  // 2. 왼쪽 오래된 Chunk 해제
  chunks = chunks.filter(c => c.endX > cameraX - CHUNK_WIDTH * UNLOAD_BEHIND);
}
```

---

*Ski Caiso Design Document V1.1 — 무한 맵 생성 & 난이도 스케일링 완전판*  
*이 문서를 기반으로 구현 시 TerrainGenerator → ChunkManager → DifficultyManager 순서로 핵심 시스템을 먼저 구축할 것.*
