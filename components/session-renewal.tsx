import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {beans,matchas,menu} from '../lib/cafe';

const root=import.meta.env.BASE_URL+'reference/';
export type CafeOrder={index:number,bean:string,matcha:string,duration:number};
export default function SessionRenewal({initial,notice,onClose,onOrder}:{initial:CafeOrder,notice:boolean,onClose:()=>void,onOrder:(order:CafeOrder)=>Promise<void>}){
 const [step,setStep]=useState<'notice'|'menu'|'origin'|'time'>(notice?'notice':'menu');
 const [order,setOrder]=useState(initial),[picked,setPicked]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const panel=useRef<HTMLDivElement>(null),title=useRef<HTMLHeadingElement>(null);
 const item=menu[order.index],isMatcha=item.matcha===true,hasOrigin=item.coffee||isMatcha;
 const durations=item.dessert?[10,20,40]:[25,45,60,0];
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  return()=>{if(previous?.isConnected)previous.focus()};
 },[]);
 useEffect(()=>{title.current?.focus()},[step]);
 function keys(event:React.KeyboardEvent){
  if(event.key==='Escape'){event.stopPropagation();if(!busy)onClose()}
  if(event.key==='Tab'){
   const elements=panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]');
   if(!elements?.length)return;
   const first=elements[0],last=elements[elements.length-1];
   if(event.shiftKey&&(document.activeElement===first||document.activeElement===title.current)){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
 }
 async function confirm(){
  if(busy)return;setBusy(true);setError('');
  try{await onOrder(order)}catch(e){setError(e instanceof Error?e.message:'주문을 다시 시도해주세요.');setBusy(false)}
 }
 return <div className="renewal-backdrop"><div className={'renewal-panel renewal-'+step} ref={panel} role="dialog" aria-modal="true" aria-labelledby="renewal-title" onKeyDown={keys}>
  <button className="renewal-close" aria-label="추가 주문 닫기" disabled={busy} onClick={onClose}><X size={20}/></button>
  {step==='notice'?<>
   <span className="renewal-eyebrow">your little coffee break</span><img className="renewal-finished-cup" src={root+menu[initial.index].img} alt={menu[initial.index].ko}/>
   <h2 ref={title} id="renewal-title" tabIndex={-1}>손님, 시간 다 됐습니다.</h2><p className="renewal-subtitle">커피 한 잔 더 주문하실래요?</p>
   <button className="black renewal-primary" onClick={()=>setStep('menu')}>한 잔 더 주문하기</button><button className="renewal-later" onClick={onClose}>잠깐 쉬기</button>
  </>:<>
   <span className="renewal-eyebrow">one more, at your own pace</span>
   <h2 ref={title} id="renewal-title" tabIndex={-1}>{step==='menu'?'이번에는 뭘 드릴까요?':step==='origin'?(isMatcha?'choose your matcha':'choose your coffee beans'):'얼마나 더 머무실래요?'}</h2>
   {step==='menu'&&<div className="renewal-menu">{menu.map((drink,index)=><button key={drink.name} aria-pressed={picked&&order.index===index} onClick={()=>{const options=drink.dessert?[10,20,40]:[25,45,60,0];setOrder({...order,index,duration:options.includes(order.duration)?order.duration:options[0]});setPicked(true)}}><img src={root+drink.img} alt={drink.ko}/><span>{drink.name}</span>{picked&&order.index===index&&<i aria-hidden="true">✓</i>}</button>)}</div>}
   {step==='origin'&&<div className="renewal-origin"><img src={root+(isMatcha?'matcha-tray.png':'coffee-tray.png')} alt={isMatcha?'말차 도구가 놓인 트레이':'커피가 놓인 트레이'}/><div role="group" aria-label={isMatcha?'추가 주문 말차 선택':'추가 주문 원두 선택'}>{(isMatcha?matchas:beans).map(origin=><button key={origin} aria-pressed={(isMatcha?order.matcha:order.bean)===origin} onClick={()=>setOrder({...order,[isMatcha?'matcha':'bean']:origin})}><span>{origin}</span><span aria-hidden="true">{(isMatcha?order.matcha:order.bean)===origin?'✓':''}</span></button>)}</div></div>}
   {step==='time'&&<><img className="renewal-order-cup" src={root+item.img} alt={item.ko}/><div className="duration-list renewal-durations">{durations.map((duration,index)=><button key={duration} disabled={busy} aria-pressed={duration===order.duration} className={duration===order.duration?'chosen':''} onClick={()=>setOrder({...order,duration})}><span>{['tall','grande','venti','unlimited'][index]}</span><i/><span>{duration===0?'∞':duration+' minutes'}</span></button>)}</div><p className="renewal-time-note">주문하면 선택한 시간으로 바로 시작해요.</p></>}
   <div className="renewal-actions"><button className="renewal-back" disabled={busy} onClick={()=>step==='menu'?onClose():setStep(step==='origin'?'menu':hasOrigin?'origin':'menu')}>{step==='menu'?'나중에 주문하기':'← back'}</button><button className="black renewal-primary" disabled={busy||(step==='menu'&&!picked)} onClick={()=>step==='time'?void confirm():setStep(step==='menu'&&hasOrigin?'origin':'time')}>{step==='time'?(busy?'주문하는 중…':'주문하고 시작'):'next'}</button></div>
   {error&&<p role="alert" className="renewal-error">{error}</p>}
  </>}
 </div></div>;
}
