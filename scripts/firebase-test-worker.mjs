import {parentPort} from 'node:worker_threads';
import {getAuth,deleteUser} from 'firebase/auth';
import {getDatabase,goOffline,goOnline,ref,remove} from 'firebase/database';
import {connectRoom} from '../lib/firebase-room.ts';
let room;
const ownMessages=[];
parentPort.on('message',async ({seq,action,...params})=>{
 try{
  let result;
  if(action==='join'){
    room=await connectRoom({...params,onPeople:people=>parentPort.postMessage({event:'people',people}),onMessages:messages=>parentPort.postMessage({event:'messages',messages}),onStatus:status=>parentPort.postMessage({event:'status',status})});
    result={id:room.id};
  }else if(action==='send'){
    await room.send(params.body,params.recipient,params.messageId);
    if(!ownMessages.some(message=>message.id===params.messageId))ownMessages.push({code:params.code,recipient:params.recipient,id:params.messageId});
  }else if(action==='offline')goOffline(getDatabase());
  else if(action==='online')goOnline(getDatabase());
  else if(action==='cleanup'){
    for(const message of ownMessages){
      const base='rooms/'+message.code;
      if(message.recipient){
        await remove(ref(getDatabase(),base+'/inboxes/'+room.id+'/'+message.id));
        await remove(ref(getDatabase(),base+'/inboxes/'+message.recipient+'/'+message.id));
      }else await remove(ref(getDatabase(),base+'/messages/'+message.id));
    }
    await room.close();
    await deleteUser(getAuth().currentUser);
  }
  parentPort.postMessage({seq,result});
 }catch(error){parentPort.postMessage({seq,error:error.message})}
});
