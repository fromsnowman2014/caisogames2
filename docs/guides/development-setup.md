# Development Setup & Usage Manual

## 1. 환경 요구사항

- **Node.js**: v18 이상
- **Python**: 3.10 이상
- **Claude Code**: 최신 버전
- **API Keys**:
  - `GEMINI_API_KEY`: Gemini Pro API
  - (선택) 외부 Audio API 키

---

## 2. 설치

```bash
# 저장소 클론
git clone https://github.com/your-org/CaisoGames2.git
cd CaisoGames2

# Python 의존성 설치
pip install -r requirements.txt

# Node.js 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 GEMINI_API_KEY 입력
```

---

## 3. 기본 사용법

### 3.1 게임 생성 (CLI)

```bash
# 간단한 게임 생성
python -m caisogames create "픽셀 아트 플랫포머"

# 상세 옵션
python -m caisogames create \
  --genre platformer \
  --style pixel_art \
  --target web \
  "점프와 대시 메카닉을 가진 플랫포머 게임"
```

### 3.2 에이전트 개별 실행

```bash
# 디자인 에이전트만 실행
python -m agents.design_team.concept_designer \
  --input "게임 요구사항"

# 이미지 생성 에이전트
python -m agents.art_team.asset_generator \
  --asset-type sprite \
  --description "cute pixel monster" \
  --style pixel_art
```

---

## 4. Claude Code 통합 사용법

### 4.1 대화형 모드

```bash
# Claude Code 실행
claude-code

# 프롬프트에 입력:
> 픽셀 아트 스타일의 플랫포머 게임을 만들어줘. 주인공은 귀여운 몬스터이고, 점프와 대시가 가능해야 해.

# PM Agent가 자동으로:
# 1. 디자인 팀 활성화
# 2. 아트 팀 활성화
# 3. 엔지니어링 팀 활성화
# 4. QA 및 배포
```

### 4.2 프로젝트 구조

```
CaisoGames2/
├── agents/                  # 에이전트 구현
│   ├── design_team/
│   ├── art_team/
│   ├── engineering_team/
│   ├── qa_team/
│   └── integration_team/
├── packages/                # 공용 엔진
│   └── ai-engine/
├── generated-assets/        # 생성된 에셋
├── games/                   # 완성된 게임
└── docs/                    # 문서
```

---

## 5. 트러블슈팅

### API 키 오류
```bash
# 환경 변수 확인
echo $GEMINI_API_KEY

# .env 파일 확인
cat .env
```

### Rate Limit 초과
- 동시 실행 수 줄이기
- 캐싱 활성화

---

**문서 버전:** 1.0
