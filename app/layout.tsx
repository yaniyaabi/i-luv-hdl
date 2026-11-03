import './globals.css';
export const metadata = {title:'I luv HDL',icons:{icon:[{url:'/cookie-icon-32.png',sizes:'32x32',type:'image/png'},{url:'/cookie-icon-64.png',sizes:'64x64',type:'image/png'}],shortcut:'/cookie-icon-32.png',apple:'/cookie-icon-180.png'},description:'커피 한 잔과 함께 집중하는 시간. 같은 방 번호로 함께 머물러요.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>}
