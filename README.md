# I luv HDL 🍪

커피 한 잔과 함께 머무는 온라인 집중 카페.

[카페 입장하기](https://yaniyaabi.github.io/i-luv-hdl/)

## 기능

- 눈 내리는 입장 화면과 카페 문종 소리
- 커피·말차·핫초콜릿·토스트·파르페·메론소다·푸딩 선택, 영어 원두 목록
- 말차 라테 선택 시 산지 선택: Uji, Nishio, Yame, Kagoshima, Jeju Matcha
- 음료는 25·45·60분 / 무제한, 디저트(버터 토스트·파르페·푸딩)는 10·20·40분 집중 타이머
- 시간 종료 시 추가 주문 안내, 같은 방·대화를 유지하며 새 메뉴와 시간으로 바로 이어서 시작
- 같은 방 번호로 입장, 접속자·입장·주문 알림
- 같은 방 친구의 음료·이름·원두를 내 음료 옆에 실시간 표시
- focus / meme gotgan 탭 전환, 좌우 화살표로 한 장씩 넘기는 큰 밈 앨범, 흐릿한 이전·다음 미리보기와 원본 확대
- 손글씨체로 쓰고 읽는 밈별 실시간 공유 댓글(최근 100개), 같은 방문 세션에서 내 댓글 삭제
- 실시간 전체 채팅과 당사자만 읽을 수 있는 귓속말
- 새 메시지 수신 시 컵케이크 탭 아이콘과 읽지 않은 개수 표시 (무음)
- YouTube 공식 플레이어 사운드 선택
- 쿠키 사이트 아이콘과 별 모양 커서

## 운영 구조

화면은 **GitHub Pages**, 방·접속자·채팅은 소유자의 **Firebase Spark 무료 프로젝트**에서 운영합니다. ChatGPT Sites, ChatGPT 로그인, Workers/D1 서버에 의존하지 않습니다. 노트북을 켜둘 필요가 없습니다.

방 번호를 비워두면 혼자 타이머를 이용합니다. 밈 댓글은 방과 별개로 공유되며, 댓글 창을 열 때도 Firebase 익명 인증을 사용합니다. 방이 비어도 밈 댓글은 유지됩니다. 같은 번호를 입력한 손님은 Firebase 익명 인증으로 구분합니다. 회원가입 화면은 없으며, 각 페이지의 세션을 별도 손님으로 취급합니다. 방 번호는 친구와 공유하는 입장 코드이며 비밀번호나 비공개 초대 링크를 대체하지 않습니다.

## 로컬 개발

Node.js 24 LTS를 권장합니다.

~~~sh
npm ci
npm run dev
~~~

개발 서버는 명령어에 표시된 로컬 주소에서 열립니다. 로컬 개발도 설정된 Firebase 프로젝트에 연결됩니다.

~~~sh
npm run build
npm run preview
~~~

GitHub Pages의 하위 경로 빌드는 VITE_BASE_PATH=/i-luv-hdl/ 환경변수를 지정합니다. main 브랜치에 push하면 GitHub Actions가 빌드·배포합니다.

## Firebase

- 프로젝트: i-luv-hdl, Spark 무료 요금제
- Authentication: 익명 제공업체
- Realtime Database: 싱가포르(asia-southeast1)
- lib/firebase-config.ts: 공개용 웹 앱 설정
- lib/firebase-room.ts: 입장, 실시간 구독, 메시지, 접속 종료·재연결
- database.rules.json: 멤버별 쓰기 권한, 방 격리, 귓속말 수신함 보호, 입력 검증

Firebase 웹 설정은 비밀 관리자 키가 아닙니다. 실제 접근 권한은 Database Rules에서 검사합니다. 서비스 계정 키나 관리자 토큰을 프런트엔드에 넣지 않습니다. 규칙 변경은 Firebase 콘솔에서 database.rules.json과 동일하게 게시하거나, 소유자 계정으로 Firebase CLI에 로그인 후 아래 명령어를 실행합니다.

~~~sh
npx firebase-tools deploy --only database --project i-luv-hdl
~~~

Spark 무료 한도는 동시 연결 100개, 저장 1GB, 월 다운로드 10GB입니다. 무료 한도에 도달하면 기능이 제한될 수 있습니다. 요금제를 업그레이드하지 않는 한 사용량 초과로 자동 과금되지 않습니다. [공식 요금표](https://firebase.google.com/pricing)

현재 대화는 최근 100개까지 표시합니다. 마지막 사람이 방 나가기를 누르면 전체 채팅과 모든 귓속말 수신함을 접속 상태와 함께 원자적으로 지웁니다. 다른 사람이 남아 있거나 새로 들어왔으면 그 방의 기록은 유지합니다. 브라우저 종료·연결 끊김은 서버의 onDisconnect로 접속자를 정리하며, 이렇게 비게 된 방은 다음 첫 입장 시 기록을 초기화한 뒤 채팅을 구독합니다. 빈 방의 이전 대화가 새 손님에게 표시되지 않습니다.

## 검증

다음 검증은 실제 Firebase 프로젝트에 일회성 익명 계정과 임의의 테스트 방을 만든 후 자신이 만든 데이터와 계정을 정리합니다. 관리자 자격 증명은 사용하지 않습니다.

~~~sh
node scripts/test-firebase.mjs
node scripts/test-firebase-client.mjs
~~~

규칙 검증은 방 격리, 귓속말 읽기 제한, 발신자 사칭·다른 사람의 프로필 수정·메시지 변조 거부를 확인합니다. 클라이언트 검증은 두 독립 세션 간 실시간 전송, 중복 전송 방지, 접속 종료 정리, 재연결 후 채팅을 확인합니다.

## 이미지·사운드

사용자 제공 사진과 배경 제거 이미지, cafe.pauwee.com 참고 이미지가 포함되어 있습니다.
각 이미지 및 로고의 권리는 원저작자에게 있습니다.
문종: Joseph SARDIN / BigSoundBank, CC0. 상세 출처는 public/audio/CREDITS.txt.
YouTube 영상은 다운로드하거나 추출하지 않고 공식 플레이어로 재생합니다. 외부 재생이 제한된 영상은 목록에 YouTube에서 듣기로 표시하며, 선택하면 기존 플레이어를 종료하고 새 탭에서 처음부터 엽니다.
