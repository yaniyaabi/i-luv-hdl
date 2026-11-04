export const memes=[
 {id:'boss-energy',title:'상여자특 뭐든해냄',image:'boss-energy.png',alt:'분홍 선글라스를 쓴 강아지와 상여자특 뭐든해냄 말풍선'},
 {id:'study-fire',title:'발등튀김',image:'study-fire.png',alt:'발등에 불이 떨어진 햄스터와 미리 좀 해놓을걸이라는 말풍선'},
 {id:'princess',title:'뭐! 공주님 처음 봐!',image:'princess.png',alt:'왕관과 분홍 선글라스를 쓰고 음료를 마시는 공주님 밈'},
 {id:'commute',title:'출퇴근에 적응하려는 나',image:'commute.png',alt:'보도블록 틈에 끼어 있는 인형과 출퇴근에 적응하려는 나라는 글씨'},
 {id:'success-2026',title:'2026년 성공할 여자',image:'success-2026.png',alt:'2026년 성공할 여자 문구를 가리키며 카메라를 향해 손을 뻗는 사람'}
] as const;
export type Meme=typeof memes[number];
