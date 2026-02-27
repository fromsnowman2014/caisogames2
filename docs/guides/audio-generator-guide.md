# Audio Generator Implementation Guide

## V2 개선사항: 실제 오디오 파일 생성

**V1의 한계:**
- Web Audio API 코드만 생성 (실제 파일 없음)
- 수동 통합 필요
- 품질 검증 불가

**V2 솔루션:**
- Gemini + 외부 오디오 API로 실제 WAV/MP3 파일 생성
- 자동 품질 검증
- 게임 엔진에 바로 통합 가능

---

## 1. 아키텍처

```
User Request (SFX/BGM)
    ↓
[Audio Designer Agent]
    ├→ Gemini: 사운드 디자인 파라미터 생성
    ├→ Audio API: 실제 오디오 파일 생성
    ├→ Quality Validator: 품질 검증
    └→ Audio Processor: 포맷 변환, 압축
    ↓
Generated Audio (WAV/MP3 + Metadata)
```

---

## 2. Gemini 기반 사운드 디자인

### 2.1 SFX (효과음) 생성

```python
class AudioDesignerAgent:
    def __init__(self, gemini_key: str, audio_api_key: str):
        self.gemini = genai.GenerativeModel('gemini-2.0-flash-exp')
        # 외부 오디오 생성 API (추후 통합)
        self.audio_api = None  # Stable Audio, AudioCraft 등

    async def generate_sfx(self, request: SFXRequest) -> AudioFile:
        """효과음 생성"""

        # Step 1: Gemini로 사운드 디자인 파라미터 생성
        design_prompt = f"""
You are an Expert Sound Designer for games.

Design parameters for: {request.description}

Category: {request.category}  # ui, gameplay, feedback, ambient
Duration: {request.duration}ms
Style: {request.style}  # retro, modern, realistic

Provide as JSON:
{{
  "sound_type": "beep|whoosh|impact|thud|click|etc",
  "frequency_range": "low|mid|high",
  "envelope": {{
    "attack": 0.01,    // seconds
    "decay": 0.1,
    "sustain": 0.5,    // 0-1
    "release": 0.2
  }},
  "waveform": "sine|square|sawtooth|triangle",
  "effects": ["reverb", "distortion", "chorus"],
  "reference_sounds": ["8-bit coin collect", "retro jump"],
  "text_prompt_for_audio_api": "short 8-bit coin collection sound, bright and cheerful, arcade game style"
}}
"""

        response = await self.gemini.generate_content_async(design_prompt)
        params = json.loads(response.text)

        # Step 2: 실제 오디오 생성 (외부 API 또는 Procedural)
        if self.audio_api:
            # Option A: 외부 Audio Generation API
            audio = await self.audio_api.generate(
                prompt=params['text_prompt_for_audio_api'],
                duration=request.duration / 1000,
                style=request.style
            )
        else:
            # Option B: Procedural 생성 (Web Audio API 코드 실행)
            audio = await self._generate_procedural(params, request.duration)

        return audio

    async def _generate_procedural(self, params: dict, duration: int) -> AudioFile:
        """Procedural 오디오 생성 (Web Audio API 코드 실행)"""

        # Gemini로 Web Audio API 코드 생성
        code_prompt = f"""
Generate Web Audio API JavaScript code to create this sound:

Parameters: {json.dumps(params)}
Duration: {duration}ms

Output a complete function that:
1. Creates AudioContext
2. Generates the sound
3. Exports as WAV blob
4. Returns base64 encoded WAV

Function signature:
async function generateSound() {{ ... return base64WavData; }}

Output code only (no explanation, no markdown).
"""

        code_response = await self.gemini.generate_content_async(code_prompt)
        js_code = code_response.text

        # Node.js 환경에서 실행하여 WAV 파일 생성
        wav_data = await self._execute_webaudio_nodejs(js_code)

        return AudioFile(
            data=wav_data,
            format="wav",
            sample_rate=44100,
            channels=1,
            duration_ms=duration
        )

    async def _execute_webaudio_nodejs(self, js_code: str) -> bytes:
        """Node.js에서 Web Audio API 코드 실행"""

        import subprocess
        import tempfile

        # Temporary file for code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            # Web Audio API를 Node.js에서 실행 가능하게 래핑
            wrapped_code = f"""
const {{ AudioContext }} = require('web-audio-api');
const fs = require('fs');

{js_code}

(async () => {{
  const base64Data = await generateSound();
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync('{f.name}.wav', buffer);
}})();
"""
            f.write(wrapped_code)
            code_file = f.name

        # Execute
        subprocess.run(['node', code_file], check=True)

        # Read generated WAV
        with open(f"{code_file}.wav", 'rb') as f:
            wav_data = f.read()

        # Cleanup
        os.remove(code_file)
        os.remove(f"{code_file}.wav")

        return wav_data
```

