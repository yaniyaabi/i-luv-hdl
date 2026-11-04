import {initializeApp,getApps} from 'firebase/app';
import {initializeAuth,browserLocalPersistence,signInAnonymously} from 'firebase/auth';
import {getDatabase,ref,query,orderByChild,limitToLast,onValue,update,get,serverTimestamp} from 'firebase/database';
import {firebaseConfig} from './firebase-config.ts';
import type {StackItem} from './stack-board.ts';
import type {MemeComment} from './firebase-memes.ts';

// Board authors stay recognizable after a reload. Cafe room identities remain per-page.
const app=getApps().find(app=>app.name==='monthly-board')||initializeApp(firebaseConfig,'monthly-board');
const auth=initializeAuth(app,{persistence:browserLocalPersistence}),db=getDatabase(app);
let session:Promise<string>|undefined;
export function boardVisitor(){
 return session??=auth.authStateReady().then(async()=>auth.currentUser?.uid||(await signInAnonymously(auth)).user.uid).catch(error=>{session=undefined;throw error});
}
function path(month:string){if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))throw Error('월을 다시 선택해주세요.');return 'stackBoards/'+month+'/items'}
export async function listenBoard(month:string,onItems:(items:StackItem[])=>void,onError:(error:unknown)=>void){
 const base=path(month),uid=await boardVisitor();
 const unsubscribe=onValue(query(ref(db,base),orderByChild('created'),limitToLast(100)),snapshot=>{
  const items:StackItem[]=[];snapshot.forEach(child=>{items.push({...child.val(),id:child.key!})});onItems(items);
 },onError);
 return {uid,unsubscribe};
}
export async function createBoardItem(month:string,item:StackItem,image?:string){
 const base=path(month),uid=await boardVisitor();
 if(item.ownerId!==uid)throw Error('보드에 다시 연결해주세요.');
 const {id,...record}=item;
 const values:Record<string,unknown>={[base+'/'+id]:{...record,created:serverTimestamp(),updated:serverTimestamp()}};
 if(image){
  if(image.length>180000||!/^data:image\/(webp|png|jpeg);base64,/.test(image))throw Error('사진 크기를 줄여 다시 넣어주세요.');
  values['stackImages/'+month+'/'+id]={ownerId:uid,image,created:serverTimestamp()};
 }
 await update(ref(db),values);
}
export async function updateBoardItem(month:string,item:StackItem){
 const base=path(month),uid=await boardVisitor();if(item.ownerId!==uid)throw Error('내가 올린 조각만 수정할 수 있어요.');
 const {id,created,...record}=item;await update(ref(db,base+'/'+id),{...record,updated:serverTimestamp()});
}
const imageCache=new Map<string,string>();
export async function loadBoardImage(month:string,id:string){
 const key=month+'/'+id;if(imageCache.has(key))return imageCache.get(key)!;
 await boardVisitor();const snapshot=await get(ref(db,'stackImages/'+key));
 const image=snapshot.child('image').val();if(typeof image!=='string')throw Error('사진을 불러오지 못했어요.');
 imageCache.set(key,image);return image;
}
export async function listenBoardComments(month:string,itemId:string,onComments:(comments:MemeComment[])=>void,onError:(error:unknown)=>void){
 path(month);const uid=await boardVisitor();
 const unsubscribe=onValue(query(ref(db,'stackComments/'+month+'/'+itemId),orderByChild('created'),limitToLast(100)),snapshot=>{
  const comments:MemeComment[]=[];snapshot.forEach(child=>{comments.push({...child.val(),id:child.key!})});onComments(comments);
 },onError);
 return {uid,unsubscribe};
}
export async function sendBoardComment(month:string,itemId:string,body:string,name:string){
 path(month);const uid=await boardVisitor();body=body.trim();name=name.trim()||'guest';
 if(!body||body.length>500||name.length>16)throw Error('닉네임과 댓글을 확인해주세요.');
 await update(ref(db,'stackComments/'+month+'/'+itemId),{[crypto.randomUUID()]:{authorId:uid,authorName:name,body,created:serverTimestamp()}});
}
export async function deleteBoardComment(month:string,itemId:string,id:string){
 await boardVisitor();await update(ref(db,'stackComments/'+month+'/'+itemId),{[id]:null});
}
