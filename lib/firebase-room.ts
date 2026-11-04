import {initializeApp} from 'firebase/app';
import {initializeAuth,inMemoryPersistence,signInAnonymously} from 'firebase/auth';
import {getDatabase,ref,set,get,update,remove,onValue,onDisconnect,query,orderByChild,limitToLast,serverTimestamp,type Unsubscribe} from 'firebase/database';
import {firebaseConfig} from './firebase-config.ts';
import type {Person,RoomMessage} from '../components/room-chat';

const app=initializeApp(firebaseConfig);
const auth=initializeAuth(app,{persistence:inMemoryPersistence});
export const db=getDatabase(app);
let login:Promise<string>|undefined;
export function visitor(){
  return login ??= signInAnonymously(auth).then(({user})=>user.uid).catch(error=>{login=undefined;throw error});
}
type Profile={name:string,drink:string,joinedAt:number};
type StoredMessage=Omit<RoomMessage,'id'>;
type Options={code:string,name:string,drink:string,onPeople:(people:Person[])=>void,onMessages:(messages:RoomMessage[])=>void,onStatus:(message:string)=>void,onIncoming?:(count:number)=>void,onReset?:()=>void};

export function roomError(error:unknown){
  const code=(error as {code?:string})?.code || '';
  if(/permission|PERMISSION_DENIED/i.test(code))return '방 연결이 만료되었어요. 다시 입장해주세요.';
  if(code==='auth/operation-not-allowed')return '카페 입장 설정을 확인하고 있어요. 잠시 후 다시 시도해주세요.';
  if(code==='auth/too-many-requests')return '입장 요청이 많아요. 잠시 후 다시 시도해주세요.';
  if(/network|unavailable/i.test(code))return '인터넷 연결을 확인해주세요.';
  return error instanceof Error?error.message:'다시 시도해주세요.';
}
function permissionDenied(error:unknown){
 return /permission[_-]?denied/i.test((error as {code?:string})?.code||'');
}

