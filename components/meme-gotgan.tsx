import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,MessageCircle,Pause,Play,Send,Trash2,X} from 'lucide-react';
import {memes,type Meme} from '../lib/memes';
import {deleteMemeComment,listenMemeComments,sendMemeComment,type MemeComment} from '../lib/firebase-memes';

const root=import.meta.env.BASE_URL+'memes/';
const dateLabel=(created:number)=>new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(created);
function commentError(error:unknown){
 if(/permission/i.test((error as {code?:string})?.code||''))return '댓글을 불러오지 못했어요. 잠시 후 다시 열어주세요.';
 if(/network|unavailable/i.test((error as {code?:string})?.code||''))return '인터넷 연결을 확인해주세요.';
 return error instanceof Error?error.message:'댓글 연결을 다시 시도해주세요.';
}

export default function MemeGotgan({name}:{name:string}){
 const [filter,setFilter]=useState('전체'),[selected,setSelected]=useState<Meme|null>(null),[paused,setPaused]=useState(false);
 const trigger=useRef<HTMLElement|null>(null);
 const filtered=memes.filter(meme=>filter==='전체'||meme.category===filter);
 function open(meme:Meme,event:React.MouseEvent<HTMLButtonElement>){trigger.current=event.currentTarget;setSelected(meme)}
 function close(){setSelected(null);trigger.current?.focus()}
 return <section className="meme-room" id="meme-panel" role="tabpanel" aria-labelledby="meme-tab">
  <div className="meme-page-heading"><span className="meme-eyebrow">a little break for your brain</span><h1>meme gotgan<span aria-hidden="true"> ✳</span></h1><p>공부하다가, 현생 살다가. 잠깐 웃고 가요.</p></div>
  <div className="meme-stream-heading"><span>지금 곶간에 흐르는 밈</span><button onClick={()=>setPaused(!paused)} aria-label={paused?'밈 자동 넘김 시작':'밈 자동 넘김 정지'}>{paused?<Play size={13}/>:<Pause size={13}/>}<span>{paused?'play':'pause'}</span></button></div>
  <div className={'meme-stream '+(paused||selected?'is-paused':'')} aria-label="흘러가는 밈 모음"><div className="meme-stream-track">{[0,1].map(copy=><div className="meme-stream-group" key={copy} aria-hidden={copy===1?true:undefined}>{memes.map(meme=><button key={meme.id} tabIndex={copy===1?-1:0} onClick={event=>open(meme,event)} aria-label={meme.title+' 크게 보기'}><img src={root+meme.image} alt={copy===1?'':meme.alt}/><span>{meme.title}</span></button>)}</div>)}</div></div>
  <div className="meme-album-heading"><div><h2>오늘의 밈 앨범</h2><span>{filtered.length} memes · 하나를 눌러 댓글도 남겨보세요.</span></div><div className="meme-filters" role="group" aria-label="밈 분류">{['전체','공부','현생'].map(category=><button key={category} aria-pressed={filter===category} onClick={()=>setFilter(category)}>{category}</button>)}</div></div>
  <div className="meme-album">{filtered.map(meme=><button className="meme-card" key={meme.id} onClick={event=>open(meme,event)} aria-label={meme.title+' 댓글 보기'}><div className="meme-card-image"><img src={root+meme.image} alt={meme.alt} loading="lazy"/></div><div className="meme-card-caption"><span className="meme-card-number">0{memes.indexOf(meme)+1}</span><div><span className="meme-tag">{meme.category}</span><h3>{meme.title}</h3></div><MessageCircle size={17}/></div></button>)}</div>
  <p className="meme-bottom-note">웃었으면 됐지. 다시 나의 속도로.</p>
  {selected&&<MemeDetail key={selected.id} meme={selected} name={name} onClose={close} onChange={setSelected}/>}
 </section>;
}

