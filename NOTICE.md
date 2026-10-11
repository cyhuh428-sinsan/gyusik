# NOTICE

규식이 (Gyusik)

- Original work: RegExr, Copyright (C) 2017 gskinner.com, inc. — https://github.com/gskinner/regexr
- Modifications: Copyright (C) 2026 cyhuh428-sinsan — https://github.com/cyhuh428-sinsan/gyusik

This program is free software: you can redistribute it and/or modify it under the terms of the
GNU General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version. See [LICENSE](LICENSE).

"RegExr" is the name of the original project by gskinner.com, inc. 규식이 is an independent
modified version and is not affiliated with or endorsed by gskinner.com, inc.

## Third-party components

- PCRE2 (BSD-3-Clause WITH PCRE2-exception), compiled to WebAssembly in
  `dev/src/pcre2-wasm/dist/libpcre2.wasm`. Licence: `dev/src/pcre2-wasm/LICENCE.PCRE2.md`.
- pcre2-wasm wrapper by J. Stephen Riley (MIT), as adapted in RegExr's `pcre-worker` branch.
  Licence: `dev/src/pcre2-wasm/LICENSE`. Changes: `dev/src/pcre2-wasm/README.md`.

## 수정 내역 (Modifications)

수정한 소스 파일에는 머리 주석에 `Modified for 규식이 (Gyusik) by cyhuh428-sinsan, <날짜>` 줄을 넣습니다.

### 2026-10-11

