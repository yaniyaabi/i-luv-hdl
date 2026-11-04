'use client';
import {useEffect,useLayoutEffect,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {X,ExternalLink,Minus,Maximize2,GripHorizontal} from 'lucide-react';
export const soundtracks=[
 {id:'b78FLPvTOvk',name:'집에서 듣는 카페 소리',detail:'카페 ASMR · 스터디윗미'},
 {id:'0nNcqgLwO4I',name:'비 오는 뉴욕 커피숍',detail:'Rain · coffee shop ambience'},
 {id:'180ysvIh6kU',name:'비 오는 뉴욕 대학교',detail:'감성 playlist'}
];
type Position={x:number,y:number};
const positionKey='hdl-music-position';
function savedPosition():Position|null{
 try{
  const value=JSON.parse(sessionStorage.getItem(positionKey)||'null');
  return value&&Number.isFinite(value.x)&&Number.isFinite(value.y)?{x:value.x,y:value.y}:null;
 }catch{return null}
}
function keepOnScreen(position:Position,element:HTMLElement):Position{
 const rect=element.getBoundingClientRect(),margin=8;
 return {x:Math.max(margin,Math.min(position.x,window.innerWidth-rect.width-margin)),y:Math.max(margin,Math.min(position.y,window.innerHeight-rect.height-margin))};
}
let apiPromise:Promise<any>|null=null;
function loadYouTube(){
 if((window as any).YT?.Player)return Promise.resolve((window as any).YT);
 if(!apiPromise)apiPromise=new Promise((resolve,reject)=>{
  const old=(window as any).onYouTubeIframeAPIReady;
  (window as any).onYouTubeIframeAPIReady=()=>{old?.();resolve((window as any).YT)};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{apiPromise=null;reject(Error('플레이어를 불러오지 못했어요.'))};document.head.appendChild(script);
 });
 return apiPromise;
}
export default function MusicPlayer({index,onClose}:{index:number,onClose:()=>void}){
 const track=soundtracks[index],host=useRef<HTMLDivElement|null>(null),[error,setError]=useState(''),[status,setStatus]=useState('플레이어를 불러오는 중…'),[folded,setFolded]=useState(false);
 const playerRef=useRef<any>(null),foldedRef=useRef(false),resumeRef=useRef(false);
 const dock=useRef<HTMLElement|null>(null),drag=useRef<{pointerId:number,offsetX:number,offsetY:number}|null>(null);
 const [position,setPosition]=useState<Position|null>(savedPosition),[dragging,setDragging]=useState(false);
 useEffect(()=>{
  try{if(position)sessionStorage.setItem(positionKey,JSON.stringify(position));else sessionStorage.removeItem(positionKey)}catch{}
 },[position]);
 useLayoutEffect(()=>{
  const element=dock.current;if(!element)return;
  const clamp=()=>setPosition(current=>{
   if(!current)return current;
   const next=keepOnScreen(current,element);
   return next.x===current.x&&next.y===current.y?current:next;
  });
  clamp();
  const observer=new ResizeObserver(clamp);observer.observe(element);
  window.addEventListener('resize',clamp);
  return()=>{observer.disconnect();window.removeEventListener('resize',clamp)};
 },[]);
 function startDrag(event:PointerEvent<HTMLButtonElement>){
  if(event.button!==0||!event.isPrimary||!dock.current)return;
  const rect=dock.current.getBoundingClientRect();
  drag.current={pointerId:event.pointerId,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top};
  event.currentTarget.setPointerCapture(event.pointerId);
  setPosition(keepOnScreen({x:rect.left,y:rect.top},dock.current));setDragging(true);
 }
 function moveDrag(event:PointerEvent<HTMLButtonElement>){
  if(!drag.current||drag.current.pointerId!==event.pointerId||!dock.current)return;
  setPosition(keepOnScreen({x:event.clientX-drag.current.offsetX,y:event.clientY-drag.current.offsetY},dock.current));
 }
 function finishDrag(event:PointerEvent<HTMLButtonElement>){
  if(drag.current?.pointerId!==event.pointerId)return;
  drag.current=null;setDragging(false);
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 }
 function moveWithKeys(event:KeyboardEvent<HTMLButtonElement>){
  if(!dock.current)return;
  if(event.key==='Home'){event.preventDefault();setPosition(null);return}
  const distance=event.shiftKey?50:20;
  const delta:Record<string,Position>={ArrowLeft:{x:-distance,y:0},ArrowRight:{x:distance,y:0},ArrowUp:{x:0,y:-distance},ArrowDown:{x:0,y:distance}};
  const offset=delta[event.key];if(!offset)return;
  event.preventDefault();const rect=dock.current.getBoundingClientRect();
  setPosition(keepOnScreen({x:rect.left+offset.x,y:rect.top+offset.y},dock.current));
 }
 useEffect(()=>{
  let player:any,cancelled=false;
  loadYouTube().then(YT=>{
   if(cancelled||!host.current)return;
   const node=document.createElement('div');host.current.replaceChildren(node);
   player=new YT.Player(node,{width:'100%',height:200,videoId:track.id,playerVars:{autoplay:1,controls:1,playsinline:1,loop:1,playlist:track.id,start:0,origin:window.location.origin},
    events:{
     onReady:()=>{if(cancelled)return;playerRef.current=player;setStatus('재생 버튼을 눌러 들어보세요.');player.getIframe().referrerPolicy='strict-origin-when-cross-origin';player.setVolume(35);if(!foldedRef.current)player.playVideo()},
     onStateChange:(event:any)=>{if(cancelled)return;if(foldedRef.current&&event.data===1){player.pauseVideo();return}setStatus(event.data===1?'지금 재생 중':event.data===2?'일시정지됨':'재생 버튼을 눌러 들어보세요.')},
     onError:(event:any)=>{if(cancelled)return;setError([101,150].includes(event.data)?'영상 소유자가 외부 사이트 재생을 제한했어요.':event.data===153?'이 브라우저에서 YouTube 재생이 제한되었어요.':'이 영상을 재생할 수 없어요. 다른 소리를 골라주세요.');setStatus('')}
    }
   });
  }).catch(e=>{if(!cancelled)setError(e.message)});
  return()=>{cancelled=true;playerRef.current=null;player?.destroy()};
 },[track.id]);
 function toggleFold(){
  const player=playerRef.current;
  if(!foldedRef.current){resumeRef.current=player?.getPlayerState?.()===1;player?.pauseVideo?.();foldedRef.current=true;setFolded(true)}
  else{foldedRef.current=false;setFolded(false);if(resumeRef.current)player?.playVideo?.()}
 }
 return <section ref={dock} className={'music-dock music-compact '+(folded?'music-folded ':'')+(dragging?'is-dragging':'')} style={position?{position:'fixed',left:position.x,top:position.y,right:'auto',bottom:'auto'}:undefined} aria-label="YouTube 배경 소리 플레이어"><header><h2><button className="music-drag-handle" type="button" aria-label={track.name+' 플레이어 위치 이동'} title="드래그해서 이동 · 방향키로 이동 · Home으로 위치 초기화" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag} onKeyDown={moveWithKeys}><GripHorizontal size={12} aria-hidden="true"/><span>{track.name}</span></button></h2><button aria-label={folded?'플레이어 펼치기':'플레이어 접기'} onClick={toggleFold}>{folded?<Maximize2 size={11}/>:<Minus size={12}/>}</button><button aria-label="음악 정지하고 플레이어 닫기" onClick={onClose}><X size={13}/></button></header><div ref={host} className="official-youtube" hidden={folded}/><footer hidden={folded}><span role="status">{error||status}</span><a href={'https://www.youtube.com/watch?v='+track.id} target="_blank" rel="noreferrer" aria-label="YouTube에서 영상 열기"><ExternalLink size={11}/></a></footer></section>
}
