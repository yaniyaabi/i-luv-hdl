import {Worker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const code=String(10000000+Math.floor(Math.random()*80000000));
function client(){
 const worker=new Worker(new URL('./firebase-test-worker.mjs',import.meta.url));
 let seq=0;const pending=new Map();const state={people:[],messages:[],status:''};
 worker.on('message',message=>{
  if(message.seq){const cb=pending.get(message.seq);pending.delete(message.seq);message.error?cb.reject(Error(message.error)):cb.resolve(message.result)}
  else if(message.event==='people')state.people=message.people;
  else if(message.event==='messages')state.messages=message.messages;
  else if(message.event==='status')state.status=message.status;
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
 await a.call('send',{code,messageId:id,body:'public SDK test',recipient:''});
 assert.equal(b.state.messages.filter(m=>m.id===id).length,1,'retry idempotence');
 await new Promise(resolve=>setTimeout(resolve,650));
 const dm=randomUUID();
 await a.call('send',{code,messageId:dm,body:'private SDK test',recipient:bob.id});
 await until(()=>b.state.messages.some(m=>m.id===dm&&m.recipient===bob.id),'whisper delivered');
 await b.call('offline');
 await until(()=>a.state.people.length===1,'onDisconnect removes absent member');
 await b.call('online');
 await until(()=>a.state.people.length===2&&b.state.people.length===2&&b.state.status==='','reconnect restores presence and listeners');
 const reply=randomUUID();
 await b.call('send',{code,messageId:reply,body:'back online',recipient:''});
 await until(()=>a.state.messages.some(m=>m.id===reply),'chat works after reconnect');
 console.log('PASS: actual room client entry/order events, real-time public chat, private chat, retry idempotence, disconnect cleanup, reconnection and subsequent delivery.');
}finally{
 const cleanup=[];
 await a.call('cleanup').catch(error=>cleanup.push(error));
 await b.call('cleanup').catch(error=>cleanup.push(error));
 await a.worker.terminate();await b.worker.terminate();
 assert.equal(cleanup.length,0,'temporary account and message cleanup');
}
