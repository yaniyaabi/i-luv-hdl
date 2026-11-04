import {useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,Trash2,X} from 'lucide-react';
import {deleteBoardComment,listenBoardComments,sendBoardComment} from '../lib/firebase-board';
import type {MemeComment} from '../lib/firebase-memes';
import type {StackItem} from '../lib/stack-board';
import StackPicture from './stack-picture';

export default function StackDetail({month,item,name,onClose}:{month:string,item:StackItem,name:string,onClose:()=>void}){
 const [comments,setComments]=useState<MemeComment[]>([]),[uid,setUid]=useState(''),[author,setAuthor]=useState(name.trim()||'guest'),[body,setBody]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dialog=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;close.current?.focus();return()=>{if(previous?.isConnected)previous.focus()}},[]);
 useEffect(()=>{
  let disposed=false,stop:(()=>void)|undefined;setLoading(true);setComments([]);
  void listenBoardComments(month,item.id,next=>{if(!disposed){setComments(next);setLoading(false)}},()=>{if(!disposed){setLoading(false);setError('댓글을 불러오지 못했어요. 다시 열어주세요.')}}).then(connection=>{if(disposed)connection.unsubscribe();else{setUid(connection.uid);stop=connection.unsubscribe}}).catch(()=>{if(!disposed){setLoading(false);setError('댓글에 다시 연결해주세요.')}});
  return()=>{disposed=true;stop?.()};
 },[month,item.id]);
 function keys(event:React.KeyboardEvent){
  if(event.key==='Escape'){event.stopPropagation();onClose()}
  if(event.key==='Tab'){
   const nodes=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)');if(!nodes?.length)return;
   const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
 }
 return <div className="meme-dialog-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose()}}><div className="meme-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="stack-detail-title" onKeyDown={keys}>
  <button className="meme-close" ref={close} aria-label="조각 닫기" onClick={onClose}><X size={21}/></button>
  <div className="meme-full-image stack-detail-image">{item.kind==='image'?<StackPicture month={month} item={item}/>:<div className="stack-detail-text" style={{color:item.color}}>{item.content}</div>}<p>{month} · {item.ownerName}</p></div>
  <div className="meme-discussion"><h2 id="stack-detail-title">{item.kind==='image'?'사진 한 조각':item.content.slice(0,35)}</h2><p className="meme-comment-intro">우리의 보드에 공감 한 줄.</p><h3><MessageCircle size={16}/>댓글 <span>{comments.length}</span></h3>
   <div className="meme-comments" aria-live="polite" aria-busy={loading}>{loading?<p className="meme-empty">댓글을 불러오는 중…</p>:comments.length?comments.map(comment=><article className="meme-comment" key={comment.id}><div><strong>{comment.authorName}{comment.authorId===uid&&<small> 나</small>}</strong><time dateTime={new Date(comment.created).toISOString()}>{new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(comment.created)}</time>{comment.authorId===uid&&<button aria-label="내 댓글 삭제" onClick={()=>{void deleteBoardComment(month,item.id,comment.id).catch(()=>setError('댓글을 지우지 못했어요. 다시 시도해주세요.'))}}><Trash2 size={13}/></button>}</div><p>{comment.body}</p></article>):<p className="meme-empty">아직 댓글이 없어요.<br/>첫 공감 한 줄을 남겨주세요.</p>}</div>
   <form className="meme-comment-form" onSubmit={async event=>{event.preventDefault();if(busy||!body.trim())return;setBusy(true);setError('');try{await sendBoardComment(month,item.id,body,author);setBody('')}catch{setError('댓글을 남기지 못했어요. 다시 시도해주세요.')}finally{setBusy(false)}}}><label>닉네임<input aria-label="닉네임" value={author} maxLength={16} onChange={event=>setAuthor(event.target.value)} required/></label><label>댓글<textarea aria-label="댓글" value={body} maxLength={500} onChange={event=>setBody(event.target.value)} placeholder="공감 한 줄 남기기" disabled={busy} required/></label><div><small>{body.length}/500 · 모든 방문자가 함께 봐요.</small><button type="submit" className="black" disabled={busy||loading||!uid||!body.trim()||!author.trim()}><Send size={13}/>{busy?'남기는 중…':'댓글 남기기'}</button></div>{error&&<p role="alert" className="meme-error">{error}</p>}</form>
  </div>
 </div></div>;
}