- 이름을 규식이로 바꿨습니다. 페이지 제목, 메타 정보, 헤더 로고(글자 로고), 소개 문구, 도움말의 About이 해당합니다.
- 헤더 링크를 "RegExr 기반"(원본 저장소)과 "소스 코드"(이 저장소)로 바꿨습니다.
- Google Analytics(gtag.js)를 제거했습니다. `Track` 모듈은 아무 일도 하지 않는 함수로 남겼습니다.
- 광고 스크립트(`dev/lib/native.js`, Carbon/BuySellAds)와 광고 영역 마크업, 스타일(`dev/sass/views/ad.scss`)을 제거했습니다.
- Google Fonts 요청을 제거했습니다. 시스템 글꼴과 한글 글꼴을 대체로 지정했습니다(`dev/sass/fonts.scss`).
- regexr.com 서버 호출을 제거했습니다(`Server.url = null`). 서버가 필요한 기능(저장, 공유, 커뮤니티, 로그인, PCRE 실행)은 네트워크 요청 없이 "준비 중" 안내를 보여줍니다. 로그인 버튼은 숨겼습니다.
- 서버 오류 결과에 `mode`가 빠져 엔진 오류가 화면에 표시되지 않던 문제를 고쳤습니다(`ServerSolver`).
- 저장 오류 문구가 "no docs for error"로 나오던 문제를 고쳤습니다(`Share._getErrMsg`).
- 로컬 실행 시 테스트 계정 대신 익명 사용자로 시작합니다.
- 빌드: `gulp-sass`를 5.1로 올리고 dart-sass(`sass`)를 직접 넘기도록 바꿨습니다. 이전 버전이 끌어오던 node-sass는 현재 Node에서 빌드되지 않습니다. 개발 서버가 브라우저를 자동으로 열지 않도록 하고, 포트를 3350으로 바꿨습니다.
- README를 규식이용으로 새로 쓰고, 원본 README는 `README.RegExr.md`로 보존했습니다.
- PCRE를 서버 대신 브라우저 안에서 실행합니다. PCRE2를 WebAssembly로 돌리는 전용 작업자(`PcreWorker.js`)와 이를 부르는 `PcreSolver.js`를 추가했습니다. RegExr의 미완성 `pcre-worker` 브랜치(2023)를 바탕으로 했습니다. wasm은 PCRE를 처음 고를 때만 불러오고, 작업자 파일 위치를 기준으로 찾습니다. 엔진 이름은 "PCRE2 (Browser)"로 표시합니다.
- 그 브랜치의 `libpcre2.wasm`은 텍스트로 커밋되면서 깨져 있었습니다. npm `@stephen-riley/pcre2-wasm@1.2.4`의 정상 파일로 바꾸고, `.gitattributes`에 `*.wasm binary`를 추가했습니다.
- 원본 버그 수정: JS 엔진에서 요청이 연달아 들어오면 이전 작업자의 타이머가 남아 최신 결과를 거짓 "timeout" 오류로 덮어쓰던 문제(`BrowserSolver`).
- 빌드: `pcre-worker`, `copy-wasm` 작업을 추가했습니다. index.html은 `<meta name="pcre-worker">`로 작업자 위치를 알려줍니다.
- 도움말의 엔진 설명과 소개 문구를 PCRE2 브라우저 실행에 맞게 고쳤습니다.
- 설계안 화면 1(작업대)을 새로 만들었습니다(`dev/gyusik/`, 빌드 결과는 `gyusik.html`). RegExr의 화면 코드는 쓰지 않고, 어휘 분석기(`ExpressionLexer`)와 프로필, PCRE2 실행기(`PcreSolver`)만 재사용합니다. 패턴 구조 분석과 한국어 풀이(`model.js`), 선로도(`railroad.js`), 진단·추천 규칙(`diagnose.js`), JS 실행기(`JsSolver.js`)는 새로 작성했습니다.
- 설정 > AI와 한국어 문장으로 정규식 만들기(온라인 전용)를 추가했습니다(`ai.js`, `aiui.js`). OpenAI 호환과 Anthropic 호환 두 방식, 제공자 8종 프리셋, 모델 목록 조회, 추론 등급 선택을 지원합니다. AI 답은 기기에서 컴파일·예시 검증·진단을 거친 뒤에만 보여줍니다.
- 배우기(화면 4) 1~6강을 추가했습니다(`lessons.js`, `learn.js`). 한국어로 새로 쓴 강의 6개와 실습 16문제이며, 쉬운 말을 먼저 쓰고 용어는 괄호에 넣었습니다. 실습은 입력할 때마다 기기에서 채점하고 진행 상황은 기기에 저장합니다.
- 내 패턴을 추가했습니다(`saved.js`). 패턴, 플래그, 엔진, 테스트 텍스트, 테스트 케이스, 이름, 태그를 이 기기에 저장하고, .json 파일로 내보내고 가져옵니다. 가져온 파일은 신뢰하지 않고 모든 필드를 검사·길이 제한한 뒤에 저장합니다.
- 규식이를 기본 화면으로 바꿨습니다. 빌드 결과의 `index.html`이 규식이이고, RegExr 화면은 `regexr-legacy.html`로 남겼습니다. 규식이에는 PHP 서버가 없어 `index.php`와 `server/`는 배포본에 넣지 않습니다.
- 배우기 7~11강을 추가했습니다(많이 vs 적게, 앞뒤 살피기, 엔진마다 다른 점, 느려지는 패턴, 한글 다루기). 총 11강, 실습 29문제입니다. 실습 채점에 "일치한 내용이 정확히 이것이어야 함"(`found`)과 "패턴에 이 문법이 있어야 함"(`must`)을 추가했습니다.
- 작업대에 치환·추출 탭을 추가했습니다. 테스트 텍스트에서 일치한 부분을 지정한 문자열로 바꾸거나($&, $1, $<이름>, JavaScript / $0, ${이름}, PCRE2), 일치할 때마다 지정한 형식으로 모아 보여줍니다. JavaScript 실행기(`JsSolver`)에 치환·추출을 추가했고, 느린 패턴은 작업자에서 중단됩니다.
- 한국어 레퍼런스·치트시트를 추가했습니다(`reference.js`). 7개 묶음 41개 항목을 새로 썼고, 엔진별 지원 여부, 주의점, 관련 강의가 들어 있으며 검색과 "패턴 끝에 붙이기"가 됩니다. 작업대의 설명 줄에는 해당 강의로 가는 링크를 붙였습니다.
- Windows 설치형(Electron)을 추가했습니다(`desktop/`). 웹 화면과 같은 코드를 앱 안에 넣고, 외부로 나가는 요청을 기본적으로 모두 차단하며(예외는 사용자가 설정에 입력한 AI 서버 한 곳), 관리자 정책 파일로 더 좁힐 수 있습니다. AI 키는 Windows 보안 저장소로 암호화합니다. 자세한 내용은 `desktop/README.md`를 보세요.
- PCRE2 실행이 실패하거나 시간 초과가 나면 결과에 `matches`가 없어 화면 그리기가 멈추던 문제를 고쳤습니다(`PcreSolver`).
