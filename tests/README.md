# 테스트

```
npm test
```

Node 내장 테스트 러너로 실행합니다(추가 패키지 없음). 브라우저용 코드를 그대로 불러오기 위해 `register.mjs`가 `window`·`localStorage`를 흉내 내고, `loader.mjs`가 확장자 없는 import를 해석합니다. PR마다 GitHub Actions(`.github/workflows/test.yml`)가 `npm test`와 `npx gulp deploy`(빌드)를 실행합니다.

## 지금 검사하는 것 (46개)

| 파일 | 대상 |
| --- | --- |
| `logic.test.mjs` | 한국어 요약·설명 행, 실수 찾기(진단), 예시 기반 생성, 패턴 라이브러리 13종(일치/불일치 예시) |
| `content.test.mjs` | 11개 강의 29개 실습의 정답이 자기 검사를 모두 통과하는지, 빈 패턴·`.*`로 통과할 수 없는지, 강의 링크가 실제 강의를 가리키는지 |
| `storage-ai.test.mjs` | 내 패턴 저장·내보내기·가져오기(악의적 파일 포함), AI 요청(OpenAI·Anthropic 호환, 로컬 가짜 서버), 오류 메시지에 키가 새지 않는지 |

## 브라우저 E2E (`npm run test:e2e`)

Playwright로 빌드 결과(`build/`, 먼저 `npx gulp deploy`)를 띄워 **Chromium · Firefox · WebKit(Safari 계열)** 에서 같은 시험을 돌립니다(`tests/e2e/app.spec.mjs`). 처음 한 번 `npx playwright install chromium firefox webkit`가 필요합니다.

- 콘솔 오류 0·외부 요청 0, 패턴 입력→요약·선로도·일치 개수 갱신, 플래그, JS와 PCRE2(wasm) 엔진 차이, 진단, 느려지는 패턴의 중단 안내, 테스트 케이스, 치환, 만들기→작업대 전달, 배우기 실습 채점, 내 패턴 저장·새로고침 유지
- 외부 요청을 모두 막은 상태에서 핵심 기능 동작(오프라인), AI 키 암호화 저장(평문 없음)
- 레이아웃: 1920×1080 · 1366×768 · 1024×768 · 390×844에서 모든 화면이 가로로 넘치지 않는지, 여백이 상하좌우 같은지

CI(`.github/workflows/test.yml`)가 PR마다 단위 테스트와 E2E 3종 브라우저를 실행합니다. 이 Windows PC에서는 Firefox 실행 파일이 시작되지 않아(`spawn UNKNOWN`) Firefox는 CI에서만 검증합니다. WebKit에서는 IndexedDB 제한으로 키 암호화 시험 1개를 건너뜁니다.

## 아직 검사하지 않는 것

접근성·키보드 조작, 큰 입력의 성능, 설치형(Electron) 앱의 설치 시험. 설치형의 자체 점검은 `desktop`에서 `npm run smoke`로 실행합니다.
