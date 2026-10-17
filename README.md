# Maqueen 시뮬레이터

micro:bit 마퀸(DFRobot Maqueen, ROB0148) 로봇을 **MakeCode 블록 · MakeCode JavaScript · MicroPython** 으로 코딩하고, 3D 공간에서 바로 시뮬레이션하는 웹 기반 교수·학습 도구입니다.

설치 없이 브라우저에서 실행되며, 모든 라이브러리가 `vendor/` 에 포함되어 있어 인터넷이 없는 교실에서도 정적 웹 서버만으로 동작합니다.

## 주요 기능

- **코딩 스페이스 / 시뮬레이션 영역 분할 화면** (가운데 분할 바로 크기 조절)
- **3가지 코딩 방식**
  - 🧩 MakeCode 스타일 블록 (기본 · 입력 · 마퀸 · RGB LED · 음악 · LED · 반복 · 논리 · 변수 · 계산 · 함수 · 핀 · 시리얼)
  - `{ }` MakeCode JavaScript (`basic`, `input`, `led`, `music`, `pins`, `serial`, `maqueen`, `neopixel` API)
  - 🐍 MicroPython (`microbit`, `maqueen`, `music`, `neopixel`, `machine`, `utime` 모듈)
  - 블록 → JavaScript / MicroPython 자동 변환 및 미리보기
- **마퀸 기본 모델의 모든 부품 시뮬레이션**
  - N20 모터 2개 (I2C 0x10, 차동 구동 물리 모델, 응답 지연·데드존 반영)
  - 라인 센서 2개 (P13/P14, 바닥 텍스처의 밝기를 실제로 샘플링)
  - 초음파 센서 (P1 Trig / P2 Echo, ±15° 빔 레이캐스트, `time_pulse_us` 지원)
  - 빨간 LED 2개 (P8/P12), RGB 네오픽셀 4개 (P15), 부저 (P0), IR 수신기 + 가상 리모컨, 서보 S1/S2
  - micro:bit 5×5 LED, 버튼 A/B/A+B, 흔들기, 빛·온도·가속도·나침반(로봇 방향 연동) 센서, 시리얼 콘솔
- **센서 · 장치 상태창**: 라인 센서 L/R, 초음파 거리 게이지, 모터 방향·속도, LED, RGB, 서보, 부저, 나침반, IR, 속도, 위치 실시간 표시 + 3D 화면 HUD
- **15개 주행 공간**
  - 공간: 개활지, 장애물 공간, 격벽 공간(방과 통로), 미로 7×7, 미로 10×10, ㄹ자 복도
  - 라인트레이싱: 타원, 8자(교차로), 사각(직각 코너), 곡선, 물결, 지그재그, 라인+장애물, 스모 링, 격자 도로
- **38개 예제**: micro:bit 기본, 마퀸 부품별 실습, 초음파 주행 응용(장애물 회피·거리 유지·미로 탈출 등), 라인트레이싱, MicroPython 직접 제어, MakeCode JavaScript
- 카메라(자유 · 위 · 추적 · 1인칭), 시뮬레이션 속도(½×~4×), 초음파 빔·주행 궤적 표시, 로봇 드래그 이동/회전
- 작업 자동 저장(브라우저) 및 프로젝트 파일 저장/불러오기 (`.json`, `.py`, `.js`)

## 실행 방법

정적 파일만으로 동작합니다. 아무 웹 서버로 폴더를 열면 됩니다.

```bash
python -m http.server 8000
```

브라우저에서 `http://localhost:8000` 을 엽니다.

## 마퀸(ROB0148) 연결 정보

| 장치 | 연결 | 비고 |
|---|---|---|
| 모터 M1(왼쪽) / M2(오른쪽) | I2C 0x10 | 레지스터 0x00 / 0x02 ← [방향(0 전진, 1 후진), 속도 0~255] |
| 라인 센서 왼쪽 / 오른쪽 | P13 / P14 | 검은 선 = 1, 흰 바닥 = 0 |
| 초음파 센서 | P1(Trig) / P2(Echo) | 거리(cm) = 펄스(us) ÷ 58 |
| 빨간 LED 왼쪽 / 오른쪽 | P8 / P12 | |
| RGB LED ×4 | P15 | 네오픽셀 |
| 부저 | P0 | |
| IR 수신기 | P16 | |
| 서보 S1 / S2 | I2C 0x10 | 레지스터 0x14 / 0x15 ← [각도] |

## 구조

```
index.html          화면 구성
css/style.css       스타일
js/assets.js        5x5 폰트, 아이콘, 멜로디
js/world.js         주행 공간(맵) 정의
js/robot.js         로봇 물리 모델과 센서
js/hardware.js      시뮬레이션 시계, micro:bit/마퀸 하드웨어 상태, 소리
js/render3d.js      Three.js 3D 렌더링과 로봇 모델
js/jsrt.js          MakeCode JavaScript 실행기 (acorn 으로 async 변환)
js/pyrt.js          MicroPython 실행기 (Skulpt) 와 파이썬 모듈
js/blocks.js        Blockly 블록 정의, JavaScript/MicroPython 코드 생성
js/examples.js      예제
js/app.js           UI, 편집기, 실행 제어, 시뮬레이션 루프
vendor/             three.js, Blockly, CodeMirror, Skulpt, acorn, astring
```

## 사용 라이브러리

three.js r147 (MIT), Blockly 10 (Apache-2.0), CodeMirror 5 (MIT), Skulpt 1.2 (MIT/PSF), acorn (MIT), astring (MIT)


## 상용 프롬프트
- 웹기반 마이크로비트 응용 학습 시뮬레이터 구축
- 외형 및 사양 정보 참조 사이트 : https://www.icbanq.com/P008605720?srsltid=AU7gw4XlVXdfuuEZKjLbaQ7cGFSh7iCgILA5kpObhp4U1ImNUGtzNWTB 
- 3D 모델링을 통해 마퀸에 연결된 모든 요소들을 마이크로비트를 통해 코딩과 시뮬레이션이 가능하도록 구현. 마퀸 기본 모델 기준
- 마퀸을 구동할 수 있는 다양한 공간 제공(개활지, 장애물, 격벽 공간 , 미로 등)
- 초음파 센서를 활용한 장애물 회피, 미로 찾기 등 다양한 구동 예제 추가.
- 라인트레이싱이 가능한 다양한 맵 제공.
- 개별적 요소를 실습할 수 있는 기본 예제 다수 추가.
- makecode, micropython을 사용하여 코딩.
- 코딩 스페이스와 시뮬레이션 영역으로 구분하여 구현.