function MemeDetail({meme,name,onClose,onChange}:{meme:Meme,name:string,onClose:()=>void,onChange:(meme:Meme)=>void}){
 const [comments,setComments]=useState<MemeComment[]>([]),[uid,setUid]=useState(''),[authorName,setAuthorName]=useState(name.trim()||'guest'),[body,setBody]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[deleting,setDeleting]=useState('');
 const dialog=useRef<HTMLDivElement>(null),closeButton=useRef<HTMLButtonElement>(null),pendingId=useRef('');
 const index=memes.findIndex(item=>item.id===meme.id);
 useEffect(()=>{
  let disposed=false,stop:(()=>void)|undefined;
  void listenMemeComments(meme.id,next=>{if(!disposed){setComments(next);setLoading(false);setError('')}},e=>{if(!disposed){setLoading(false);setError(commentError(e))}}).then(connection=>{if(disposed)connection.unsubscribe();else{stop=connection.unsubscribe;setUid(connection.uid)}}).catch(e=>{if(!disposed){setLoading(false);setError(commentError(e))}});
  return()=>{disposed=true;stop?.()};
 },[meme.id]);
 useEffect(()=>{closeButton.current?.focus()},[]);
 function keys(event:React.KeyboardEvent){
  if(event.key==='Escape'){event.stopPropagation();onClose();return}
  if(event.key==='Tab'){
   const elements=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]');
   if(!elements?.length)return;
   const first=elements[0],last=elements[elements.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  const id=pendingId.current||crypto.randomUUID();pendingId.current=id;
  try{await sendMemeComment(meme.id,id,authorName,body);pendingId.current='';setBody('')}
  catch(e){setError(commentError(e))}finally{setBusy(false)}
 }
 return <div className="meme-dialog-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose()}}><div className="meme-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby={'meme-title-'+meme.id} onKeyDown={keys}>
  <button className="meme-close" ref={closeButton} aria-label="밈 닫기" onClick={onClose}><X size={21}/></button>
  <div className="meme-full-image"><img src={root+meme.image} alt={meme.alt}/><div className="meme-image-nav"><button aria-label="이전 밈" onClick={()=>onChange(memes[(index+memes.length-1)%memes.length])}><ChevronLeft size={19}/></button><span>{index+1} / {memes.length}</span><button aria-label="다음 밈" onClick={()=>onChange(memes[(index+1)%memes.length])}><ChevronRight size={19}/></button></div></div>
  <div className="meme-discussion"><span className="meme-tag">{meme.category}</span><h2 id={'meme-title-'+meme.id}>{meme.title}</h2><p className="meme-comment-intro">이 밈, 나만 공감한 거 아니지?</p><h3><MessageCircle size={16}/>댓글 <span>{comments.length}{comments.length===100?'+':''}</span></h3>
   <div className="meme-comments" aria-live="polite" aria-busy={loading}>{loading?<p className="meme-empty">댓글을 불러오는 중…</p>:comments.length?comments.map(comment=><article className="meme-comment" key={comment.id}><div><strong>{comment.authorName}{comment.authorId===uid&&<small> 나</small>}</strong><time dateTime={new Date(comment.created).toISOString()}>{dateLabel(comment.created)}</time>{comment.authorId===uid&&<button aria-label="내 댓글 삭제" disabled={deleting===comment.id} onClick={async()=>{setDeleting(comment.id);try{await deleteMemeComment(meme.id,comment.id)}catch(e){setError(commentError(e))}finally{setDeleting('')}}}><Trash2 size={13}/></button>}</div><p>{comment.body}</p></article>):<p className="meme-empty">아직 댓글이 없어요.<br/>첫 공감 한 줄을 남겨주세요.</p>}</div>
   <form className="meme-comment-form" onSubmit={submit}><label htmlFor="meme-author">닉네임<input id="meme-author" value={authorName} maxLength={16} required onChange={event=>setAuthorName(event.target.value)} autoComplete="nickname"/></label><label htmlFor="meme-comment-body">댓글<textarea id="meme-comment-body" value={body} maxLength={500} required placeholder="나도 이래… 공감 한 줄 남기기" onChange={event=>{pendingId.current='';setBody(event.target.value)}} disabled={busy}/></label><div><small>{body.length}/500 · 모든 방문자가 함께 봐요.</small><button className="black" type="submit" disabled={busy||loading||!uid||!body.trim()||!authorName.trim()}><Send size={13}/>{busy?'남기는 중…':'댓글 남기기'}</button></div>{error&&<p role="alert" className="meme-error">{error}</p>}</form>
  </div>
 </div></div>;
}
