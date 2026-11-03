# I luv HDL 🍪

커피 한 잔과 함께 머무는 온라인 집중 카페.

## 기능

- 눈 내리는 입장 화면과 카페 문종 소리
- 커피·말차·핫초콜릿·토스트 선택, 영어 원두 목록
- 25·45·60분 / 무제한 집중 타이머
- 같은 방 번호로 입장, 입장·주문 알림, 전체 채팅과 귓속말
- YouTube 공식 플레이어 사운드 선택
- 쿠키 사이트 아이콘과 별 모양 커서

## 실행 중인 서비스

https://slow-room-soohyun.yaniyaabi.chatgpt.site/

## 로컬 개발

Node.js 22.13 이상이 필요합니다.

~~~sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
npm run dev
~~~

개발 서버: http://127.0.0.1:5173/

로컬 로그인: http://127.0.0.1:5173/signin-with-chatgpt?return_to=/

로컬의 테스트 로그인과 데이터베이스는 실제 서비스와 분리되어 있습니다.

## 구성

- React + TypeScript + Vinext/Vite
- Cloudflare Workers + D1
- app/page.tsx: 카페 화면과 타이머
- components/room-chat.tsx: 게임형 채팅 UI
- components/music-player.tsx: 공식 YouTube 플레이어
- app/api/room/route.ts: 입장·상태·메시지 API
- db/schema.ts, drizzle/: 데이터베이스와 마이그레이션

GitHub Pages는 정적 사이트 호스팅입니다. 방·채팅 API는 별도의 Workers 서버가 필요합니다.
현재 .openai/hosting.json은 기존 Sites 배포에 연결되어 있습니다.

## 이미지·사운드

사용자 제공 사진과 배경 제거 이미지, cafe.pauwee.com 참고 이미지가 포함되어 있습니다.
각 이미지 및 로고의 권리는 원저작자에게 있습니다.
문종: Joseph SARDIN / BigSoundBank, CC0. 상세 출처는 public/audio/CREDITS.txt.
YouTube 영상은 다운로드하거나 추출하지 않고 공식 플레이어로 재생합니다.
