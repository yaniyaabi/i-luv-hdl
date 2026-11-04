import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,MessageCircle,Send,Trash2,X} from 'lucide-react';
import {memes,type Meme} from '../lib/memes';
import {deleteMemeComment,listenMemeComments,sendMemeComment,type MemeComment} from '../lib/firebase-memes';

const root=import.meta.env.BASE_URL+'memes/';
const dateLabel=(created:number)=>new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(created);
function commentError(error:unknown){
 if(/permission/i.test((error as {code?:string})?.code||''))return '댓글을 불러오지 못했어요. 잠시 후 다시 열어주세요.';
 if(/network|unavailable/i.test((error as {code?:string})?.code||''))return '인터넷 연결을 확인해주세요.';
 return error instanceof Error?error.message:'댓글 연결을 다시 시도해주세요.';
}

export default function MemeDetail({meme,name,onClose,onChange}:{meme:Meme,name:string,onClose:()=>void,onChange:(meme:Meme)=>void}){
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
  <div className="meme-discussion"><h2 id={'meme-title-'+meme.id}>{meme.title}</h2><p className="meme-comment-intro">이 밈, 나만 공감한 거 아니지?</p><h3><MessageCircle size={16}/>댓글 <span>{comments.length}{comments.length===100?'+':''}</span></h3>
   <div className="meme-comments" aria-live="polite" aria-busy={loading}>{loading?<p className="meme-empty">댓글을 불러오는 중…</p>:comments.length?comments.map(comment=><article className="meme-comment" key={comment.id}><div><strong>{comment.authorName}{comment.authorId===uid&&<small> 나</small>}</strong><time dateTime={new Date(comment.created).toISOString()}>{dateLabel(comment.created)}</time>{comment.authorId===uid&&<button aria-label="내 댓글 삭제" disabled={deleting===comment.id} onClick={async()=>{setDeleting(comment.id);try{await deleteMemeComment(meme.id,comment.id)}catch(e){setError(commentError(e))}finally{setDeleting('')}}}><Trash2 size={13}/></button>}</div><p>{comment.body}</p></article>):<p className="meme-empty">아직 댓글이 없어요.<br/>첫 공감 한 줄을 남겨주세요.</p>}</div>
   <form className="meme-comment-form" onSubmit={submit}><label htmlFor="meme-author">닉네임<input id="meme-author" value={authorName} maxLength={16} required onChange={event=>setAuthorName(event.target.value)} autoComplete="nickname"/></label><label htmlFor="meme-comment-body">댓글<textarea id="meme-comment-body" value={body} maxLength={500} required placeholder="나도 이래… 공감 한 줄 남기기" onChange={event=>{pendingId.current='';setBody(event.target.value)}} disabled={busy}/></label><div><small>{body.length}/500 · 모든 방문자가 함께 봐요.</small><button className="black" type="submit" disabled={busy||loading||!uid||!body.trim()||!authorName.trim()}><Send size={13}/>{busy?'남기는 중…':'댓글 남기기'}</button></div>{error&&<p role="alert" className="meme-error">{error}</p>}</form>
  </div>
 </div></div>;
}
