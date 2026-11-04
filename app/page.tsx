'use client';
import {useState,useEffect,useRef} from 'react';
import MusicPlayer,{soundtracks} from '../components/music-player';
import RoomChat,{type RoomMessage,type Person} from '../components/room-chat';
import RoomDrinks from '../components/room-drinks';
import MemeGotgan from '../components/meme-gotgan';
import SessionRenewal,{type CafeOrder} from '../components/session-renewal';
import {menu as drinks,matchas,beans} from '../lib/cafe';
import {connectRoom,roomError,type CafeRoom} from '../lib/firebase-room';
import {ArrowLeft,ArrowRight,Volume2,VolumeX,Play,Pause,Square,Users,Copy,LogOut,X,Settings2,Headphones} from 'lucide-react';
const root=import.meta.env.BASE_URL+'reference/';



function Cup({index,className=''}:{index:number,className?:string}){return <img className={'cup '+className} src={root+drinks[index].img} alt={drinks[index].ko}/>;}
export default function Home(){
 const [step,setStep]=useState('entry'),[drinkIndex,setDrinkIndex]=useState(0),[picked,setPicked]=useState(false),[bean,setBean]=useState(beans[0]),[matcha,setMatcha]=useState(matchas[0]),[duration,setDuration]=useState(25),[name,setName]=useState(''),[task,setTask]=useState(''),[code,setCode]=useState(''),[joined,setJoined]=useState(false),[people,setPeople]=useState<Person[]>([]),[messages,setMessages]=useState<RoomMessage[]>([]),[seconds,setSeconds]=useState(1500),[running,setRunning]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[drawer,setDrawer]=useState(false),[soundIndex,setSoundIndex]=useState(-1),[copied,setCopied]=useState(false);
 const [receivedCount,setReceivedCount]=useState(0);
 const [view,setView]=useState<'focus'|'memes'>('focus');
 const [renewal,setRenewal]=useState<'notice'|'order'|null>(null);
 const doorBell=useRef<HTMLAudioElement|null>(null);
 const id=useRef('');
 const room=useRef<CafeRoom|null>(null);
 const leaving=useRef<Promise<void>|null>(null);
 const isCoffee=drinks[drinkIndex].coffee,isMatcha=drinks[drinkIndex].matcha===true,isDessert=drinks[drinkIndex].dessert===true;
 const durations=isDessert?[10,20,40]:[25,45,60];
 const selection=isCoffee?bean:isMatcha?matcha:'',drink=drinks[drinkIndex].name+(selection?' · '+selection:'');
 const friends=joined?people.filter(person=>person.id!==id.current):[];
 useEffect(()=>()=>{void room.current?.close().catch(()=>{})},[]);
 useEffect(()=>{
  const bell=new Audio(import.meta.env.BASE_URL+'audio/cafe-door-bell.mp3');bell.preload='auto';bell.volume=.65;bell.load();doorBell.current=bell;
  return()=>{bell.pause();doorBell.current=null};
 },[]);

 async function join(){
  setReceivedCount(0);
  if(leaving.current)await leaving.current;
  if(room.current)await room.current.close();
  const client=await connectRoom({code,name:name.trim()||'guest',drink,onPeople:setPeople,onMessages:setMessages,onStatus:setError,onIncoming:count=>setReceivedCount(current=>current+count),onReset:()=>setReceivedCount(0)});
  id.current=client.id;room.current=client;setJoined(true);setError('');
 }
 useEffect(()=>{if(!running)return;const t=setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000);return()=>clearInterval(t)},[running]);
 useEffect(()=>{if(step==='room'&&running&&seconds===0){setRunning(false);setDrawer(false);setRenewal('notice')}},[step,running,seconds]);
 async function renewSession(order:CafeOrder){
  const item=drinks[order.index],origin=item.coffee?order.bean:item.matcha?order.matcha:'';
  if(joined){if(!room.current)throw Error('방 연결을 확인해주세요.');await room.current.order(item.name+(origin?' · '+origin:''))}
  setDrinkIndex(order.index);setBean(order.bean);setMatcha(order.matcha);setDuration(order.duration);setSeconds(order.duration*60);setRunning(true);setView('focus');setRenewal(null);
 }
 async function start(e:React.FormEvent){e.preventDefault();setBusy(true);try{if(code)await join();setSeconds(duration*60);setRunning(true);setView('focus');setStep('room')}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 async function leave(){
  const client=room.current;room.current=null;
  setReceivedCount(0);setJoined(false);setPeople([]);setMessages([]);setDrawer(false);setRunning(false);setRenewal(null);setStep('drink');setError('');
  if(client){
   const pending=client.close().catch(e=>setError(roomError(e))).finally(()=>{if(leaving.current===pending)leaving.current=null});
   leaving.current=pending;
  }
 }
 function enterCafe(){
  const bell=doorBell.current;
  if(bell){bell.currentTime=0;bell.play().catch(()=>{});}
  setStep('drink');
 }
 const clock=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 const Next=({onClick,label='next',disabled=false}:{onClick:()=>void,label?:string,disabled?:boolean})=><button className="black next" disabled={disabled} onClick={onClick}>{label}</button>;
 const Back=({onClick}:{onClick:()=>void})=><button className="back" onClick={onClick}>← back</button>;
 if(step==='entry')return <main className="simple-entry"><div className="entry-snow" aria-hidden="true">{Array.from({length:64},(_,i)=><span key={i} className={i%11===0?'snow-crystal':'snow-dot'} style={{left:((i*47+13)%100)+'%','--snow-size':(i%11===0?12:(i%4)+3)+'px','--snow-drift':((i*23)%100-50)+'px','--snow-opacity':.25+(i%6)*.1,animationDuration:(9+(i*7)%16)+'s',animationDelay:-(i*1.73%25)+'s'} as React.CSSProperties}>{i%11===0?'❄':''}</span>)}</div><button className="entry-picture" aria-label="커피숍 입장하기" onClick={enterCafe}><img src={root+'entry-tree.png'} alt="별과 알록달록한 장식이 달린 크리스마스트리"/></button></main>;
 if(step!=='room')return <main className={'ordering step-'+step}><div className="paper">
 {step==='drink'&&<><h1>what would you like?</h1><div className="drink-grid">{drinks.map((d,i)=><button key={d.name} className={'drink-option '+(picked&&drinkIndex===i?'chosen':'')} onClick={()=>{if((d.dessert===true)!==isDessert)setDuration(d.dessert?10:25);setDrinkIndex(i);setPicked(true)}}><Cup index={i}/>{picked&&drinkIndex===i&&<span className="check">✓</span>}<span>{d.name}</span></button>)}</div><Next disabled={!picked} label={picked?'next':'choose an item first'} onClick={()=>setStep(isCoffee||isMatcha?'bean':'timer')}/><Back onClick={()=>setStep('entry')}/></>}
 {step==='bean'&&<><Cup index={drinkIndex} className="tiny-cup"/><h1>{isMatcha?'choose your matcha':'choose your coffee beans'}</h1><p className="subtitle">{isMatcha?'어느 산지의 말차로 만들어드릴까요?':'어떤 원두로 내려드릴까요?'}</p><div className="bean-selection"><img className="bean-illustration" src={root+(isMatcha?'matcha-tray.png':'coffee-tray.png')} alt={isMatcha?'Matcha whisk, powder and milk on a silver tray':'Coffee cup, orange and glass on a silver tray'}/><div className="bean-text-list" role="group" aria-label={isMatcha?'Matcha selection':'Coffee bean selection'}>{(isMatcha?matchas:beans).map(b=><button key={b} aria-pressed={(isMatcha?matcha:bean)===b} className={(isMatcha?matcha:bean)===b?'chosen':''} onClick={()=>isMatcha?setMatcha(b):setBean(b)}><span>{b}</span><span className="list-check" aria-hidden="true">{(isMatcha?matcha:bean)===b?'✓':''}</span></button>)}</div></div><Next onClick={()=>setStep('timer')}/><Back onClick={()=>setStep('drink')}/></>}
 {step==='timer'&&<><Cup index={drinkIndex} className="tiny-cup"/><h1 className="sr-only">집중 시간 선택</h1><div className="duration-list">{durations.map((m,i)=><button key={m} aria-pressed={duration===m} className={duration===m?'chosen':''} onClick={()=>setDuration(m)}><span>{['tall','grande','venti'][i]}</span><i/><span>{m+' minutes'}</span></button>)}</div><Next onClick={()=>setStep('name')}/><Back onClick={()=>setStep(isCoffee||isMatcha?'bean':'drink')}/></>}
 {step==='name'&&<form onSubmit={start} className="name-form"><div className="receipt"><p>DRINK FOR</p><input aria-label="닉네임" maxLength={16} placeholder="your name" value={name} onChange={e=>setName(e.target.value)}/><span>1X {duration+' MIN'} {drinks[drinkIndex].name.toUpperCase()}</span>{selection&&<span>{selection}</span>}<span>ORDER #{code||'001'}</span><div className="perforation"/><label>ROOM NUMBER <small>같은 번호를 입력하면 함께 입장해요.</small><input aria-label="방 번호" inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} placeholder="숫자 4~8자리 · 혼자라면 비워두세요" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label><label className="task-label">I WILL...<input aria-label="오늘 할 일" placeholder="오늘 집중할 일 (선택)" maxLength={80} value={task} onChange={e=>setTask(e.target.value)}/></label></div><button className="black next" disabled={busy} type="submit">{busy?'opening…':'start'}</button>{error&&<p role="alert" className="error">{error}</p>}<Back onClick={()=>setStep('timer')}/></form>}
 </div><span className="ordering-foot">sip, breathe, and take your time.</span></main>;
 return <main className={'immersive with-chat '+(view==='memes'?'meme-view':'')}>
 <nav className={'room-navigation '+(view==='focus'?'to-memes':'to-focus')} aria-label="카페 화면 이동"><button aria-label={view==='focus'?'밈 곳간으로 이동':'focus로 돌아가기'} aria-controls={view==='focus'?'meme-panel':'focus-panel'} title={view==='focus'?'meme gotgan':'focus'} onClick={()=>setView(view==='focus'?'memes':'focus')}>{view==='focus'?<ArrowRight size={27}/>:<ArrowLeft size={27}/>}</button></nav>
 {view==='memes'&&<MemeGotgan name={name}/> }
 <section className="focus-stage" id="focus-panel" role="region" aria-label="focus" hidden={view!=='focus'}><img className="room-bg" src={root+'focus-bg.png'} alt="손그림 카페 공간"/>
 <button className="space-label" onClick={()=>setDrawer(true)}>커피숍{joined?' · '+code:''}</button>
 <div className={'focus-content '+(friends.length?'has-company':'')}><div className="big-clock" aria-label="남은 시간">{clock}</div><span className="guest-name">{name||'guest'}</span>{task&&<p className="focus-task">{task}</p>}<RoomDrinks ownIndex={drinkIndex} ownName={name.trim()||'guest'} ownSelection={selection||undefined} friends={friends}/></div>
 <div className="bottom-controls"><div className="playback"><button aria-label={running?'일시정지':'집중 시작'} onClick={()=>{if(seconds===0){setRenewal('notice');return;}setRunning(!running)}}>{running?<Pause size={18}/>:<Play size={18}/>}</button><button className="black" aria-label="타이머 초기화" onClick={()=>{setRunning(false);setSeconds(duration*60);}}><Square size={16} fill="currentColor"/></button><button aria-label="소리 설정" onClick={()=>setDrawer(true)}><Settings2 size={18}/></button></div><button className="music-select-button" onClick={()=>setDrawer(true)}><Headphones size={13}/>{soundIndex<0?'choose your sound':soundtracks[soundIndex].name}</button>{seconds===0&&<button className="done renewal-reminder" onClick={()=>setRenewal('order')}>시간이 다 됐어요 · 한 잔 더 주문하기</button>}</div>
 </section><RoomChat receivedCount={receivedCount} joined={joined} code={code} me={id.current} name={name.trim()||'guest'} people={people} messages={messages} onJoin={()=>setDrawer(true)} onSend={async(body,recipient,messageId)=>{if(!room.current)throw Error('방에 먼저 입장해주세요.');await room.current.send(body,recipient,messageId)}}/>
 {soundIndex>=0&&<MusicPlayer key={soundIndex} index={soundIndex} onClose={()=>setSoundIndex(-1)}/>}
 {error&&<div role="alert" className="room-error">{error}</div>}
 {renewal&&<SessionRenewal initial={{index:drinkIndex,bean,matcha,duration}} notice={renewal==='notice'} onClose={()=>setRenewal(null)} onOrder={renewSession}/>}
 {drawer&&<div className="drawer-backdrop" onClick={()=>setDrawer(false)}><section className="drawer" onClick={e=>e.stopPropagation()}><button className="close" aria-label="닫기" onClick={()=>setDrawer(false)}><X/></button><h2>make yourself at home.</h2><p className="drawer-sub">커피 한 잔, 나의 속도로.</p><h3>background sound</h3><div className="youtube-track-list">{soundtracks.map((track,i)=><button key={track.id} aria-pressed={soundIndex===i} className={soundIndex===i?'chosen':''} onClick={()=>{setSoundIndex(i);setDrawer(false)}}><span className="track-number">0{i+1}</span><span><strong>{track.name}</strong><small>{track.detail}</small></span><span>{soundIndex===i?'✓':'↗'}</span></button>)}</div><p className="sound-player-note">YouTube 공식 플레이어에서 재생해요.<br/>모든 영상은 처음부터 시작합니다.</p>{soundIndex>=0&&<button className="stop-youtube" onClick={()=>setSoundIndex(-1)}>재생 종료</button>}<h3>together, in the same room.</h3>{joined?<><div className="room-number"><span>ROOM {code}</span><button aria-label="방 번호 복사" onClick={async()=>{try{await navigator.clipboard.writeText(code);setCopied(true)}catch{setError('방 번호를 직접 복사해주세요.')}}}><Copy size={16}/></button></div><p className="tiny-note">{copied?'번호를 복사했어요.':'친구에게 이 번호를 알려주세요.'} · {people.length}명 접속 중</p><div className="drawer-people">{people.map(p=><p key={p.id}><Users size={14}/>{p.name}<small>{p.drink}</small></p>)}</div></>:<form className="join-form" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await join()}catch(e:any){setError(e.message)}finally{setBusy(false)}}}><label>방 번호<input aria-label="함께할 방 번호" required pattern="[0-9]{4,8}" maxLength={8} inputMode="numeric" placeholder="숫자 4~8자리" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label><button className="black" disabled={busy}>{busy?'opening…':'함께 입장하기'}</button></form>}{error&&<p className="error" role="alert">{error}</p>}<button className="leave" onClick={leave}><LogOut size={16}/>{joined?'방 나가기':'처음으로'}</button></section></div>}
 </main>
}

