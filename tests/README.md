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

## 아직 검사하지 않는 것

화면(DOM) 동작, JS·PCRE2 엔진 실행(Web Worker/WebAssembly), 접근성·키보드, Firefox/Safari, 큰 입력의 성능, 설치형(Electron) 앱의 설치 시험. 설치형의 자체 점검은 `desktop`에서 `npm run smoke`로 실행합니다.
