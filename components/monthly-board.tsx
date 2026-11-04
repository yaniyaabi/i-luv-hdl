import {useEffect,useRef,useState} from 'react';
import {ArrowUpToLine,ChevronLeft,ChevronRight,ImagePlus,Maximize2,MessageCircle,Minus,Plus,RotateCcw,RotateCw,Trash2,Type,X} from 'lucide-react';
import {BOARD_WIDTH,BOARD_HEIGHT,VIEW_WIDTH,VIEW_HEIGHT,boardItemLayout,moveBoardItem,STARTER_MONTH,currentBoardMonth,fitStackItem,monthLettering,moveBoardMonth,type StackItem} from '../lib/stack-board';
import {createBoardItem,listenBoard,updateBoardItem} from '../lib/firebase-board';
import {prepareBoardPhoto} from '../lib/board-photo';
import {memes} from '../lib/memes';
import MemeDetail from './meme-detail';
import StackDetail from './stack-detail';
import StackPicture from './stack-picture';

const base=import.meta.env.BASE_URL;
const positions=[[150,180,300,300,-7],[610,250,290,290,7],[400,570,275,295,3],[170,910,300,300,-6],[600,940,280,350,5]];
const starter:StackItem[]=memes.map((meme,i)=>({id:'starter_'+meme.id,kind:'image',ownerId:'starter',ownerName:'meme gotgan',content:'meme:'+meme.id,x:positions[i][0],y:positions[i][1],w:positions[i][2],h:positions[i][3],rotation:positions[i][4],z:10+i,color:'#fffaf0',fontSize:32,created:0,updated:0,deleted:false}));
function errorMessage(error:unknown){
 if(/permission/i.test((error as {code?:string})?.code||''))return '보드에 다시 연결해주세요. 다른 사람이 올린 조각은 수정할 수 없어요.';
 if(/network|unavailable/i.test((error as {code?:string})?.code||''))return '연결을 확인해주세요. 다시 연결되면 보드를 불러와요.';
 return error instanceof Error?error.message:'저장하지 못했어요. 다시 시도해주세요.';
}

