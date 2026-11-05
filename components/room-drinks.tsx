import {menu} from '../lib/cafe';
import type {Person} from './room-chat';

const root=import.meta.env.BASE_URL+'reference/';

function orderDetails(drink:string){
 const [label,...notes]=drink.split(' · ');
 return {item:menu.find(item=>item.name===label.trim().toLowerCase()),label:label.trim(),selection:notes.join(' · ')};
}

export default function RoomDrinks({ownIndex,ownName,ownSelection,friends}:{ownIndex:number,ownName:string,ownSelection?:string,friends:Person[]}){
 const own=menu[ownIndex],shared=friends.length>0;
 return <div className={'room-drinks '+(shared?'room-drinks-shared':'room-drinks-solo')} role="group" aria-label={shared?'함께 마시는 음료':'내 음료'} tabIndex={friends.length>2?0:undefined}>
  <figure className="room-drink room-drink-self" aria-label={ownName+'님의 음료 (나)'}>
   <img className={'cup hero-cup '+(shared?'shared-drink-cup':'')} src={root+own.img} alt={own.ko}/>
   {shared?<figcaption className="shared-drink-details"><strong title={ownName}>{ownName} <span>(나)</span></strong><span>{own.name}</span>{ownSelection&&<small title={ownSelection}>{ownSelection}</small>}</figcaption>:ownSelection&&<figcaption className="bean-caption">{ownSelection}</figcaption>}
  </figure>
  {friends.map(friend=>{
   const {item,label,selection}=orderDetails(friend.drink);
   return <figure className="room-drink room-drink-friend" key={friend.id} aria-label={friend.name+'님의 음료'}>
    {item?<img className="cup shared-drink-cup" src={root+item.img} alt={friend.name+'님의 '+item.ko}/>:<span className="shared-drink-cup room-drink-fallback" aria-hidden="true">☕</span>}
    <figcaption className="shared-drink-details"><strong title={friend.name}>{friend.name}</strong>{friend.task&&<p className="shared-drink-goal" title={friend.task}>{friend.task}</p>}<span title={label}>{item?.name||label}</span>{selection&&<small title={selection}>{selection}</small>}</figcaption>
   </figure>;
  })}
 </div>;
}
