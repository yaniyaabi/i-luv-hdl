'use client';
import {useEffect,useRef,useState} from 'react';
import {X,ExternalLink,Minus,Maximize2} from 'lucide-react';
export const soundtracks=[
 {id:'b78FLPvTOvk',name:'집에서 듣는 카페 소리',detail:'카페 ASMR · 스터디윗미',externalOnly:false},
 {id:'DobdaKkl40A',name:'미국 스타벅스',detail:'실제 카페 소리 · 백색소음',externalOnly:true},
 {id:'0nNcqgLwO4I',name:'비 오는 뉴욕 커피숍',detail:'Rain · coffee shop ambience',externalOnly:false},
 {id:'cbuZfY2S2UQ',name:'코딩할 때 듣는 lo-fi',detail:'lofi type beat · playlist',externalOnly:true},
 {id:'180ysvIh6kU',name:'비 오는 뉴욕 대학교',detail:'감성 playlist',externalOnly:false}
];
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
 return <section className={'music-dock music-compact '+(folded?'music-folded':'')} aria-label="YouTube 배경 소리 플레이어"><header><h2>{track.name}</h2><button aria-label={folded?'플레이어 펼치기':'플레이어 접기'} onClick={toggleFold}>{folded?<Maximize2 size={11}/>:<Minus size={12}/>}</button><button aria-label="음악 정지하고 플레이어 닫기" onClick={onClose}><X size={13}/></button></header><div ref={host} className="official-youtube" hidden={folded}/><footer hidden={folded}><span role="status">{error||status}</span><a href={'https://www.youtube.com/watch?v='+track.id} target="_blank" rel="noreferrer" aria-label="YouTube에서 영상 열기"><ExternalLink size={11}/></a></footer></section>
}
