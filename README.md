# 규식이 (Gyusik)

한국어로 정규식을 배우고, 만들고, 테스트하는 도구입니다. 인터넷이 없는 폐쇄망에서도 핵심 기능이 동작하는 것을 목표로 합니다.

- 웹: https://gyusik.sinsan.kr (준비 중)
- 원본: [RegExr](https://github.com/gskinner/regexr) (Grant Skinner, gskinner.com)

## 지금 상태

1차 프로토타입을 만들고 있습니다.

- 지금 되는 것: JavaScript와 PCRE2 엔진(둘 다 브라우저 안에서 실행)으로 실시간 매칭, 하이라이트, 테스트, 도구(Replace·List·Details·Explain), 레퍼런스, 치트시트
- 외부로 나가는 요청이 없습니다. 분석 도구, 광고, 웹 글꼴, regexr.com 서버 호출을 모두 제거했습니다.
- 폐쇄망용 Windows 설치형: `desktop/` (아래 참조)
- 준비 중인 것: 규식이 중계 서버, 단계 실행 디버거, Python 엔진, 앱 아이콘

PCRE2는 WebAssembly(`libpcre2.wasm`)로 별도 작업자에서 실행됩니다. 배포할 때 `pcre-worker.js`와 `libpcre2.wasm`이 같은 폴더에 있어야 합니다(빌드가 알아서 넣습니다).

## 새 화면 (작업대)

규식이의 기본 화면(`/`)입니다. 작업대(패턴, 한 줄 요약, 선로도, 테스트 텍스트와 테스트 케이스, 설명·진단·추천), 만들기(예시로 만들기, 한국어 문장으로 만들기), 배우기(1~11강), 내 패턴(저장, 내보내기, 가져오기), 설정(AI 연결)이 있고, 한국어 문장 생성만 인터넷이 필요합니다. 처리는 모두 브라우저 안에서 이뤄집니다. 원래 RegExr 화면은 `/regexr-legacy.html`에 남겨 두었습니다.

## 개발

Node 24에서 확인했습니다.

```bash
npm ci --ignore-scripts
npx gulp
```

`npx gulp`은 빌드 후 http://localhost:3350 에 개발 서버를 띄우고 파일이 바뀌면 다시 빌드합니다. 배포용 빌드는 `npx gulp deploy`이며 결과는 `deploy/`에 생깁니다.

## Windows 설치형

`desktop/README.md`에 만드는 법, 폐쇄망 반입 안내, 외부 통신 정책(관리자 정책 파일)을 적었습니다. 설치 파일 하나로 서버·인터넷 없이 쓸 수 있습니다.

## 원본과 라이선스

규식이는 gskinner.com, inc.의 RegExr를 바탕으로 만든 수정판이며, 원본과 같이 [GNU General Public License v3.0](LICENSE)을 따릅니다. 원본에서 바꾼 내용은 [NOTICE.md](NOTICE.md)에 날짜와 함께 기록합니다. 원본 README는 [README.RegExr.md](README.RegExr.md)에 있습니다.

"RegExr"는 원작자의 프로젝트 이름이며, 규식이는 원작자와 관련이 없는 독립적인 수정판입니다.
