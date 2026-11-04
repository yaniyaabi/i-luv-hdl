import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';

export const asmrVideos=[
 {id:'8nQzRt6MaFY',start:555},
 {id:'krIPPgEGNAM',start:1805},
 {id:'GlTyzMi2xHU',start:0},
 {id:'jWQcMIbT0T4',start:0}
];

export default function AsmrAlbum(){
 const [index,setIndex]=useState(0),room=useRef<HTMLElement>(null);
 const previous=(index-1+asmrVideos.length)%asmrVideos.length,next=(index+1)%asmrVideos.length,video=asmrVideos[index];
 useEffect(()=>{room.current?.focus({preventScroll:true})},[]);
 function move(direction:number){setIndex(current=>(current+direction+asmrVideos.length)%asmrVideos.length)}
 return <section className="asmr-room" id="asmr-panel" aria-label="ASMR 영상 앨범" tabIndex={0} ref={room} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();move(event.key==='ArrowLeft'?-1:1)}}}>
  <div className="asmr-track">
   <button className="asmr-preview" aria-label="이전 영상 미리보기" onClick={()=>move(-1)}><img src={'https://i.ytimg.com/vi/'+asmrVideos[previous].id+'/hqdefault.jpg'} alt="" draggable={false}/></button>
   <div className="asmr-focus"><iframe key={video.id} src={'https://www.youtube.com/embed/'+video.id+'?start='+video.start+'&autoplay=0&playsinline=1&rel=0'} title={'ASMR 영상 '+(index+1)} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen/>
    <button className="asmr-album-arrow asmr-previous" aria-label="이전 ASMR 영상" onClick={()=>move(-1)}><ChevronLeft size={26}/></button><button className="asmr-album-arrow asmr-next" aria-label="다음 ASMR 영상" onClick={()=>move(1)}><ChevronRight size={26}/></button>
   </div>
   <button className="asmr-preview" aria-label="다음 영상 미리보기" onClick={()=>move(1)}><img src={'https://i.ytimg.com/vi/'+asmrVideos[next].id+'/hqdefault.jpg'} alt="" draggable={false}/></button>
  </div>
 </section>;
}
