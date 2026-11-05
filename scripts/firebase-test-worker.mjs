import {parentPort} from 'node:worker_threads';
import {getAuth,deleteUser} from 'firebase/auth';
import {getDatabase,goOffline,goOnline,ref,remove,set,get,serverTimestamp} from 'firebase/database';
import {firebaseConfig} from '../lib/firebase-config.ts';
import {connectRoom} from '../lib/firebase-room.ts';
let room;

parentPort.on('message',async ({seq,action,...params})=>{
 try{
  let result;
  if(action==='join'){
    parentPort.postMessage({event:'notification-reset'});
    room=await connectRoom({...params,onPeople:people=>parentPort.postMessage({event:'people',people}),onMessages:messages=>parentPort.postMessage({event:'messages',messages}),onGifts:gifts=>parentPort.postMessage({event:'gifts',gifts}),onLetters:letters=>parentPort.postMessage({event:'letters',letters}),onStatus:status=>parentPort.postMessage({event:'status',status}),onIncoming:count=>parentPort.postMessage({event:'incoming',count}),onReset:()=>parentPort.postMessage({event:'notification-reset'})});
    result={id:room.id};
  }else if(action==='order'){
    await room.order(params.drink);
  }else if(action==='send'){
    await room.send(params.body,params.recipient,params.messageId);
  }else if(action==='cookie')await room.cookie(params.recipient,params.messageId);
  else if(action==='letter')await room.letter(params.recipient,params.body,params.messageId);
  else if(action==='openLetter')result=await room.openLetter(params.messageId);
  else if(action==='finishFocus')await room.finishFocus();
  else if(action==='restartFocus')await room.restartFocus();
  else if(action==='rest'){
    const token=await getAuth().currentUser.getIdToken();
    const response=await fetch(firebaseConfig.databaseURL+'/'+params.path+'.json?auth='+encodeURIComponent(token),{method:params.method||'GET',headers:{'Content-Type':'application/json'},...(params.body===undefined?{}:{body:JSON.stringify(params.body)})});
    result={ok:response.ok,status:response.status,body:await response.json()};
  }else if(action==='offline')goOffline(getDatabase());
  else if(action==='online')goOnline(getDatabase());
  else if(action==='close')await room.close();
  else if(action==='sendAndClose'){
    const sending=room.send(params.body,'',params.messageId).then(()=>({sent:true}),error=>({error:error.message}));
    await room.close();result=await sending;
  }
  else if(action==='probeEmpty'){
    // Creating presence without a reset is rejected by Rules if either history
    // collection still exists in an empty room, including other users' inboxes.
    const member=ref(getDatabase(),'rooms/'+params.code+'/members/'+getAuth().currentUser.uid);
    try{
      await set(member,{name:'empty probe',drink:'americano',joinedAt:serverTimestamp()});
      result={messages:(await get(ref(getDatabase(),'rooms/'+params.code+'/messages'))).val()};
    }finally{await remove(member)}
  }else if(action==='waitAbsent'){
    const user=getAuth().currentUser,token=await user.getIdToken(),deadline=Date.now()+10000;
    for(;;){
      const response=await fetch(firebaseConfig.databaseURL+'/rooms/'+params.code+'/members.json?auth='+encodeURIComponent(token));
      if(response.status===401||response.status===403)break;
      if(!response.ok)throw Error('Unexpected presence response '+response.status);
      if(Date.now()>deadline)throw Error('Presence did not disconnect');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
  }else if(action==='cleanup'){
    if(room)await room.close();
    if(getAuth().currentUser)await deleteUser(getAuth().currentUser);
  }
  parentPort.postMessage({seq,result});
 }catch(error){parentPort.postMessage({seq,error:error.message})}
});