export default function MonthlyBoard({name}:{name:string}){
 const [month,setMonth]=useState(currentBoardMonth),[records,setRecords]=useState<StackItem[]>([]),[recordsMonth,setRecordsMonth]=useState(''),[uid,setUid]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState(''),[draft,setDraft]=useState<StackItem|null>(null),[textEditor,setTextEditor]=useState<StackItem|'new'|null>(null),[detail,setDetail]=useState(''),[trash,setTrash]=useState(false),[scale,setScale]=useState(1);
 const pane=useRef<HTMLElement>(null),frame=useRef<HTMLDivElement>(null),canvas=useRef<HTMLDivElement>(null),fileInput=useRef<HTMLInputElement>(null),drag=useRef<{id:string,pointer:number,startX:number,startY:number,item:StackItem,moved:boolean}|null>(null),latest=useRef<StackItem[]>([]),lastCurrent=useRef(currentBoardMonth());
 const combined=new Map<string,StackItem>((month===STARTER_MONTH?starter:[]).map(item=>[item.id,item]));(recordsMonth===month?records:[]).forEach(item=>combined.set(item.id,item));if(draft)combined.set(draft.id,draft);
 const all=[...combined.values()].sort((a,b)=>a.z-b.z),items=all.filter(item=>!item.deleted),active=items.find(item=>item.id===selected),detailItem=items.find(item=>item.id===detail);
 latest.current=all;
 const canEdit=(item:StackItem)=>!!uid&&(item.ownerId===uid||item.ownerId==='starter');
 useEffect(()=>{
  let disposed=false,stop:(()=>void)|undefined;setRecords([]);setUid('');setLoading(true);setError('');setSelected('');setDraft(null);setDetail('');setTrash(false);setTextEditor(null);
  void listenBoard(month,next=>{if(!disposed){setRecords(next);setRecordsMonth(month);setLoading(false)}},e=>{if(!disposed){setLoading(false);setError(errorMessage(e))}}).then(connection=>{if(disposed)connection.unsubscribe();else{setUid(connection.uid);stop=connection.unsubscribe}}).catch(e=>{if(!disposed){setLoading(false);setError(errorMessage(e))}});
  return()=>{disposed=true;stop?.();drag.current=null};
 },[month]);
 useEffect(()=>{
  const node=frame.current;if(!node)return;
  const resize=()=>setScale(Math.min(node.clientWidth/VIEW_WIDTH,node.clientHeight/VIEW_HEIGHT));resize();const observer=new ResizeObserver(resize);observer.observe(node);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  const check=()=>{const next=currentBoardMonth();if(next!==lastCurrent.current){const previous=lastCurrent.current;lastCurrent.current=next;setMonth(value=>value===previous?next:value)}};
  const timer=setInterval(check,60000);document.addEventListener('visibilitychange',check);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',check)};
 },[]);
 async function persist(item:StackItem){
  try{
   setError('');
   if(item.ownerId==='starter')await createBoardItem(month,{...item,ownerId:uid,ownerName:name.trim()||'guest'});
   else await updateBoardItem(month,item);
  }catch(e){setError(errorMessage(e));throw e}finally{setDraft(null)}
 }
 function placement(w:number,h:number){
  return {x:(BOARD_WIDTH-w)*(.5+(Math.random()-.5)*.12),y:(BOARD_HEIGHT-h)*(.5+(Math.random()-.5)*.12)};
 }
 function newItem(kind:'image'|'text',content:string,w:number,h:number,fontSize=32,color='#fffaf0'):StackItem{
  return fitStackItem({id:crypto.randomUUID(),kind,content,ownerId:uid,ownerName:name.trim()||'guest',...placement(w,h),w,h,rotation:Math.round((Math.random()-.5)*14),z:Math.max(20,...latest.current.map(item=>item.z))+1,color,fontSize,created:Date.now(),updated:Date.now(),deleted:false});
 }
 async function photos(files:File[]){
  if(busy||loading||!uid||textEditor||detail||trash)return;if(records.filter(item=>!item.deleted).length>=100){setError('이달 보드가 꽉 찼어요. 내 조각을 정리한 뒤 다시 넣어주세요.');return}
  setBusy(true);setError('');
  try{for(const file of files.slice(0,6)){const photo=await prepareBoardPhoto(file),w=320,h=Math.min(640,w*photo.height/photo.width),item=newItem('image','',w,h);item.content=item.id;await createBoardItem(month,item,photo.image);setSelected(item.id)}}catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 const pasteHandler=useRef(photos);pasteHandler.current=photos;
 useEffect(()=>{
  const paste=(event:ClipboardEvent)=>{if((event.target as HTMLElement)?.closest('input,textarea,[contenteditable=true]'))return;const files=[...(event.clipboardData?.items||[])].filter(item=>item.type.startsWith('image/')).map(item=>item.getAsFile()).filter((file):file is File=>!!file);if(files.length){event.preventDefault();void pasteHandler.current(files)}};
  window.addEventListener('paste',paste);return()=>window.removeEventListener('paste',paste);
 },[]);
 function pointerDown(event:React.PointerEvent<HTMLDivElement>,item:StackItem){
  if(event.button!==0)return;setSelected(item.id);if(!canEdit(item)||busy)return;
  event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:item.id,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,item,moved:false};
 }
 function pointerMove(event:React.PointerEvent<HTMLDivElement>){
  const current=drag.current;if(!current||current.pointer!==event.pointerId)return;
  const dx=(event.clientX-current.startX)/scale,dy=(event.clientY-current.startY)/scale;if(Math.abs(dx)+Math.abs(dy)<3&&!current.moved)return;
  current.moved=true;setDraft(moveBoardItem(current.item,dx,dy));
 }
 function pointerEnd(event:React.PointerEvent<HTMLDivElement>){
  const current=drag.current;if(!current||current.pointer!==event.pointerId)return;drag.current=null;
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  if(current.moved){const next=moveBoardItem(current.item,(event.clientX-current.startX)/scale,(event.clientY-current.startY)/scale);void persist(next).catch(()=>{})}
 }
 function change(item:StackItem,patch:Partial<StackItem>){const next=fitStackItem({...item,...patch});setDraft(next);void persist(next).catch(()=>{})}
 function resize(item:StackItem,factor:number){change(item,{w:item.w*factor,h:item.h*factor,fontSize:item.fontSize*factor})}
 function keys(event:React.KeyboardEvent<HTMLDivElement>,item:StackItem){
  if(event.key==='Enter'){event.preventDefault();event.stopPropagation();setDetail(item.id);return}
  if(!canEdit(item))return;
  const distance=event.shiftKey?30:10,delta:Record<string,[number,number]>={ArrowLeft:[-distance,0],ArrowRight:[distance,0],ArrowUp:[0,-distance],ArrowDown:[0,distance]};
  if(delta[event.key]){event.preventDefault();event.stopPropagation();const [x,y]=delta[event.key];change(item,moveBoardItem(item,x,y))}
 }
 return <section ref={pane} className="stack-room" id="meme-panel" role="region" aria-label="meme gotgan" onDragOver={event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault()}} onDrop={event=>{event.preventDefault();void photos([...event.dataTransfer.files])}}>
  <header className="stack-toolbar"><div className="stack-month-nav"><button aria-label="이전 달 보드" disabled={busy} onClick={()=>setMonth(moveBoardMonth(month,-1))}><ChevronLeft size={17}/></button><input type="month" aria-label="보드 월 선택" value={month} min="2020-01" max="2099-12" disabled={busy} onInput={event=>{if(event.currentTarget.value)setMonth(event.currentTarget.value)}}/><button aria-label="다음 달 보드" disabled={busy} onClick={()=>setMonth(moveBoardMonth(month,1))}><ChevronRight size={17}/></button></div>
   <div className="stack-add-tools"><button disabled={loading||busy||!uid} onClick={()=>fileInput.current?.click()}><ImagePlus size={15}/>사진 붙이기</button><button disabled={loading||busy||!uid} onClick={()=>setTextEditor('new')}><Type size={16}/>글씨 붙이기</button><button aria-label="내 휴지통" onClick={()=>setTrash(true)}><Trash2 size={15}/></button></div>
  </header>
  <p className="stack-help">모두의 {month.slice(0,4)}년 {Number(month.slice(5))}월 보드 · 사진을 복사해서 Ctrl+V / ⌘V로 붙여넣어 보세요.</p><p className="stack-help stack-help-sub">올리면 모두에게 보여요. 내 조각은 드래그하고, 크기와 기울기도 바꿀 수 있어요.</p>
  {(loading||busy)&&<p className="stack-status" role="status">{busy?'사진을 붙이는 중…':'이달 보드를 불러오는 중…'}</p>}{error&&<p className="stack-error" role="alert">{error}<button aria-label="오류 안내 닫기" onClick={()=>setError('')}><X size={12}/></button></p>}
  <input className="sr-only" ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple aria-label="보드 사진 업로드" onChange={event=>{void photos([...(event.target.files||[])]);event.target.value=''}}/>
  <div className="stack-board-frame" ref={frame}><div className="stack-board-viewport" style={{width:VIEW_WIDTH*scale,height:VIEW_HEIGHT*scale}}><div className="stack-canvas" ref={canvas} role="region" aria-label={month+' 공유 콜라주 보드'} tabIndex={0} style={{width:VIEW_WIDTH,height:VIEW_HEIGHT,transform:'scale('+scale+')'}} onPointerDown={event=>{if(event.target===event.currentTarget)setSelected('')}}>
   <img className="stack-tin-background" src={base+'reference/stack-tin.png'} alt="별과 종이 장식이 있는 열린 틴케이스" draggable={false}/><div className="stack-month-lettering" aria-hidden="true">{monthLettering(month)}</div>
   {items.map(item=><div key={item.id} data-stack-id={item.id} className={'stack-piece '+(item.kind==='text'?'stack-text':'stack-photo')+(selected===item.id?' is-selected':'')+(canEdit(item)?' is-movable':'')} role="button" tabIndex={0} aria-label={item.kind==='text'?'글씨: '+item.content:item.ownerName+'님의 사진'} aria-pressed={selected===item.id} title="더블클릭하면 크게 보고 댓글을 남길 수 있어요." style={{left:boardItemLayout(item).x,top:boardItemLayout(item).y,width:boardItemLayout(item).w,height:boardItemLayout(item).h,transform:'rotate('+item.rotation+'deg)',zIndex:item.z,color:item.color,fontSize:item.fontSize*boardItemLayout(item).factor}} onPointerDown={event=>pointerDown(event,item)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={()=>{drag.current=null;setDraft(null)}} onDoubleClick={()=>setDetail(item.id)} onKeyDown={event=>keys(event,item)}>
    {item.kind==='image'?<StackPicture month={month} item={item}/>:<span>{item.content}</span>}
   </div>)}
  </div></div></div>
  {!loading&&items.length===0&&<p className="stack-empty">새로운 달, 새로운 보드.<br/>첫 사진이나 글씨를 붙여보세요.</p>}
  <p className="stack-footer">한 달에 한 장씩, 우리의 조각을 쌓아요. · 최근 100개 조각을 함께 봐요.</p>
  {active&&<div className="stack-selection-tools" role="toolbar" aria-label="선택한 조각 편집"><span>{active.ownerId==='starter'?'meme gotgan':active.ownerName}</span><button aria-label="사진 또는 글씨 크게 보기" onClick={()=>setDetail(active.id)}><Maximize2 size={15}/></button><button aria-label="댓글 보기" onClick={()=>setDetail(active.id)}><MessageCircle size={15}/></button>{canEdit(active)&&<><button aria-label="조각 작게" onClick={()=>resize(active,.9)}><Minus size={15}/></button><button aria-label="조각 크게" onClick={()=>resize(active,1.1)}><Plus size={15}/></button><button aria-label="조각 왼쪽 회전" onClick={()=>change(active,{rotation:active.rotation-5})}><RotateCcw size={15}/></button><button aria-label="조각 오른쪽 회전" onClick={()=>change(active,{rotation:active.rotation+5})}><RotateCw size={15}/></button><button aria-label="조각 맨 앞으로" onClick={()=>change(active,{z:Math.max(...items.map(item=>item.z))+1})}><ArrowUpToLine size={15}/></button>{active.kind==='text'&&<button aria-label="글씨 수정" onClick={()=>setTextEditor(active)}><Type size={16}/></button>}<button aria-label="내 조각 휴지통으로" onClick={()=>{change(active,{deleted:true});setSelected('')}}><Trash2 size={15}/></button></>}<button aria-label="선택 해제" onClick={()=>setSelected('')}><X size={15}/></button></div>}
  {textEditor&&<TextEditor item={textEditor==='new'?undefined:textEditor} onClose={()=>setTextEditor(null)} onSave={async(content,color,fontSize)=>{
   const lines=content.split('\n'),w=Math.min(750,Math.max(160,Math.max(...lines.map(line=>line.length))*fontSize*.66)),h=Math.min(900,Math.max(70,lines.length*fontSize*.95));
   if(textEditor==='new'){const item=newItem('text',content,w,h,fontSize,color);await createBoardItem(month,item);setSelected(item.id)}else await persist(fitStackItem({...textEditor,content,color,fontSize,w,h}));setTextEditor(null);
  }}/>}
  {trash&&<div className="stack-modal-backdrop"><section className="stack-small-dialog" role="dialog" aria-modal="true" aria-labelledby="stack-trash-title"><button className="stack-modal-close" aria-label="휴지통 닫기" onClick={()=>setTrash(false)}><X size={19}/></button><h2 id="stack-trash-title">내 휴지통</h2><p>이달에 내가 지운 조각을 다시 붙일 수 있어요.</p>{all.filter(item=>item.deleted&&item.ownerId===uid).map(item=><div className="stack-trash-row" key={item.id}><span>{item.kind==='text'?item.content.slice(0,35):'사진 조각'}</span><button onClick={()=>change(item,{deleted:false})}>다시 붙이기</button></div>)}{!all.some(item=>item.deleted&&item.ownerId===uid)&&<p>휴지통이 비어 있어요.</p>}</section></div>}
  {detailItem&&(detailItem.content.startsWith('meme:')?<MemeDetail meme={memes.find(meme=>meme.id===detailItem.content.slice(5))!} name={name} onClose={()=>setDetail('')} onChange={meme=>setDetail('starter_'+meme.id)}/>:<StackDetail month={month} item={detailItem} name={name} onClose={()=>setDetail('')}/>)}
 </section>;
}

