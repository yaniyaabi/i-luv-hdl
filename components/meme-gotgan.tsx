import {lazy,Suspense} from 'react';
const MonthlyBoard=lazy(()=>import('./monthly-board'));
export default function MemeGotgan({name}:{name:string}){return <Suspense fallback={<p className="stack-status" role="status">이달 보드를 여는 중…</p>}><MonthlyBoard name={name}/></Suspense>;}
