import {useEffect,useState} from 'react';
import {memes} from '../lib/memes';
import {loadBoardImage} from '../lib/firebase-board';
import type {StackItem} from '../lib/stack-board';
const base=import.meta.env.BASE_URL;
export default function StackPicture({month,item}:{month:string,item:StackItem}){
 const original=item.content.startsWith('meme:')?memes.find(meme=>meme.id===item.content.slice(5)):undefined;
 const [src,setSrc]=useState(original?base+'memes/'+original.image:''),[failed,setFailed]=useState(false);
 useEffect(()=>{
  if(original){setSrc(base+'memes/'+original.image);return}
  let disposed=false;setFailed(false);setSrc('');
  void loadBoardImage(month,item.id).then(image=>{if(!disposed)setSrc(image)}).catch(()=>{if(!disposed)setFailed(true)});
  return()=>{disposed=true};
 },[month,item.id,item.content]);
 return src?<img src={src} alt={original?.alt||item.ownerName+'님이 붙인 사진'} draggable={false}/>:<span className="stack-photo-placeholder">{failed?'사진을 불러오지 못했어요':'사진을 불러오는 중…'}</span>;
}

