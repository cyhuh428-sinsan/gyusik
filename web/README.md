# 웹 배포 (gyusik.sinsan.kr)

정적 사이트를 nginx 컨테이너로 띄웁니다. 호스트 포트는 열지 않고, 앞단의 Nginx Proxy Manager가 `proxy-network`를 통해 컨테이너(`gyusik-site:80`)에 연결합니다. 같은 서버의 `nownote` 사이트와 같은 방식입니다.

## 만드는 법

```bash
npx gulp deploy          # build/ 에 배포본이 만들어집니다 (약 1.3MB)
```

서버의 `~/deploy/regexr` 아래에 이렇게 놓습니다.

```
~/deploy/regexr/
  Dockerfile  nginx.conf  compose.yml     ← 이 폴더(web/)의 파일
  site/                                   ← build/ 의 내용
```

```bash
cd ~/deploy/regexr && docker compose up -d --build
```

확인: 컨테이너 안에서 `/healthz`가 `ok`를 돌려줍니다.

## 프록시 설정 (Nginx Proxy Manager, 서버의 :81 관리 화면)

- Proxy Host 추가: 도메인 `gyusik.sinsan.kr`, 대상 `http` · `gyusik-site` · 포트 `80`
- SSL 탭: 새 인증서(Let's Encrypt) 요청, Force SSL 켜기
- Websocket은 필요 없습니다.

## 보안 헤더

`nginx.conf`가 Content-Security-Policy 등을 붙입니다. 스크립트는 같은 사이트의 것만 허용하고(wasm 실행은 허용), AI 연결용으로 `https:` 요청만 열어 둡니다. 화면에서 외부 스크립트나 글꼴을 불러오지 않으므로 이 정책 아래에서 모든 기능이 동작하는 것을 확인했습니다.

## 업데이트

새 빌드로 `site/`를 바꾸고 `docker compose up -d --build`를 다시 실행합니다. 파일 이름에 해시가 없어서 `Cache-Control: no-cache`로 항상 최신인지 확인하게 해 두었습니다.

## 원래 RegExr 화면

공개 사이트 이미지에서는 `regexr-legacy.html`과 `assets/`를 지웁니다(Dockerfile).
