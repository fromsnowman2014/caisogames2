# Image Generator Implementation Guide

## 목차
1. [개요](#1-개요)
2. [Gemini Imagen 4 통합](#2-gemini-imagen-4-통합)
3. [프롬프트 엔지니어링](#3-프롬프트-엔지니어링)
4. [품질 검증 시스템](#4-품질-검증-시스템)
5. [투명 배경 처리](#5-투명-배경-처리)
6. [반복 개선 루프](#6-반복-개선-루프)
7. [비용 최적화](#7-비용-최적화)
8. [구현 예제](#8-구현-예제)
9. [트러블슈팅](#9-트러블슈팅)

---

## 1. 개요

### 1.1 V2의 개선사항

| 기능 | V1 | V2 (개선) |
|------|-----|-----------|
| **투명 배경** | 흰 배경 → 사후 제거 (불완전) | Imagen 4 네이티브 투명도 + AI 세그멘테이션 |
| **스타일 일관성** | 휴리스틱 기반 검증 | Gemini Vision으로 실제 이미지 분석 |
| **애니메이션** | 단일 프레임만 | 멀티 프레임 + 일관성 검증 |
| **반복 개선** | 최대 5회 고정 | 적응형 iteration (품질 기반) |
| **비용** | ~$0.05 per asset | ~$0.03 per asset (최적화) |

### 1.2 시스템 아키텍처

```
User Request
    ↓
[Asset Generator Agent]
    ├→ Prompt Builder
    ├→ Imagen 4 API
    ├→ Style Validator (Gemini Vision)
    ├→ Transparency Processor
    └→ Iteration Manager
    ↓
Generated Asset (PNG + Metadata)
```

---

## 2. Gemini Imagen 4 통합

### 2.1 API 설정

**필요한 패키지:**
```bash
pip install google-generativeai pillow numpy
```

**인증 설정:**
```python
import google.generativeai as genai
import os

# API 키 설정
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set")

genai.configure(api_key=GEMINI_API_KEY)
```

### 2.2 Imagen 4 모델 초기화

```python
from typing import Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class ImageGenerationConfig:
    """Imagen 4 생성 설정"""
    model: str = "imagen-4.0-generate-001"
    aspect_ratio: str = "1:1"  # "1:1", "16:9", "9:16", "3:4", "4:3"
    size: tuple[int, int] = (512, 512)
    safety_filter_level: str = "block_few"  # "block_none", "block_few", "block_some", "block_most"
    number_of_images: int = 1
    enable_transparent_background: bool = True  # V2 신기능

class ImagenClient:
    """Imagen 4 API 클라이언트"""

    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('imagen-4.0-generate-001')

    async def generate(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        config: ImageGenerationConfig = ImageGenerationConfig()
    ) -> 'GeneratedImage':
        """
        이미지 생성

        Args:
            prompt: 생성 프롬프트
            negative_prompt: 제외할 요소
            config: 생성 설정

        Returns:
            GeneratedImage 객체
        """

        # Imagen 4 API 호출
        response = await self.model.generate_image_async(
            prompt=prompt,
            negative_prompt=negative_prompt,
            aspect_ratio=config.aspect_ratio,
            number_of_images=config.number_of_images,
            safety_filter_level=config.safety_filter_level,

            # V2 신기능: 네이티브 투명 배경
            output_format="png",
            transparent_background=config.enable_transparent_background
        )

        # 응답 처리
        if not response.images:
            raise ImageGenerationError("No images generated")

        image_data = response.images[0]

        return GeneratedImage(
            data=image_data,
            prompt=prompt,
            model=config.model,
            metadata={
                'aspect_ratio': config.aspect_ratio,
                'safety_rating': response.safety_ratings[0] if response.safety_ratings else None
            }
        )


@dataclass
class GeneratedImage:
    """생성된 이미지 데이터"""
    data: bytes                        # 이미지 바이너리
    prompt: str
    model: str
    metadata: Dict[str, Any]

    def to_pil(self) -> 'PIL.Image':
        """PIL Image 객체로 변환"""
        from PIL import Image
        import io

        return Image.open(io.BytesIO(self.data))

    def save(self, path: str):
        """파일로 저장"""
        with open(path, 'wb') as f:
            f.write(self.data)
```

### 2.3 API 요금 및 제한

| 항목 | 값 |
|------|-----|
| **요금** | $0.04 per image (Imagen 4) |
| **Rate Limit** | 60 requests/minute |
| **Max Image Size** | 2048x2048 |
| **Timeout** | 30 seconds per request |

---

## 3. 프롬프트 엔지니어링

### 3.1 스타일별 프롬프트 템플릿

#### 픽셀 아트 (Pixel Art)

```python
PIXEL_ART_TEMPLATE = """
Create a game sprite in 16-bit pixel art style.

SUBJECT: {subject}
PURPOSE: {purpose}

STYLE REQUIREMENTS:
- Sharp, crisp pixel edges (absolutely NO anti-aliasing or blur)
- Limited color palette: {palette_size} colors maximum
- Each pixel is intentional and visible
- No gradients or smooth shading (use dithering if needed)
- Clean, readable silhouette even at small sizes
- Retro game aesthetic (SNES/Genesis era inspiration)

TECHNICAL SPECIFICATIONS:
- Resolution: {width}x{height} pixels
- Pixel grid: {pixel_density} (e.g., 16x16 base unit)
- Background: TRANSPARENT (alpha channel)
- Color mode: Indexed color (limited palette)

COMPOSITION:
- Subject perfectly centered in frame
- Facing: {facing_direction} (standard game convention)
- Pose: {pose} (idle, neutral, T-pose, etc.)
- Padding: 10-15% from edges for breathing room

REFERENCE STYLE:
{style_reference_description}

COLOR PALETTE:
{color_palette}

NEGATIVE ELEMENTS (strictly avoid):
- Anti-aliasing or smooth edges
- Gradients or alpha blending
- Text, watermarks, signatures
- Complex backgrounds
- Photorealistic details
- Blur or soft focus
- Multiple subjects
"""

# 사용 예시
def build_pixel_art_prompt(
    subject: str,
    purpose: str,
    width: int = 512,
    height: int = 512,
    palette: list[str] = None
) -> str:
    """픽셀 아트 프롬프트 생성"""

    palette_colors = palette or [
        "#000000",  # Black
        "#FFFFFF",  # White
        "#FF0000",  # Red
        "#00FF00",  # Green
        "#0000FF",  # Blue
        "#FFFF00",  # Yellow
        "#FF00FF",  # Magenta
        "#00FFFF",  # Cyan
    ]

    return PIXEL_ART_TEMPLATE.format(
        subject=subject,
        purpose=purpose,
        width=width,
        height=height,
        palette_size=len(palette_colors),
        pixel_density="32x32",
        facing_direction="right",
        pose="idle stance",
        style_reference_description="Similar to Celeste, Stardew Valley, or Undertale",
        color_palette=", ".join(palette_colors)
    )
```

#### 손그림 스타일 (Hand-Drawn)

```python
HAND_DRAWN_TEMPLATE = """
Create a hand-drawn 2D game character illustration.

SUBJECT: {subject}
PURPOSE: {purpose}

STYLE REQUIREMENTS:
- Bold, confident outlines (2-3px thick, consistent weight)
- Flat color fills with subtle cell shading (2-3 shade levels max)
- Vibrant, saturated color palette
- Cartoon/anime-inspired proportions (stylized, not realistic)
- Expressive features (large eyes, exaggerated expressions)
- Clean vector-art quality (no texture or grain)

ART DIRECTION:
- Style: {art_style} (e.g., "kawaii", "chibi", "western cartoon")
- Mood: {mood}
- Character proportions: {proportions}
- Detail level: {detail_level}

TECHNICAL SPECIFICATIONS:
- Resolution: {width}x{height} pixels
- Background: TRANSPARENT
- Line art: Clean, closed paths (no gaps)
- Colors: Solid fills (no gradients or textures)
- Visual hierarchy: Clear focal points

COMPOSITION:
- Centered character
- Full body visible (unless specified otherwise)
- Dynamic pose (avoid stiff, static poses)
- Appropriate negative space

COLOR PALETTE:
{color_palette}

REFERENCE ARTISTS/STYLES:
{reference_styles}

AVOID:
- Photorealistic rendering
- Complex backgrounds
- Text or UI elements
- Watermarks
- Multiple characters (unless explicitly requested)
- Blur or depth of field effects
"""
```

#### UI 엘리먼트

```python
UI_ELEMENT_TEMPLATE = """
Create a game UI element in {style} style.

ELEMENT TYPE: {element_type}
PURPOSE: {purpose}

DESIGN REQUIREMENTS:
- High contrast for readability
- Clear affordances (buttons look clickable, etc.)
- Consistent visual language with game art style
- Scalable design (works at multiple sizes)
- Game-appropriate aesthetic

TECHNICAL SPECIFICATIONS:
- Size: {width}x{height}
- Background: TRANSPARENT
- States: {states} (e.g., "normal, hover, pressed, disabled")
- Format: Clean, vector-style (sharp edges)

VISUAL DESIGN:
- Primary color: {primary_color}
- Accent color: {accent_color}
- Border: {border_style}
- Shadow/highlight: {shadow_style}
- Icon style: {icon_style}

AVOID:
- Text (will be added programmatically)
- Overly complex details
- Photorealism
- Watermarks
"""
```

### 3.2 Negative Prompt 최적화

```python
class NegativePromptBuilder:
    """Negative prompt 생성기"""

    # 카테고리별 제외 요소
    COMMON_NEGATIVES = [
        "text", "words", "letters", "numbers",
        "watermark", "signature", "logo",
        "blur", "blurry", "out of focus",
        "low quality", "low resolution",
        "jpeg artifacts", "compression artifacts"
    ]

    BACKGROUND_NEGATIVES = [
        "complex background",
        "detailed background",
        "photorealistic background",
        "multiple subjects",
        "crowded composition"
    ]

    STYLE_NEGATIVES = {
        "pixel_art": [
            "anti-aliasing", "smooth edges",
            "gradients", "alpha blending",
            "photorealistic", "3D rendering"
        ],
        "hand_drawn": [
            "photorealistic", "3D",
            "pixel art", "low poly",
            "texture", "grain", "noise"
        ],
        "ui": [
            "character", "landscape",
            "complex scene", "3D"
        ]
    }

    @classmethod
    def build(cls, style: str, category: str) -> str:
        """스타일 및 카테고리에 맞는 negative prompt 생성"""

        negatives = (
            cls.COMMON_NEGATIVES +
            cls.BACKGROUND_NEGATIVES +
            cls.STYLE_NEGATIVES.get(style, [])
        )

        return ", ".join(negatives)
```

### 3.3 프롬프트 개선 전략

```python
class PromptRefiner:
    """반복 생성 시 프롬프트 개선"""

    def __init__(self, gemini_model):
        self.gemini = gemini_model

    async def improve_prompt(
        self,
        original_prompt: str,
        feedback: list[str],
        failed_attempts: int
    ) -> str:
        """
        피드백 기반 프롬프트 개선

        Args:
            original_prompt: 원본 프롬프트
            feedback: 이전 생성 결과에 대한 피드백
            failed_attempts: 실패한 시도 횟수

        Returns:
            개선된 프롬프트
        """

        refinement_prompt = f"""
You are an expert prompt engineer for AI image generation.

ORIGINAL PROMPT:
{original_prompt}

FEEDBACK FROM PREVIOUS ATTEMPTS ({failed_attempts} failures):
{chr(10).join(f"- {f}" for f in feedback)}

IMPROVE THE PROMPT:

Guidelines:
1. Address specific feedback points
2. Add more explicit constraints to prevent issues
3. Strengthen weak areas (e.g., if edges are blurry, emphasize "sharp, crisp edges")
4. Keep core subject and style intact
5. Don't make it overly verbose (aim for clarity, not length)

Output the improved prompt only (no explanation).
"""

        response = await self.gemini.generate_content_async(refinement_prompt)

        return response.text.strip()
```

---

## 4. 품질 검증 시스템

### 4.1 Gemini Vision 기반 검증

```python
import json
from typing import TypedDict

class QualityMetrics(TypedDict):
    style_consistency: dict[str, Any]
    technical_quality: dict[str, Any]
    transparency: dict[str, Any]
    game_fit: dict[str, Any]
    composition: dict[str, Any]

class StyleValidator:
    """Gemini Vision으로 이미지 품질 검증"""

    def __init__(self, gemini_api_key: str):
        genai.configure(api_key=gemini_api_key)
        self.vision_model = genai.GenerativeModel('gemini-2.0-flash-exp')

    async def validate(
        self,
        image: 'PIL.Image',
        style_guide: dict,
        original_prompt: str
    ) -> 'ValidationResult':
        """
        이미지 품질 검증

        Args:
            image: 검증할 이미지
            style_guide: 아트 스타일 가이드
            original_prompt: 생성에 사용된 프롬프트

        Returns:
            ValidationResult 객체
        """

        # 검증 프롬프트 생성
        validation_prompt = self._build_validation_prompt(style_guide, original_prompt)

        # Gemini Vision API 호출
        response = await self.vision_model.generate_content_async([
            validation_prompt,
            image
        ])

        # JSON 파싱
        result_json = self._extract_json(response.text)

        return ValidationResult.from_dict(result_json)

    def _build_validation_prompt(self, style_guide: dict, prompt: str) -> str:
        return f"""
You are an Expert Art Director for game development.

EVALUATE THIS GAME ASSET against the following criteria:

STYLE GUIDE:
{json.dumps(style_guide, indent=2)}

ORIGINAL PROMPT:
{prompt}

EVALUATION CRITERIA (score each 0-100):

1. **Style Consistency** (25% weight)
   - Does it match the required art style ({style_guide.get('artStyle')})?
   - Is the visual style coherent and professional?
   - Does it match reference images/description?

2. **Technical Quality** (20% weight)
   - Are edges clean and sharp (or intentionally soft)?
   - Is the resolution appropriate?
   - Are there any artifacts or defects?
   - Is the detail level appropriate for game use?

3. **Transparency** (20% weight)
   - Is the background fully transparent (or properly white if specified)?
   - Are there any stray pixels or artifacts around edges?
   - Is the alpha channel clean?

4. **Game Fit** (20% weight)
   - Is the size appropriate for in-game use?
   - Will it be readable at game resolution?
   - Are proportions correct for the intended purpose?

5. **Composition** (15% weight)
   - Is the subject centered?
   - Is there appropriate negative space?
   - Is the silhouette clear and recognizable?

FOR EACH METRIC:
- Numeric score (0-100)
- Brief feedback (1-2 sentences max)
- Specific improvement suggestions if score < 90

OVERALL:
- Calculate weighted overall score
- PASS if overall >= 90, otherwise FAIL
- List top 3 improvement suggestions

OUTPUT FORMAT (strict JSON):
{{
  "overall_score": <number>,
  "passed": <boolean>,
  "metrics": {{
    "style_consistency": {{
      "score": <number>,
      "feedback": "<string>",
      "suggestions": ["<string>"]
    }},
    "technical_quality": {{...}},
    "transparency": {{...}},
    "game_fit": {{...}},
    "composition": {{...}}
  }},
  "improvement_suggestions": ["<top 3 suggestions>"]
}}

BE STRICT but FAIR. Commercial game quality is the bar.
"""

    def _extract_json(self, text: str) -> dict:
        """응답 텍스트에서 JSON 추출"""

        # Gemini가 ```json ... ``` 형식으로 반환할 수 있음
        import re

        json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_str = text

        return json.loads(json_str)


@dataclass
class ValidationResult:
    """검증 결과"""
    overall_score: float
    passed: bool
    metrics: QualityMetrics
    improvement_suggestions: list[str]

    @classmethod
    def from_dict(cls, data: dict) -> 'ValidationResult':
        return cls(
            overall_score=data['overall_score'],
            passed=data['passed'],
            metrics=data['metrics'],
            improvement_suggestions=data['improvement_suggestions']
        )

    def to_dict(self) -> dict:
        return {
            'overall_score': self.overall_score,
            'passed': self.passed,
            'metrics': self.metrics,
            'improvement_suggestions': self.improvement_suggestions
        }
```

### 4.2 자동화된 기술 검사

```python
import numpy as np
from PIL import Image

class TechnicalValidator:
    """이미지 기술적 품질 자동 검사"""

    @staticmethod
    def check_transparency(image: Image.Image) -> dict:
        """투명도 검사"""

        if image.mode != 'RGBA':
            return {
                'has_alpha': False,
                'coverage': 0,
                'issues': ['Image does not have alpha channel']
            }

        alpha = np.array(image.split()[-1])

        # 완전 투명 픽셀 (alpha = 0)
        transparent_pixels = np.sum(alpha == 0)
        total_pixels = alpha.size

        # 배경이 제대로 제거되었는지 (테두리 영역 검사)
        edge_alpha = np.concatenate([
            alpha[0, :],   # 상단
            alpha[-1, :],  # 하단
            alpha[:, 0],   # 좌측
            alpha[:, -1]   # 우측
        ])

        edge_transparent_ratio = np.sum(edge_alpha == 0) / len(edge_alpha)

        issues = []
        if edge_transparent_ratio < 0.8:  # 테두리의 80% 이상이 투명해야 함
            issues.append(f"Edges not fully transparent ({edge_transparent_ratio:.1%})")

        return {
            'has_alpha': True,
            'transparent_coverage': transparent_pixels / total_pixels,
            'edge_transparency': edge_transparent_ratio,
            'issues': issues
        }

    @staticmethod
    def check_resolution(image: Image.Image, target_size: tuple[int, int]) -> dict:
        """해상도 검사"""

        width, height = image.size
        target_w, target_h = target_size

        size_match = (width == target_w and height == target_h)

        return {
            'actual_size': (width, height),
            'target_size': target_size,
            'matches': size_match,
            'issues': [] if size_match else [f"Size mismatch: got {width}x{height}, expected {target_w}x{target_h}"]
        }

    @staticmethod
    def check_pixel_art_quality(image: Image.Image) -> dict:
        """픽셀 아트 특화 검사"""

        # RGB 이미지로 변환
        rgb_image = image.convert('RGB')
        pixels = np.array(rgb_image)

        # 고유 색상 개수
        unique_colors = len(np.unique(pixels.reshape(-1, 3), axis=0))

        # 엣지 선명도 검사 (Laplacian 분산)
        gray = np.array(image.convert('L'))
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        issues = []

        # 픽셀 아트는 일반적으로 제한된 팔레트 사용
        if unique_colors > 64:
            issues.append(f"Too many colors for pixel art ({unique_colors} > 64)")

        # 엣지가 선명해야 함
        if laplacian_var < 100:
            issues.append(f"Edges too soft for pixel art (blur detected)")

        return {
            'unique_colors': unique_colors,
            'edge_sharpness': laplacian_var,
            'is_crisp': laplacian_var >= 100,
            'issues': issues
        }
```

---

## 5. 투명 배경 처리

### 5.1 Imagen 4 네이티브 투명도

```python
# V2에서는 Imagen 4가 네이티브로 투명 배경 지원
config = ImageGenerationConfig(
    transparent_background=True,  # 네이티브 투명도 활성화
    output_format="png"
)

image = await imagen_client.generate(
    prompt=prompt,
    config=config
)
```

### 5.2 AI 기반 배경 제거 (폴백)

```python
from rembg import remove  # AI 배경 제거 라이브러리

class TransparencyProcessor:
    """투명 배경 처리"""

    @staticmethod
    def ensure_transparency(image: Image.Image) -> Image.Image:
        """
        투명 배경 보장

        1차: Imagen 4 네이티브 투명도 사용
        2차: AI 세그멘테이션으로 배경 제거 (폴백)
        """

        # 이미 알파 채널이 있고 품질이 좋으면 그대로 사용
        if image.mode == 'RGBA':
            alpha_quality = TechnicalValidator.check_transparency(image)
            if alpha_quality['edge_transparency'] > 0.9:
                return image  # 충분히 좋음

        # AI 기반 배경 제거
        output = remove(
            image,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10
        )

        return output

    @staticmethod
    def clean_alpha_channel(image: Image.Image, threshold: int = 10) -> Image.Image:
        """
        알파 채널 정리 (stray pixels 제거)

        Args:
            image: RGBA 이미지
            threshold: 알파 임계값 (0-255)

        Returns:
            정리된 이미지
        """

        if image.mode != 'RGBA':
            return image

        r, g, b, a = image.split()
        alpha_array = np.array(a)

        # 임계값 이하는 완전 투명으로
        alpha_array[alpha_array < threshold] = 0

        # 임계값 이상은 완전 불투명으로 (이진화)
        # 단, 픽셀 아트가 아닌 경우는 부드러운 알파 유지
        # alpha_array[alpha_array >= threshold] = 255

        cleaned_alpha = Image.fromarray(alpha_array, mode='L')

        return Image.merge('RGBA', (r, g, b, cleaned_alpha))

    @staticmethod
    def add_white_background(image: Image.Image) -> Image.Image:
        """
        투명 배경에 흰색 배경 추가 (미리보기용)
        """

        if image.mode != 'RGBA':
            return image

        white_bg = Image.new('RGBA', image.size, (255, 255, 255, 255))
        white_bg.paste(image, (0, 0), image)

        return white_bg.convert('RGB')
```

---

## 6. 반복 개선 루프

### 6.1 적응형 Iteration 전략

```python
class IterationManager:
    """반복 생성 전략 관리"""

    def __init__(self, max_iterations: int = 5, target_score: float = 90.0):
        self.max_iterations = max_iterations
        self.target_score = target_score

    async def generate_with_refinement(
        self,
        request: AssetRequest,
        style_guide: dict,
        imagen_client: ImagenClient,
        validator: StyleValidator
    ) -> tuple[Image.Image, dict]:
        """
        반복 개선 루프

        Returns:
            (최고 품질 이미지, 메타데이터)
        """

        best_image = None
        best_score = 0
        best_metadata = {}

        iteration_history = []

        # 초기 프롬프트
        prompt = self._build_initial_prompt(request, style_guide)
        negative_prompt = NegativePromptBuilder.build(
            style_guide['artStyle'],
            request.category
        )

        for iteration in range(1, self.max_iterations + 1):
            logger.info(f"Iteration {iteration}/{self.max_iterations}")

            # 생성
            start_time = time.time()

            generated = await imagen_client.generate(
                prompt=prompt,
                negative_prompt=negative_prompt,
                config=ImageGenerationConfig(
                    size=request.size,
                    transparent_background=True
                )
            )

            image = generated.to_pil()
            generation_time = time.time() - start_time

            # 투명도 처리
            image = TransparencyProcessor.ensure_transparency(image)

            # 품질 검증
            validation = await validator.validate(image, style_guide, prompt)

            score = validation.overall_score
            logger.info(f"  Score: {score:.1f}/100")

            # 기록
            iteration_history.append({
                'iteration': iteration,
                'score': score,
                'generation_time': generation_time,
                'passed': validation.passed,
                'suggestions': validation.improvement_suggestions
            })

            # 최고 점수 갱신
            if score > best_score:
                best_score = score
                best_image = image
                best_metadata = {
                    'iteration': iteration,
                    'score': score,
                    'prompt': prompt,
                    'validation': validation.to_dict()
                }

            # 목표 달성 시 조기 종료
            if score >= self.target_score:
                logger.info(f"  ✓ Target score reached ({score:.1f} >= {self.target_score})")
                break

            # 다음 iteration을 위한 프롬프트 개선
            if iteration < self.max_iterations:
                prompt = await self._improve_prompt(
                    prompt,
                    validation.improvement_suggestions,
                    iteration
                )

        # 최종 메타데이터
        final_metadata = {
            **best_metadata,
            'total_iterations': iteration,
            'iteration_history': iteration_history,
            'final_score': best_score
        }

        return best_image, final_metadata

    async def _improve_prompt(
        self,
        current_prompt: str,
        feedback: list[str],
        failed_count: int
    ) -> str:
        """프롬프트 개선 (Gemini 사용)"""

        refiner = PromptRefiner(genai.GenerativeModel('gemini-2.0-flash-exp'))

        improved = await refiner.improve_prompt(
            current_prompt,
            feedback,
            failed_count
        )

        return improved
```

### 6.2 배치 생성 최적화

```python
class BatchGenerator:
    """여러 에셋 동시 생성 (비용 절감)"""

    async def generate_batch(
        self,
        requests: list[AssetRequest],
        style_guide: dict,
        max_concurrent: int = 3  # Rate limit 고려
    ) -> list[tuple[Image.Image, dict]]:
        """
        배치 생성

        Args:
            requests: 에셋 요청 리스트
            style_guide: 공통 스타일 가이드
            max_concurrent: 동시 생성 수

        Returns:
            생성된 이미지 및 메타데이터 리스트
        """

        import asyncio

        # 세마포어로 동시성 제한
        semaphore = asyncio.Semaphore(max_concurrent)

        async def generate_with_limit(req):
            async with semaphore:
                return await self.iteration_manager.generate_with_refinement(
                    req,
                    style_guide,
                    self.imagen_client,
                    self.validator
                )

        # 병렬 생성
        results = await asyncio.gather(*[
            generate_with_limit(req) for req in requests
        ])

        return results
```

---

## 7. 비용 최적화

### 7.1 캐싱 전략

```python
import hashlib
import pickle
from pathlib import Path

class GenerationCache:
    """생성 결과 캐싱"""

    def __init__(self, cache_dir: str = ".cache/generated_images"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _hash_request(self, prompt: str, config: dict) -> str:
        """요청 해시 생성"""

        key = f"{prompt}:{json.dumps(config, sort_keys=True)}"
        return hashlib.sha256(key.encode()).hexdigest()

    def get(self, prompt: str, config: dict) -> Optional[tuple[Image.Image, dict]]:
        """캐시에서 가져오기"""

        cache_key = self._hash_request(prompt, config)
        cache_file = self.cache_dir / f"{cache_key}.pkl"

        if cache_file.exists():
            # TTL 체크 (15분)
            if time.time() - cache_file.stat().st_mtime < 900:
                with open(cache_file, 'rb') as f:
                    return pickle.load(f)

        return None

    def set(self, prompt: str, config: dict, image: Image.Image, metadata: dict):
        """캐시에 저장"""

        cache_key = self._hash_request(prompt, config)
        cache_file = self.cache_dir / f"{cache_key}.pkl"

        with open(cache_file, 'wb') as f:
            pickle.dump((image, metadata), f)
```

### 7.2 비용 추적

```python
class CostTracker:
    """API 비용 추적"""

    IMAGEN_4_COST_PER_IMAGE = 0.04  # $0.04 per image
    GEMINI_VISION_COST_PER_1K_TOKENS = 0.00015  # $0.15 per 1M tokens

    def __init__(self):
        self.total_images_generated = 0
        self.total_vision_calls = 0
        self.estimated_tokens = 0

    def record_image_generation(self, count: int = 1):
        """이미지 생성 기록"""
        self.total_images_generated += count

    def record_vision_call(self, estimated_tokens: int = 1000):
        """Vision API 호출 기록"""
        self.total_vision_calls += 1
        self.estimated_tokens += estimated_tokens

    def get_total_cost(self) -> float:
        """총 비용 계산"""

        image_cost = self.total_images_generated * self.IMAGEN_4_COST_PER_IMAGE
        vision_cost = (self.estimated_tokens / 1000) * self.GEMINI_VISION_COST_PER_1K_TOKENS

        return image_cost + vision_cost

    def print_summary(self):
        """비용 요약 출력"""

        print(f"""
Cost Summary:
─────────────────────────────
Images Generated: {self.total_images_generated}
  Cost: ${self.total_images_generated * self.IMAGEN_4_COST_PER_IMAGE:.4f}

Vision API Calls: {self.total_vision_calls}
  Tokens: ~{self.estimated_tokens:,}
  Cost: ${(self.estimated_tokens / 1000) * self.GEMINI_VISION_COST_PER_1K_TOKENS:.4f}

TOTAL: ${self.get_total_cost():.4f}
─────────────────────────────
""")
```

---

## 8. 구현 예제

### 8.1 완전한 에이전트 구현

```python
from dataclasses import dataclass
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AssetGeneratorAgent:
    """Asset Generator Agent 완전 구현"""

    def __init__(self, gemini_api_key: str):
        self.imagen_client = ImagenClient(gemini_api_key)
        self.validator = StyleValidator(gemini_api_key)
        self.iteration_manager = IterationManager(max_iterations=5, target_score=90.0)
        self.transparency_processor = TransparencyProcessor()
        self.cache = GenerationCache()
        self.cost_tracker = CostTracker()

    async def generate_asset(
        self,
        request: AssetRequest,
        style_guide: dict
    ) -> GeneratedAsset:
        """
        게임 에셋 생성 (메인 엔트리포인트)

        Args:
            request: 에셋 요청
            style_guide: 아트 스타일 가이드

        Returns:
            GeneratedAsset 객체
        """

        logger.info(f"Generating asset: {request.name}")

        try:
            # 캐시 확인
            cached = self.cache.get(request.description, style_guide)
            if cached:
                logger.info("  ✓ Using cached result")
                image, metadata = cached
                return self._create_asset_result(request, image, metadata, from_cache=True)

            # 반복 생성
            image, metadata = await self.iteration_manager.generate_with_refinement(
                request,
                style_guide,
                self.imagen_client,
                self.validator
            )

            # 비용 추적
            self.cost_tracker.record_image_generation(metadata['total_iterations'])
            self.cost_tracker.record_vision_call(metadata['total_iterations'] * 1000)

            # 캐시 저장
            self.cache.set(request.description, style_guide, image, metadata)

            # 파일 저장
            save_path = f"generated-assets/{request.category}/{request.name}.png"
            self._save_asset(image, save_path, metadata)

            return self._create_asset_result(request, image, metadata, save_path)

        except Exception as e:
            logger.error(f"  ✗ Generation failed: {e}")

            return GeneratedAsset(
                requestId=request.id,
                status="failed",
                error={"message": str(e), "reason": type(e).__name__}
            )

    def _save_asset(self, image: Image.Image, path: str, metadata: dict):
        """에셋 저장"""

        # 디렉토리 생성
        Path(path).parent.mkdir(parents=True, exist_ok=True)

        # 이미지 저장
        image.save(path, "PNG")

        # 메타데이터 저장
        metadata_path = path.replace('.png', '.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"  ✓ Saved to {path}")

    def _create_asset_result(
        self,
        request: AssetRequest,
        image: Image.Image,
        metadata: dict,
        save_path: Optional[str] = None,
        from_cache: bool = False
    ) -> GeneratedAsset:
        """GeneratedAsset 객체 생성"""

        return GeneratedAsset(
            requestId=request.id,
            status="success",
            image={
                "path": save_path or "in_memory",
                "format": "png",
                "size": {"width": image.width, "height": image.height},
                "fileSize": len(image.tobytes()) if not save_path else Path(save_path).stat().st_size
            },
            metadata={
                **metadata,
                "from_cache": from_cache
            }
        )
```

### 8.2 사용 예시

```python
async def main():
    """사용 예시"""

    # Agent 초기화
    agent = AssetGeneratorAgent(
        gemini_api_key=os.getenv('GEMINI_API_KEY')
    )

    # 스타일 가이드 정의
    style_guide = {
        'artStyle': 'pixel_art',
        'colorPalette': ['#2D2D2D', '#F4A460', '#8FBC8F', '#4A90E2'],
        'pixelDensity': '32x32',
        'mood': 'cheerful',
        'constraints': {
            'maxColors': 16,
            'noText': True,
            'transparentBackground': True
        }
    }

    # 에셋 요청
    requests = [
        AssetRequest(
            id="player_001",
            category="sprite",
            name="player_idle",
            description="cute pixel art monster character, small and round",
            size={"width": 512, "height": 512},
            purpose="player character idle animation"
        ),
        AssetRequest(
            id="enemy_001",
            category="sprite",
            name="enemy_slime",
            description="pixel art slime enemy, green and bouncy",
            size={"width": 256, "height": 256},
            purpose="basic enemy sprite"
        )
    ]

    # 배치 생성
    results = []
    for req in requests:
        result = await agent.generate_asset(req, style_guide)
        results.append(result)

    # 결과 요약
    print("\n" + "=" * 50)
    print("Generation Summary")
    print("=" * 50)

    for result in results:
        if result.status == "success":
            print(f"✓ {result.image['path']}")
            print(f"  Score: {result.metadata['final_score']:.1f}/100")
            print(f"  Iterations: {result.metadata['total_iterations']}")
        else:
            print(f"✗ {result.requestId}: {result.error['message']}")

    # 비용 요약
    agent.cost_tracker.print_summary()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

---

## 9. 트러블슈팅

### 9.1 일반적인 문제

| 문제 | 원인 | 해결책 |
|------|------|--------|
| **투명 배경이 제대로 안됨** | Imagen 4 설정 오류 | `transparent_background=True` 확인 |
| **스타일 일관성 낮음** | 프롬프트 모호함 | 스타일 템플릿 사용, negative prompt 강화 |
| **생성 속도 느림** | 반복 생성 많음 | 캐싱 활성화, target_score 낮춤 (85로) |
| **비용 초과** | 불필요한 재생성 | 배치 생성 사용, 캐시 활용 |
| **Rate limit 에러** | 동시 요청 많음 | `max_concurrent` 낮춤 (1-2로) |

### 9.2 디버깅 팁

```python
# 상세 로깅 활성화
import logging
logging.basicConfig(level=logging.DEBUG)

# Iteration 히스토리 저장
with open('debug_iteration_history.json', 'w') as f:
    json.dump(metadata['iteration_history'], f, indent=2)

# 중간 이미지 저장
for i, (img, meta) in enumerate(iteration_results):
    img.save(f"debug/iteration_{i+1}_score_{meta['score']:.0f}.png")
```

---

**다음 문서:** [Audio Generator Guide](./audio-generator-guide.md)
