import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Lock,Mail,MailOpen,Send,X} from 'lucide-react';
import RoomDrinks from './room-drinks';
import type {Person} from './room-chat';
import {roomError,type CafeRoom} from '../lib/firebase-room';
import type {RoomGift,RoomLetter} from '../lib/room-companions';

function NoteDialog({title,onClose,children,busy=false}:{title:string,onClose:()=>void,children:ReactNode,busy?:boolean}){
 const panel=useRef<HTMLElement>(null),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;heading.current?.focus({preventScroll:true});return()=>{if(previous?.isConnected)previous.focus({preventScroll:true})}},[]);
 return <div className="companion-backdrop" onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><section className="companion-dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby="companion-title" onKeyDown={e=>{
  if(e.key==='Escape'){e.stopPropagation();if(!busy)onClose()}
  if(e.key==='Tab'){
   const items=panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled),[tabindex="0"]');if(!items?.length)return;
   const first=items[0],last=items[items.length-1];
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===heading.current)){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===heading.current)){e.preventDefault();first.focus()}
  }
 }}><header><Mail size={18}/><h2 id="companion-title" ref={heading} tabIndex={-1}>{title}</h2><button aria-label="쪽지 창 닫기" disabled={busy} onClick={onClose}><X size={18}/></button></header>{children}</section></div>;
}

type Props={ownIndex:number,ownName:string,ownSelection?:string,friends:Person[],clockNow:number,me:string,finishedRound:number,client:CafeRoom|null,gifts:RoomGift[],letters:RoomLetter[],mailboxOpen:boolean,onMailboxOpen:(open:boolean)=>void,opened:string[],onRead:(id:string)=>void};
export default function RoomCompanions({ownIndex,ownName,ownSelection,friends,clockNow,me,finishedRound,client,gifts,letters,mailboxOpen,onMailboxOpen,opened,onRead}:Props){
 const [target,setTarget]=useState<Person|null>(null),[draft,setDraft]=useState(''),[sending,setSending]=useState(false),[cookieBusy,setCookieBusy]=useState(''),[error,setError]=useState(''),[toast,setToast]=useState(''),[bodies,setBodies]=useState<Record<string,string>>({}),[opening,setOpening]=useState('');
 const noteId=useRef(''),cookieIds=useRef(new Map<string,string>()),cookiePending=useRef(false),seen=useRef(new Set<string>()),readySeen=useRef(new Set<string>());
 const ready=letters.filter(note=>note.round<=finishedRound),unread=ready.filter(note=>!opened.includes(note.id)).length;
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer)},[toast]);
 useEffect(()=>{
  const incoming=gifts.filter(gift=>gift.recipient===me&&!seen.current.has(gift.id));gifts.forEach(gift=>seen.current.add(gift.id));
  if(incoming.length)setToast(incoming.at(-1)!.senderName+'님이 쿠키를 보내줬어요!');
 },[gifts,me]);
 useEffect(()=>{
  const fresh=letters.filter(note=>note.round<=finishedRound&&!readySeen.current.has(note.id));
  fresh.forEach(note=>readySeen.current.add(note.id));
  if(fresh.length)setToast('집중 끝! 이제 도착한 쪽지를 열어볼 수 있어요.');
 },[letters,finishedRound]);
 async function cookie(person:Person){
  if(!client||cookiePending.current)return;cookiePending.current=true;setCookieBusy(person.id);
  const messageId=cookieIds.current.get(person.id)||crypto.randomUUID();cookieIds.current.set(person.id,messageId);
  try{await client.cookie(person.id,messageId);cookieIds.current.delete(person.id);setToast(person.name+'님에게 쿠키를 보냈어요!')}
  catch(e){setToast(roomError(e))}finally{cookiePending.current=false;setCookieBusy('')}
 }
 async function send(event:React.FormEvent){
  event.preventDefault();if(!client||!target||sending)return;setSending(true);setError('');
  noteId.current||=crypto.randomUUID();
  try{await client.letter(target.id,draft,noteId.current);setToast(target.name+'님에게 쪽지를 남겼어요. 집중이 끝나면 열려요.');setTarget(null);setDraft('');noteId.current=''}catch(e){setError(roomError(e))}finally{setSending(false)}
 }
 async function open(note:RoomLetter){
  if(!client||opening)return;setOpening(note.id);setError('');
  try{const body=await client.openLetter(note.id);setBodies(current=>({...current,[note.id]:body}));onRead(note.id)}catch(e){setError(roomError(e))}finally{setOpening('')}
 }
 return <>
  <RoomDrinks ownIndex={ownIndex} ownName={ownName} ownSelection={ownSelection} friends={friends} clockNow={clockNow} ownId={me} gifts={gifts} onCookie={client?cookie:undefined} onLetter={client?person=>{setTarget(person);setDraft('');noteId.current='';setError('')}:undefined} busyRecipient={cookieBusy}/>
  {client&&createPortal(<>
   <button className={'companion-mailbox '+(unread?'has-ready':'')} aria-label={'받은 쪽지함'+(unread?' · 열 수 있는 쪽지 '+unread+'개':'')} onClick={()=>{setError('');onMailboxOpen(true)}}><Mail size={17}/><span>쪽지함</span>{letters.length>0&&<b>{unread||letters.length}</b>}</button>
   {toast&&<div className="companion-toast" role="status">{toast}<button aria-label="알림 닫기" onClick={()=>setToast('')}><X size={13}/></button></div>}
   {target&&!mailboxOpen&&<NoteDialog title={target.name+'님에게 남길 쪽지'} busy={sending} onClose={()=>setTarget(null)}><form className="companion-compose" onSubmit={send}><p><Lock size={13}/>친구님의 집중 시간이 끝나면 열려요.</p><textarea aria-label="집중 후 열리는 쪽지 내용" placeholder="끝나면 전화하자. 오늘도 수고했어 ♡" required maxLength={500} value={draft} disabled={sending} onChange={e=>setDraft(e.target.value)}/><small>{draft.length} / 500</small>{error&&<p className="companion-error" role="alert">{error}</p>}<footer><button type="button" disabled={sending} onClick={()=>setTarget(null)}>취소</button><button type="submit" className="black" disabled={sending||!draft.trim()}><Send size={13}/>{sending?'남기는 중…':'쪽지 남기기'}</button></footer></form></NoteDialog>}
   {mailboxOpen&&<NoteDialog title="집중 끝에 도착한 마음" onClose={()=>onMailboxOpen(false)}><div className="companion-inbox">{letters.length===0?<div className="companion-empty"><Mail size={32}/><p>아직 도착한 쪽지가 없어요.</p><small>친구 음료 아래의 ‘쪽지’로 마음을 남겨보세요.</small></div>:<>{[...letters].reverse().map(note=>{
    const unlocked=note.round<=finishedRound,body=bodies[note.id];
    return <article className={'companion-letter '+(unlocked?'is-ready':'is-locked')} key={note.id}><div>{unlocked?<MailOpen size={16}/>:<Lock size={15}/>}<strong>from. {note.senderName}</strong><small>{unlocked?'열 수 있어요':'집중 중'}</small></div>{body!==undefined?<blockquote>{body}</blockquote>:unlocked?<button className="open-letter" disabled={!!opening} onClick={()=>void open(note)}>{opening===note.id?'여는 중…':'쪽지 열어보기'} ♡</button>:<p>이번 집중이 끝나면 열 수 있어요.</p>}</article>;
   })}</>}{error&&<p className="companion-error" role="alert">{error}</p>}</div></NoteDialog>}
  </>,document.body)}
 </>;
}
