import {menu} from '../lib/cafe';
import type {Person} from './room-chat';
import type {RoomGift} from '../lib/room-companions';
import {formatFocusTime,remainingFocusMs} from '../lib/focus-timer';
import {Clock,Cookie,Mail} from 'lucide-react';

const root=import.meta.env.BASE_URL+'reference/';

function orderDetails(drink:string){
 const [label,...notes]=drink.split(' · ');
 return {item:menu.find(item=>item.name===label.trim().toLowerCase()),label:label.trim(),selection:notes.join(' · ')};
}

export default function RoomDrinks({ownIndex,ownName,ownSelection,friends,clockNow,ownId='',gifts=[],onCookie,onLetter,busyRecipient}:{ownIndex:number,ownName:string,ownSelection?:string,friends:Person[],clockNow:number,ownId?:string,gifts?:RoomGift[],onCookie?:(person:Person)=>void,onLetter?:(person:Person)=>void,busyRecipient?:string}){
 const own=menu[ownIndex],shared=friends.length>0;
 function delivered(recipient:string){
  const received=gifts.filter(gift=>gift.recipient===recipient),latest=received.at(-1);
  return latest&&<span className="delivered-cookie" key={latest.id} title={latest.senderName+'님이 보낸 쿠키'}><img src={import.meta.env.BASE_URL+'cookie-icon-180.png'} alt={latest.senderName+'님이 보낸 쿠키'}/>{received.length>1&&<small>×{received.length}</small>}</span>;
 }
 return <div className={'room-drinks '+(shared?'room-drinks-shared':'room-drinks-solo')} role="group" aria-label={shared?'함께 마시는 음료':'내 음료'} tabIndex={friends.length>2?0:undefined}>
  <figure className="room-drink room-drink-self" aria-label={ownName+'님의 음료 (나)'}>
   <div className="room-cup-holder"><img className={'cup hero-cup '+(shared?'shared-drink-cup':'')} src={root+own.img} alt={own.ko}/>{delivered(ownId)}</div>
   {shared?<figcaption className="shared-drink-details"><strong title={ownName}>{ownName} <span>(나)</span></strong><span>{own.name}</span>{ownSelection&&<small title={ownSelection}>{ownSelection}</small>}</figcaption>:ownSelection&&<figcaption className="bean-caption">{ownSelection}</figcaption>}
  </figure>
  {friends.map(friend=>{
   const {item,label,selection}=orderDetails(friend.drink);
   const timer=friend.focusTimer;
   const remaining=timer?remainingFocusMs(timer,clockNow):null;
   return <figure className="room-drink room-drink-friend" key={friend.id} aria-label={friend.name+'님의 음료'}>
    <div className="room-cup-holder">{item?<img className="cup shared-drink-cup" src={root+item.img} alt={friend.name+'님의 '+item.ko}/>:<span className="shared-drink-cup room-drink-fallback" aria-hidden="true">☕</span>}{delivered(friend.id)}</div>
    <figcaption className="shared-drink-details"><strong title={friend.name}>{friend.name}</strong>{friend.task&&<p className="shared-drink-goal" title={friend.task}>{friend.task}</p>}<span title={label}>{item?.name||label}</span>{selection&&<small title={selection}>{selection}</small>}</figcaption>
    {timer&&remaining!==null&&<div className="shared-focus-time" role="timer" aria-label={friend.name+'님의 남은 집중 시간'}>
     <Clock size={11} aria-hidden="true"/>
     <span>{formatFocusTime(remaining)}</span>
     {remaining===0?<span>완료</span>:!timer.endsAt&&<span>일시정지</span>}
    </div>}
    {onCookie&&onLetter&&<div className="companion-actions"><button aria-label={friend.name+'님에게 쿠키 보내기'} disabled={busyRecipient===friend.id} onClick={()=>onCookie(friend)}><Cookie size={12}/>쿠키</button><button aria-label={friend.name+'님에게 쪽지 쓰기'} disabled={!friend.focusRound} title={!friend.focusRound?'친구가 새로고침하면 쪽지를 보낼 수 있어요.':undefined} onClick={()=>onLetter(friend)}><Mail size={12}/>쪽지</button></div>}
   </figure>;
  })}
 </div>;
}
