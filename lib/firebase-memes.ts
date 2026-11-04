import {ref,query,orderByChild,limitToLast,onValue,set,remove,serverTimestamp} from 'firebase/database';
import {db,visitor} from './firebase-room.ts';
import {memes} from './memes.ts';

export type MemeComment={id:string,authorId:string,authorName:string,body:string,created:number};
function commentPath(memeId:string){
 if(!memes.some(meme=>meme.id===memeId))throw Error('밈을 다시 선택해주세요.');
 return 'memeComments/'+memeId;
}
export async function listenMemeComments(memeId:string,onComments:(comments:MemeComment[])=>void,onError:(error:unknown)=>void){
 const path=commentPath(memeId),uid=await visitor();
 const unsubscribe=onValue(query(ref(db,path),orderByChild('created'),limitToLast(100)),snapshot=>{
  const comments:MemeComment[]=[];
  snapshot.forEach(child=>{comments.push({...child.val(),id:child.key!})});
  onComments(comments);
 },onError);
 return {uid,unsubscribe};
}
export async function sendMemeComment(memeId:string,id:string,authorName:string,body:string){
 const path=commentPath(memeId),uid=await visitor();
 authorName=authorName.trim();body=body.trim();
 if(!authorName||authorName.length>16)throw Error('닉네임은 1~16자로 입력해주세요.');
 if(!body||body.length>500)throw Error('댓글은 1~500자로 입력해주세요.');
 if(!/^[\w-]{20,64}$/.test(id))throw Error('댓글을 다시 입력해주세요.');
 await set(ref(db,path+'/'+id),{authorId:uid,authorName,body,created:serverTimestamp()});
}
export async function deleteMemeComment(memeId:string,id:string){
 await visitor();
 await remove(ref(db,commentPath(memeId)+'/'+id));
}