### 2.2 BGM (배경음악) 생성

```python
async def generate_bgm(self, request: BGMRequest) -> AudioFile:
    """배경음악 생성"""

    composition_prompt = f"""
You are an Expert Game Music Composer.

Compose background music for: {request.scene}

Mood: {request.mood}  # upbeat, tense, peaceful, mysterious
Tempo: {request.tempo} BPM
Duration: {request.duration} seconds
Style: {request.style}  # chiptune, orchestral, electronic, ambient

Provide as JSON:
{{
  "instruments": ["piano", "strings", "drums"],  # 3-5 max
  "chord_progression": ["C", "Am", "F", "G"],
  "melody_pattern": "stepwise motion, arpeggios",
  "rhythm_pattern": "4/4 time, steady beat",
  "loop_point": {request.duration - 2},  # seconds (for seamless loop)
  "text_prompt": "upbeat chiptune music, 8-bit style, energetic platformer game theme"
}}
"""

    response = await self.gemini.generate_content_async(composition_prompt)
    composition = json.loads(response.text)

    # 외부 Music Generation API 호출 (MusicLM, AudioCraft 등)
    if self.audio_api:
        bgm = await self.audio_api.generate_music(
            prompt=composition['text_prompt'],
            duration=request.duration,
            tempo=request.tempo,
            loopable=True,
            loop_point=composition['loop_point']
        )
    else:
        # Procedural (Tone.js 코드 생성 및 실행)
        bgm = await self._generate_tonejs_music(composition, request)

    return bgm
```

---

## 3. 품질 검증

```python
import librosa
import numpy as np

class AudioQualityValidator:
    """오디오 품질 검증"""

    @staticmethod
    def validate_sfx(audio_file: AudioFile, expected_duration: int) -> dict:
        """효과음 품질 검사"""

        # Load audio
        y, sr = librosa.load(audio_file.path, sr=None)

        # 1. 길이 검증
        actual_duration_ms = len(y) / sr * 1000
        duration_match = abs(actual_duration_ms - expected_duration) < 100  # 100ms tolerance

        # 2. 클리핑 검사
        clipping = np.sum(np.abs(y) > 0.99) / len(y)

        # 3. RMS 레벨 (너무 조용하거나 시끄럽지 않은지)
        rms = librosa.feature.rms(y=y)[0]
        avg_rms = np.mean(rms)

        # 4. 주파수 분석
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        avg_frequency = np.mean(spectral_centroid)

        issues = []

        if not duration_match:
            issues.append(f"Duration mismatch: {actual_duration_ms:.0f}ms vs {expected_duration}ms")

        if clipping > 0.01:  # 1% 이상 클리핑
            issues.append(f"Audio clipping detected ({clipping:.1%})")

        if avg_rms < 0.1:
            issues.append("Audio too quiet (RMS < 0.1)")
        elif avg_rms > 0.9:
            issues.append("Audio too loud (RMS > 0.9)")

        return {
            'passed': len(issues) == 0,
            'duration_match': duration_match,
            'clipping_ratio': clipping,
            'rms_level': avg_rms,
            'avg_frequency': avg_frequency,
            'issues': issues
        }
```

---

## 4. 사용 예시

```python
async def main():
    agent = AudioDesignerAgent(
        gemini_key=os.getenv('GEMINI_API_KEY'),
        audio_api_key=os.getenv('AUDIO_API_KEY')
    )

    # SFX 생성
    coin_sfx = await agent.generate_sfx(SFXRequest(
        description="8-bit coin collection sound",
        category="gameplay",
        duration=200,
        style="retro"
    ))

    coin_sfx.save("assets/audio/coin_collect.wav")

    # BGM 생성
    forest_bgm = await agent.generate_bgm(BGMRequest(
        scene="peaceful forest",
        mood="peaceful",
        tempo=90,
        duration=60,
        style="chiptune"
    ))

    forest_bgm.save("assets/audio/bgm_forest.mp3")

if __name__ == "__main__":
    asyncio.run(main())
```

---

**문서 버전:** 1.0