function TextEditor({item,onClose,onSave}:{item?:StackItem,onClose:()=>void,onSave:(text:string,color:string,fontSize:number)=>Promise<void>}){
 const [text,setText]=useState(item?.content||''),[color,setColor]=useState(item?.color||'#fffaf0'),[fontSize,setFontSize]=useState(item?.fontSize||140),[busy,setBusy]=useState(false),[error,setError]=useState('');const field=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{field.current?.focus()},[]);
 return <div className="stack-modal-backdrop"><form className="stack-small-dialog" role="dialog" aria-modal="true" aria-labelledby="stack-text-title" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();if(!busy)onClose()}}} onSubmit={async event=>{event.preventDefault();if(!text.trim()||busy)return;setBusy(true);try{await onSave(text.trim(),color,fontSize)}catch(e){setError(errorMessage(e));setBusy(false)}}}><button className="stack-modal-close" type="button" aria-label="글씨 편집 닫기" disabled={busy} onClick={onClose}><X size={19}/></button><h2 id="stack-text-title">글씨도 한 조각.</h2><label>넣을 글씨<textarea aria-label="보드에 붙일 글씨" ref={field} value={text} onChange={event=>setText(event.target.value)} maxLength={180} required placeholder={'no\nvem\nber'}/></label><p>줄을 나누면 사진처럼 글씨를 쌓을 수 있어요.</p><div className="stack-color-palette" role="group" aria-label="글씨 색상">{['#fffaf0','#1f211d','#f3a7be','#f57322','#54d9be','#cfb6ff'].map(value=><button type="button" key={value} aria-label={'글씨 색상 '+value} aria-pressed={color===value} style={{background:value}} onClick={()=>setColor(value)}/>)}</div><label>글씨 크기 <span>{fontSize}</span><input aria-label="글씨 크기" type="range" min="40" max="180" step="5" value={fontSize} onChange={event=>setFontSize(Number(event.target.value))}/></label><div className="stack-type-preview" style={{color,fontSize:Math.min(fontSize*.45,66)}}>{text||'your\nmood'}</div>{error&&<p role="alert" className="stack-error">{error}</p>}<button type="submit" className="black" disabled={busy||!text.trim()}>{busy?'붙이는 중…':'보드에 붙이기'}</button></form></div>;
}
