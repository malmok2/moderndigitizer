# 그래프 디지타이저

논문 그림에서 숫자를 되찾는 도구. 캡처한 그림을 붙여넣고, 축 눈금 네 곳을 찍어 값을 적고,
곡선을 자동으로 훑어 CSV 로 내보낸다. **HTML 파일 하나로 완결** — 서버·설치·인터넷 연결이 필요 없다.
그림은 브라우저 밖으로 나가지 않는다.

**열기:** https://malmok2.github.io/moderndigitizer/ (GitHub Pages) 또는 `docs/index.html` 을 내려받아 더블클릭.
처음이면 **예제 그림으로 해보기**를 누르면 된다.

## 세 걸음

1. **그림** — <kbd>Ctrl+V</kbd> 로 캡처를 붙여넣는다 (윈도우 <kbd>Win+Shift+S</kbd>, 맥 <kbd>⌘⇧4</kbd>).
   창에 끌어다 놓거나 파일로 열어도 된다.
2. **축 맞추기** — 가로축 눈금 두 곳(X1·X2)과 세로축 눈금 두 곳(Y1·Y2)을 찍고 그 값을 적는다.
   네 점이므로 **기울어져 스캔된 그림도 그 자리에서 바로잡힌다**. 로그 축은 체크 한 번.
3. **점 따기** — 곡선 색을 스포이드로 찍고 **자동 추출**을 돌리거나, 그림을 클릭해 손으로 찍는다.
   그 다음 **복사**를 눌러 엑셀·Origin 에 <kbd>Ctrl+V</kbd>.

## 할 수 있는 것

| | |
|---|---|
| 열기 | 붙여넣기 · 끌어다 놓기 · 파일 열기 (PNG · JPG · GIF · WEBP) |
| 축 | 선형 · 로그, 축마다 따로. 네 점 아핀 변환이라 기울어진 그림도 맞는다 |
| 자동 추출 | **색으로**(스포이드 + 허용 오차) 또는 **어두운 선**(흑백 그림). **선**은 세로줄마다 한 점, **점(마커)** 은 덩어리마다 가운데 |
| 영역 | 끌어서 지정. 안 하면 축 네 점이 만드는 네모 안쪽만 훑는다 |
| 손질 | 클릭해 찍기 · 끌어서 옮기기 · <kbd>Alt</kbd>+클릭으로 지우기 · 사각형 지우개 · 방향키로 1 px 밀기 · 되돌리기 60단계 |
| 데이터셋 | 곡선마다 하나씩, 색과 이름을 준다. 한 그림에서 여러 곡선을 따로 뽑는다 |
| 보기 | 확대경(10×) · 커서 자리의 값 표시 · 축 보조선 · 추출 영역 미리보기 · 그림 흐리게 |
| 표 | 뽑은 값을 표로 보고, 줄을 누르면 그림에서 그 점이 깜빡인다. 아래에 되그린 미리보기 |
| 내보내기 | CSV · TSV · JSON, 클립보드 복사 또는 파일. X 순 정렬 · 유효숫자 지정 · 긴 형식 |
| 작업 저장 | 그림·축·점을 `.digi.json` 파일 하나로 묶는다. 다음에 그대로 이어서 하거나 주고받는다 |
| 이어하기 | 새로 고쳐도 하던 자리에서 이어진다 (이 브라우저 안에만 저장된다) |
| 언어·화면 | 한국어 / English · 밝은 화면 / 어두운 화면 |

**단축키** — <kbd>휠</kbd> 확대 · <kbd>Space+끌기</kbd> 이동 · <kbd>1</kbd>~<kbd>4</kbd> 축 점 ·
<kbd>Ctrl+Z</kbd> 되돌리기 · <kbd>T</kbd> 표 · <kbd>F</kbd> 화면 맞춤 · <kbd>Delete</kbd> 점 지우기.

## 얼마나 맞는가

`tools/check.js` 가 **아는 함수를 그린 그림**을 만들어 넣고, 뽑아낸 값을 그 함수와 비교한다.
800×600 px 그림에서 (`node tools/check.js`, v1.0.0):

| 그림 | 결과 |
|---|---|
| 선형 축, 빨강 `y = x²` (세로 범위 100) | 139점, 참값과 최대 차이 **0.33** |
| 선형 축, 파랑 `y = 10x` | 148점, 최대 차이 **0.06** |
| 로그-로그, 검은 `y = 10⁻³·x^0.7` | 148점, 최대 **상대오차 0.42 %** |
| 로그-로그, 초록 네모 마커 넷 | 자리 오차 **0.5 % 이내** |

