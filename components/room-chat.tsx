'use client';
import {useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,Users,ChevronDown,Minus,Lock} from 'lucide-react';
import type {FocusTimer} from '../lib/focus-timer';
export type Person={id:string,name:string,drink:string,task?:string,focusRound?:number,finishedRound?:number,focusTimer?:FocusTimer};
export type RoomMessage={id:string,kind:string,sender:string,senderName:string,recipient:string,recipientName:string,body:string,created:number};
export default function RoomChat({joined,code,me,name,people,messages,receivedCount,onSend,onJoin}:{joined:boolean,code:string,me:string,name:string,people:Person[],messages:RoomMessage[],receivedCount:number,onSend:(body:string,recipient:string,messageId:string)=>Promise<void>,onJoin:()=>void}){
 const [target,setTarget]=useState(''),[draft,setDraft]=useState(''),[sending,setSending]=useState(false),[error,setError]=useState(''),[active,setActive]=useState(false),[minimized,setMinimized]=useState(false),[showPeople,setShowPeople]=useState(false);
 const pendingId=useRef(''),log=useRef<HTMLDivElement|null>(null),input=useRef<HTMLInputElement|null>(null),atBottom=useRef(true);
 const [unread,setUnread]=useState(0),lastReceived=useRef(0);
 const person=people.find(p=>p.id===target),others=people.filter(p=>p.id!==me);
 useEffect(()=>{if(atBottom.current&&log.current)log.current.scrollTop=log.current.scrollHeight},[messages.length,messages.at(-1)?.id,active,minimized]);
 useEffect(()=>{
  const added=receivedCount-lastReceived.current;lastReceived.current=receivedCount;
  if(!joined||added<0){setUnread(0);return}
  if(active&&!minimized&&atBottom.current&&document.visibilityState==='visible'&&document.hasFocus())setUnread(0);
  else if(added>0)setUnread(current=>current+added);
 },[receivedCount,joined,active,minimized]);
 useEffect(()=>{
  const readIfVisible=()=>{if(joined&&active&&!minimized&&atBottom.current&&document.visibilityState==='visible'&&document.hasFocus())setUnread(0)};
  window.addEventListener('focus',readIfVisible);document.addEventListener('visibilitychange',readIfVisible);
  return()=>{window.removeEventListener('focus',readIfVisible);document.removeEventListener('visibilitychange',readIfVisible)};
 },[joined,active,minimized]);
 useEffect(()=>{
  const title='I luv HDL';
  const icons=Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
  const originals=icons.map(icon=>icon.getAttribute('href')||'');
  document.title=unread?`(${unread>99?'99+':unread}) ${title}`:title;
  if(unread)icons.forEach(icon=>{icon.href=import.meta.env.BASE_URL+'cupcake-notification-'+(icon.getAttribute('sizes')==='32x32'?'32':'64')+'.png'});
  return()=>{document.title=title;icons.forEach((icon,index)=>icon.setAttribute('href',originals[index]))};
 },[unread]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   const el=e.target as HTMLElement;
   if(el.closest('input,textarea,select,button,a,[role=dialog],[contenteditable=true]'))return;
   if(e.key==='Enter'&&joined&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();setMinimized(false);setActive(true);setTimeout(()=>input.current?.focus(),0)}
   if(e.key==='Escape'){setActive(false);setShowPeople(false)}
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[joined]);
 useEffect(()=>{if(!joined){setTarget('');setDraft('');setActive(false)}},[joined]);
 function markRead(){atBottom.current=true;if(log.current)log.current.scrollTop=log.current.scrollHeight;setUnread(0)}
 function open(){markRead();setActive(true);setMinimized(false);setTimeout(()=>input.current?.focus(),0)}
 async function send(e:React.FormEvent){
  e.preventDefault();if(!draft.trim()||sending)return;
  let text=draft.trim(),recipient=target;
  if(text.startsWith('/w ')){
   const match=text.match(/^\/w\s+(\S+)\s+([\s\S]+)$/),friend=match?others.find(p=>p.name===match[1]):null;
   if(!match||!friend){setError('/w 이름 메시지 형식으로 입력해주세요.');return}
   recipient=friend.id;text=match[2];setTarget(recipient);
  }
  setSending(true);setError('');pendingId.current ||= crypto.randomUUID();
  try{await onSend(text,recipient,pendingId.current);setDraft('');pendingId.current='';atBottom.current=true;input.current?.focus()}
  catch(e:any){setError(e.message)}
  finally{setSending(false)}
 }
 return <aside className={'game-chat '+(active?'chat-active ':'')+(minimized?'chat-minimized ':'')+(unread?'has-unread':'')} aria-label="게임 채팅">
 <div className="game-chat-tools"><button className="game-chat-toggle" aria-label={minimized?'채팅 펼치기':'채팅 입력하기'} onClick={()=>{if(minimized){markRead();setMinimized(false)}else open()}}>{unread?<img className="chat-cupcake-icon" src={import.meta.env.BASE_URL+'cupcake-notification-32.png'} alt=""/>:<MessageCircle size={12}/>}<span>chat{joined?' · '+code:''}</span>{unread>0&&<span className="chat-unread-badge" key={unread} role="status" aria-label={'읽지 않은 메시지 '+unread+'개'}>{unread>99?'99+':unread}</span>}</button><div className="game-chat-actions">{joined&&<button aria-label="함께 있는 사람 선택" onClick={()=>{setShowPeople(!showPeople);setMinimized(false)}}><Users size={12}/>{people.length}</button>}<button aria-label={minimized?'채팅 펼치기':'채팅 접기'} onClick={()=>{if(minimized)markRead();setMinimized(!minimized);setShowPeople(false)}}>{minimized?<ChevronDown size={12}/>:<Minus size={12}/>}</button></div></div>
 {showPeople&&<div className="game-chat-members"><button className={!target?'chosen':''} onClick={()=>{setTarget('');setShowPeople(false);open()}}>모두에게</button>{others.map(p=><button key={p.id} className={target===p.id?'chosen':''} onClick={()=>{setTarget(p.id);setShowPeople(false);setError('');open()}}><span>{p.name}</span><Lock size={10}/><small>{p.drink}</small></button>)}{!others.length&&<p>친구를 기다리고 있어요.</p>}</div>}
 {!minimized&&<>{joined?<><div className="game-chat-log" role="log" aria-label="채팅 메시지" aria-live="polite" aria-relevant="additions" ref={log} onScroll={()=>{const el=log.current;if(el){atBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<30;if(active&&atBottom.current&&document.visibilityState==='visible'&&document.hasFocus())setUnread(0)}}}>
 {messages.map(m=>m.kind==='system'?<p className="game-system" key={m.id}><span>✧</span> {m.body}</p>:<p key={m.id} className={'game-message '+(m.recipient?'whisper ':'')+(m.sender===me?'self':'')}><span className="game-channel">[{m.recipient?'귓속말':'전체'}]</span> <b>{m.senderName}{m.sender===me?' (나)':''}{m.recipient?' → '+m.recipientName:''}</b><span className="game-colon"> : </span><span>{m.body}</span></p>)}
 {!messages.length&&<p className="game-system">{name}님이 함께합니다.</p>}
 </div>{active?<form className="game-chat-form" onSubmit={send}><label className="sr-only" htmlFor="game-chat-channel">메시지 받는 사람</label><select id="game-chat-channel" value={target} onChange={e=>{setTarget(e.target.value);pendingId.current='';setError('');input.current?.focus()}}><option value="">전체</option>{others.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}{target&&!person&&<option value={target}>자리 비움</option>}</select><label className="sr-only" htmlFor="game-chat-input">채팅 메시지 입력</label><input id="game-chat-input" ref={input} onFocus={markRead} autoComplete="off" maxLength={500} placeholder={target?'귓속말…':'메시지 입력…'} value={draft} onChange={e=>{setDraft(e.target.value);pendingId.current=''}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();input.current?.blur();setActive(false);setShowPeople(false)}if(e.key==='Enter'&&e.nativeEvent.isComposing)e.preventDefault()}}/><button aria-label="메시지 보내기" type="submit" disabled={!draft.trim()||sending||(!!target&&!person)}><Send size={13}/></button></form>:<button className="game-chat-prompt" onClick={open}>Enter 키로 대화하기 <span>↵</span></button>}{active&&<p className="game-chat-help">{target?'귓속말은 두 사람에게만 보여요.':'/w 이름 메시지 · 귓속말'}<span>Esc 닫기</span></p>}{error&&<p className="game-chat-error" role="alert">{error}</p>}</>:<button className="game-chat-join" onClick={onJoin}>같은 방 번호로 함께하기 ↗</button>}</>}
 </aside>
}
