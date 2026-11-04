import {Worker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const code=String(10000000+Math.floor(Math.random()*80000000));
function client(){
 const worker=new Worker(new URL('./firebase-test-worker.mjs',import.meta.url));
 let seq=0;const pending=new Map();const state={people:[],messages:[],status:'',received:0};
 worker.on('message',message=>{
  if(message.seq){const cb=pending.get(message.seq);pending.delete(message.seq);message.error?cb.reject(Error(message.error)):cb.resolve(message.result)}
  else if(message.event==='people')state.people=message.people;
  else if(message.event==='messages')state.messages=message.messages;
  else if(message.event==='status')state.status=message.status;
  else if(message.event==='incoming')state.received+=message.count;
  else if(message.event==='notification-reset')state.received=0;
 });
 return {state,worker,call(action,params={}){return new Promise((resolve,reject)=>{pending.set(++seq,{resolve,reject});worker.postMessage({seq,action,...params})})}};
}
async function until(check,label){
 const deadline=Date.now()+20000;
 while(!check()){assert.ok(Date.now()<deadline,label);await new Promise(resolve=>setTimeout(resolve,100))}
}
const a=client(),b=client();
try{
 const alice=await a.call('join',{code,name:'SDK Alice',drink:'americano'});
 const bob=await b.call('join',{code,name:'SDK Bob',drink:'matcha latte'});
 await until(()=>a.state.people.length===2&&b.state.people.length===2,'both members visible');
 assert.ok(a.state.messages.some(m=>m.body==='SDK Bob님이 들어왔습니다.'));
 const id=randomUUID();
 await a.call('send',{code,messageId:id,body:'public SDK test',recipient:''});
 await until(()=>b.state.messages.some(m=>m.id===id),'public message delivered');
 assert.equal(b.state.received,1,'incoming public message notifies once');
 assert.equal(a.state.received,0,'own message never notifies');
 await a.call('send',{code,messageId:id,body:'public SDK test',recipient:''});
 assert.equal(b.state.messages.filter(m=>m.id===id).length,1,'retry idempotence');
 assert.equal(b.state.received,1,'repeated snapshots do not notify twice');
 await new Promise(resolve=>setTimeout(resolve,650));
 const dm=randomUUID();
 await a.call('send',{code,messageId:dm,body:'private SDK test',recipient:bob.id});
 await until(()=>b.state.messages.some(m=>m.id===dm&&m.recipient===bob.id),'whisper delivered');
 assert.equal(b.state.received,2,'incoming whisper notifies');
 assert.equal(a.state.received,0,'own whisper echo never notifies');
 await a.call('order',{drink:'pudding'});
 await until(()=>a.state.people.find(p=>p.id===alice.id)?.drink==='pudding'&&b.state.people.find(p=>p.id===alice.id)?.drink==='pudding','new order updates the same membership for everyone');
 assert.equal(a.state.people.length,2,'ordering does not leave the room');
 assert.ok(b.state.messages.some(m=>m.id===id)&&b.state.messages.some(m=>m.id===dm),'ordering preserves public and private chat');
 assert.equal(b.state.received,2,'order announcements do not count as incoming chat');
 await b.call('offline');
 await until(()=>a.state.people.length===1,'onDisconnect removes absent member');
 await b.call('online');
 await until(()=>a.state.people.length===2&&b.state.people.length===2&&b.state.status==='','reconnect restores presence and listeners');
 const reply=randomUUID();
 await b.call('send',{code,messageId:reply,body:'back online',recipient:''});
 await until(()=>a.state.messages.some(m=>m.id===reply),'chat works after reconnect');

 // Leaving one visitor behind must preserve both public and private history.
 const cancelledId=randomUUID();
 const cancelled=await a.call('sendAndClose',{messageId:cancelledId,body:'must not arrive after leaving'});
 assert.ok(cancelled.error,'in-flight send stops on exit');
 await until(()=>b.state.people.length===1,'remaining member stays connected');
 assert.equal(b.state.messages.some(m=>m.id===cancelledId),false,'departed client cannot post into a later session');
 assert.ok(b.state.messages.some(m=>m.id===id),'public history stays while occupied');
 assert.ok(b.state.messages.some(m=>m.id===dm),'whispers stay while occupied');
 await a.call('join',{code,name:'SDK Alice',drink:'americano'});
 await until(()=>a.state.people.length===2&&a.state.messages.some(m=>m.id===id),'rejoin occupied room preserves messages');
 assert.equal(a.state.received,0,'loading existing public and private history does not notify');

 // Both concurrent departures must clear every inbox, not only the last user's.
 await Promise.all([a.call('close'),b.call('close')]);
 const empty=await b.call('probeEmpty',{code});
 assert.equal(empty.messages,null,'last exit physically clears both histories');
 await a.call('join',{code,name:'SDK Alice',drink:'americano'});
 await b.call('join',{code,name:'SDK Bob',drink:'matcha latte'});
 await until(()=>a.state.people.length===2&&b.state.people.length===2,'fresh room has both members');
 assert.equal(a.state.messages.some(m=>m.kind==='chat'),false,'fresh session has no old public chat or whispers');
 assert.equal(b.state.messages.some(m=>m.kind==='chat'),false,'both visitors start clean');

 // Closing every connection may leave history on the server. The first restored
 // presence resets it before subscribing, so previous-session text never returns.
 const disconnectedId=randomUUID();
 await a.call('send',{code,messageId:disconnectedId,body:'before all connections close',recipient:''});
 await until(()=>b.state.messages.some(m=>m.id===disconnectedId),'message before disconnect');
 await Promise.all([a.call('offline'),b.call('offline')]);
 await Promise.all([a.call('waitAbsent',{code}),b.call('waitAbsent',{code})]);
 await a.call('online');
 await until(()=>a.state.status===''&&a.state.people.length===1,'first reconnection restores an empty room');
 assert.equal(a.state.messages.some(m=>m.kind==='chat'),false,'empty-room reconnect clears local cached history');
 await b.call('online');
 await until(()=>b.state.status===''&&b.state.people.length===2,'second reconnect joins fresh session');
 assert.equal(b.state.messages.some(m=>m.kind==='chat'),false,'no stale whispers or public messages after reconnect');
 console.log('PASS: chat lifecycle and privacy; incoming public/whisper notifications; no self, duplicate, or history notifications.');
}finally{
 const cleanup=[];
 await a.call('cleanup').catch(error=>cleanup.push(error));
 await b.call('cleanup').catch(error=>cleanup.push(error));
 await a.worker.terminate();await b.worker.terminate();
 assert.equal(cleanup.length,0,'temporary account and message cleanup');
}