**남는 오차는 대부분 그림 자체의 한계다.** 선 굵기가 3 px 이면 그 선이 가리키는 값도 3 px 폭만큼
번져 있다. 이 도구는 그 가운데를 잡을 뿐이다. 더 정확히 뽑고 싶으면 **더 큰 그림**을 쓴다 —
PDF 를 200 % 이상으로 키워서 캡처하면 차이가 확 준다.

## 자동 추출이 잘 안 될 때

- **엉뚱한 점이 잔뜩** — 허용 오차를 줄인다. 그래도 남으면 지우개로 쓸어 낸다.
- **곡선이 끊겨서 나온다** — 허용 오차를 키운다. 점선·파선이면 어차피 끊긴다.
- **격자선이 딸려 온다** — 격자선 색과 곡선 색이 비슷하면 어쩔 수 없다. **영역 지정**으로 범위를 좁히거나
  손으로 찍는다.
- **축선·눈금이 딸려 온다** — 축 네 점을 축선 위에 정확히 찍으면 그 안쪽 3 px 만 훑으므로 대개 사라진다.
- **한 세로줄에 점이 둘씩** — 곡선이 되접히거나 다른 곡선과 색이 같은 경우다. 데이터셋을 나눠 영역을 따로 잡는다.
- **흑백 그림** — **어두운 선** 모드를 쓴다. 허용 오차가 밝기 문턱이 된다.
- 어떤 경우든 **추출 영역 미리보기**를 켜면 무엇이 잡히는지 눈으로 먼저 보고 돌릴 수 있다.

## 뷰어 다시 굽기

`tools/digitizer_template.html` 이 소스다. `build.cmd` (또는 아래 명령)를 실행하면 Pretendard 글꼴과
예제 그림을 박아 넣은 `docs/index.html` 과 홈페이지용 `docs/banner.svg` · `docs/icon.svg` 가 함께 만들어진다.
버전은 `tools/VERSION` 한 곳.

```bash
python tools/build_digitizer.py
# 또는: python tools/build_digitizer.py tools/digitizer_template.html docs/index.html
```

굽고 나면 반드시 확인한다. 숫자를 다루는 도구라 "열린다"로는 부족하다.

```bash
npm i -D playwright && npx playwright install chromium
node tools/check.js
```

내장 예제 그림(`examples/sample.png`)은 논문 그림처럼 생겼지만 **실제 측정 결과가 아니고**, 그림 안에도
그렇게 적혀 있다.

## 홈페이지에 걸기

```html
<a href="https://malmok2.github.io/moderndigitizer/" target="_blank" rel="noopener">
  <img src="https://malmok2.github.io/moderndigitizer/banner.svg" alt="그래프 디지타이저" width="360" height="96">
</a>
```

THINKLAB 홈페이지(`Think_webpage`)의 도구 목록에 넣으려면 `src/data/tools.ts` 의 `labTools` 에 한 칸 더한다.

```ts
{
  id: "plot-digitizer",
  name: "Plot Digitizer",
  description: {
    ko: "논문 그림에서 데이터를 되찾아 CSV 로 내보내는 도구",
    en: "Pulls the numbers back out of a published figure and exports them as CSV",
  },
  url: "https://malmok2.github.io/moderndigitizer/",
  iconUrl: "https://malmok2.github.io/moderndigitizer/icon.svg",
  credits: { ko: "송민섭 · 2026년 제작", en: "Min Seop Song · Built in 2026" },
},
```

## 만든 방식

화면 규칙은 CAD 3D 뷰어와 같은 한 벌을 쓴다 — 액센트색 하나(`#0f4c81`), 유리 패널, 가라앉은 트랙의
세그먼트 컨트롤, Pretendard. 어두운 화면은 값 한 벌만 갈아 끼운다.
데이터셋 색 아홉은 [Okabe–Ito 색맹 안전 팔레트](https://jfly.uni-koeln.de/color/)에서 흰 배경에 쓸 수 있는 것을 골랐다.

점은 언제나 **그림 픽셀 좌표**로 들고 있고, 값은 내보낼 때 계산한다. 그래서 축을 다시 맞추면
이미 찍어 둔 점들의 값이 전부 따라 바뀐다 — 눈금을 잘못 읽었어도 처음부터 다시 찍을 필요가 없다.

## 라이선스

MIT (`LICENSE`). 내장 글꼴 Pretendard 는 SIL Open Font License 1.1.