export async function connectRoom(options:Options){
  const {code,name,drink,onPeople,onMessages,onStatus}=options;
  if(!/^\d{4,8}$/.test(code))throw Error('방 번호는 숫자 4~8자리로 입력해주세요.');
  const uid=await visitor();
  const base='rooms/'+code,room=ref(db,base),member=ref(db,base+'/members/'+uid);
  const profile={name:name.trim().slice(0,16)||'guest',drink:drink.slice(0,160),joinedAt:serverTimestamp()};
  const disconnect=onDisconnect(member);
  async function enter(){
    // Rules check this whole update against the latest server state. Clearing
    // history is allowed only for an empty room; otherwise join its live session.
    for(let attempt=0;attempt<5;attempt++){
      const nextProfile={...profile,joinedAt:serverTimestamp()};
      try{
        await update(room,{['members/'+uid]:nextProfile,messages:null,inboxes:null});
        previous=null;system=[];publicMessages=[];whispers=[];
        hasBaseline=false;seenMessages.clear();options.onReset?.();
        return;
      }
      catch(error){if(!permissionDenied(error))throw error}
      try{await set(member,nextProfile);return}
      catch(error){if(!permissionDenied(error))throw error}
      // The last member may have left between the two requests. Retry the
      // empty-room reset instead of exposing that session's saved messages.
    }
    throw Error('방 상태가 바뀌었어요. 다시 입장해주세요.');
  }
  async function depart(){
    try{
      // Remove our presence and both histories together, only if nobody remains.
      await update(room,{['members/'+uid]:null,messages:null,inboxes:null});
    }catch(error){
      if(!permissionDenied(error))throw error;
      await remove(member);
      // Handles two people leaving at once. Rules reject this if anyone stayed
      // or a new visitor has already begun another session.
      try{await update(room,{messages:null,inboxes:null})}
      catch(error){if(!permissionDenied(error))throw error}
    }
    await disconnect.cancel();
  }
  const unsubscribers:Unsubscribe[]=[];
  const listeners:Unsubscribe[]=[];
  const stopListening=()=>listeners.splice(0).forEach(unsubscribe=>unsubscribe());
  let closed=false,previous:Record<string,Profile>|null=null,system:RoomMessage[]=[],publicMessages:RoomMessage[]=[],whispers:RoomMessage[]=[];
  let hasBaseline=false;
  const seenMessages=new Set<string>();
  let firstConnection=true,reconnecting=false,connected=true,lastSent=0;
  const emit=()=>{if(!closed)onMessages([...publicMessages,...whispers,...system].sort((a,b)=>a.created-b.created).slice(-100))};
  const announce=(body:string)=>{system.push({id:'system-'+crypto.randomUUID(),kind:'system',sender:'',senderName:'',recipient:'',recipientName:'',body,created:Date.now()});system=system.slice(-100)};
  const failed=(error:unknown)=>{if(!closed)onStatus(roomError(error))};
  const fromSnapshot=(snapshot:{forEach:(f:(child:any)=>void)=>void})=>{
    const result:RoomMessage[]=[];
    snapshot.forEach(child=>{result.push({...child.val() as StoredMessage,id:child.key!})});
    return result;
  };
  const trackIncoming=(next:RoomMessage[],channel:string)=>{
    let count=0;
    for(const message of next){
      const key=channel+':'+message.id;
      if(seenMessages.has(key))continue;
      seenMessages.add(key);
      if(hasBaseline&&message.kind==='chat'&&message.sender!==uid)count++;
    }
    if(count&&!closed)options.onIncoming?.(count);
  };
  const listen=async()=>{
    stopListening();
    // Firebase may retain snapshots from a disconnected session. Refresh the
    // server snapshots before attaching listeners so a new room never flashes
    // its previous session's public messages or cached private inbox.
    previous=null;system=[];publicMessages=[];whispers=[];emit();
    const [,freshPublic,freshWhispers]=await Promise.all([
      get(ref(db,base+'/members')),
      get(query(ref(db,base+'/messages'),orderByChild('created'),limitToLast(100))),
      get(query(ref(db,base+'/inboxes/'+uid),orderByChild('created'),limitToLast(100))),
    ]);
    if(closed||!connected)return false;
    // Seed existing history before subscribing. Only genuinely new messages
    // notify; repeated snapshots, our own echoes, and system events do not.
    trackIncoming(fromSnapshot(freshPublic),'public');
    trackIncoming(fromSnapshot(freshWhispers),'private');
    hasBaseline=true;
    listeners.push(onValue(ref(db,base+'/members'),snapshot=>{
      const current=(snapshot.val()||{}) as Record<string,Profile>;
      for(const [id,p] of Object.entries(current)){
        if(!previous?.[id]){
          announce(p.name+'님이 '+(previous?'들어왔습니다.':'함께합니다.'));
          announce(p.name+'님은 '+p.drink+'을(를) 주문했습니다.');
        }else if(previous[id].drink!==p.drink)announce(p.name+'님은 '+p.drink+'을(를) 주문했습니다.');
      }
      for(const [id,p] of Object.entries(previous||{}))if(!current[id])announce(p.name+'님이 나갔습니다.');
      previous=current;
      if(!closed)onPeople(Object.entries(current).map(([id,p])=>({id,name:p.name,drink:p.drink})));
      emit();
    },failed));
    listeners.push(onValue(query(ref(db,base+'/messages'),orderByChild('created'),limitToLast(100)),snapshot=>{publicMessages=fromSnapshot(snapshot);trackIncoming(publicMessages,'public');emit()},failed));
    listeners.push(onValue(query(ref(db,base+'/inboxes/'+uid),orderByChild('created'),limitToLast(100)),snapshot=>{whispers=fromSnapshot(snapshot);trackIncoming(whispers,'private');emit()},failed));
    return true;
  };
  try{
    // Register the server-side cleanup before announcing this visitor as online.
    await disconnect.remove();
    await enter();
    await listen();
    unsubscribers.push(onValue(ref(db,'.info/connected'),snapshot=>{
      if(closed)return;
      if(snapshot.val()!==true){connected=false;firstConnection=false;stopListening();onStatus('연결이 끊겼어요. 다시 연결하는 중…');return}
      if(firstConnection){firstConnection=false;onStatus('');return}
      if(reconnecting)return;
      reconnecting=true;
      void (async()=>{
        try{
          await disconnect.remove();
          if(closed){await disconnect.cancel();return}
          await enter();
          if(closed){await depart();return}
          // Reattach only after membership exists; restored subscriptions may
          // otherwise be rejected before the presence write reaches Firebase.
          connected=true;if(await listen())onStatus('');
        }catch(error){failed(error)}finally{reconnecting=false}
      })();
    }));
  }catch(error){
    closed=true;stopListening();unsubscribers.forEach(unsubscribe=>unsubscribe());
    // Keep onDisconnect registered if removal cannot reach the server.
    await depart().catch(()=>{});
    throw Error(roomError(error));
  }
  return {
    id:uid,
    async send(body:string,recipient:string,messageId:string){
      if(closed)throw Error('방에 다시 입장해주세요.');
      if(!connected)throw Error('다시 연결한 후 메시지를 보내주세요.');
      body=body.trim();
      if(!body||body.length>500)throw Error('메시지는 1~500자로 입력해주세요.');
      if(!/^[\w-]{20,64}$/.test(messageId))throw Error('메시지를 다시 입력해주세요.');
      if(recipient===uid)throw Error('함께 있는 사람을 선택해주세요.');
      const target=recipient?previous?.[recipient]:null;
      if(recipient&&!target)throw Error('상대방이 방을 나갔어요.');
      const ownPath=recipient?base+'/inboxes/'+uid+'/'+messageId:base+'/messages/'+messageId;
      const existing=await get(ref(db,ownPath));
      if(closed)throw Error('방에 다시 입장해주세요.');
      if(existing.exists())return;
      if(Date.now()-lastSent<600)throw Error('잠시 후 메시지를 보내주세요.');
      const message={kind:'chat',sender:uid,senderName:profile.name,recipient,recipientName:target?.name||'',body,created:serverTimestamp()};
      if(recipient)await update(ref(db),{[ownPath]:message,[base+'/inboxes/'+recipient+'/'+messageId]:message});
      else await set(ref(db,ownPath),message);
      lastSent=Date.now();onStatus('');
    },
    async close(){
      if(closed)return;
      closed=true;stopListening();unsubscribers.forEach(unsubscribe=>unsubscribe());
      await depart();
    },
  };
}

export type CafeRoom=Awaited<ReturnType<typeof connectRoom>>;
