// Disposable rooms and anonymous users; no existing visitors or board data touched.
import {Worker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const code=String(10000000+Math.floor(Math.random()*70000000)),otherCode=String(Number(code)+1),base='rooms/'+code;
function client(){
 const worker=new Worker(new URL('./firebase-test-worker.mjs',import.meta.url));
 let seq=0;const pending=new Map(),state={people:[],messages:[],gifts:[],letters:[],status:''};
 worker.on('message',message=>{
  if(message.seq){const cb=pending.get(message.seq);pending.delete(message.seq);message.error?cb.reject(Error(message.error)):cb.resolve(message.result)}
  else if(message.event in state)state[message.event]=message[message.event];
 });
 return {state,worker,call(action,params={}){return new Promise((resolve,reject)=>{pending.set(++seq,{resolve,reject});worker.postMessage({seq,action,...params})})}};
}
async function until(check,label){const deadline=Date.now()+15000;while(!check()){assert.ok(Date.now()<deadline,label);await new Promise(resolve=>setTimeout(resolve,80))}}
const a=client(),b=client(),c=client(),d=client(),all=[a,b,c,d];
try{
 const alice=await a.call('join',{code,name:'Note Alice',drink:'vienna coffee',task:'기출 풀기'});
 const bob=await b.call('join',{code,name:'Note Bob',drink:'matcha latte'});
 await c.call('join',{code,name:'Note Casey',drink:'pudding'});
 await d.call('join',{code:otherCode,name:'Other room',drink:'americano'});
 await until(()=>a.state.people.length===3&&b.state.people.length===3,'room membership');
 const cookieId=randomUUID(),letterId=randomUUID(),body='끝나면 전화하자. 오늘도 수고했어 ♡';
 await a.call('cookie',{recipient:bob.id,messageId:cookieId});
 await a.call('cookie',{recipient:bob.id,messageId:cookieId});
 await until(()=>b.state.gifts.some(g=>g.id===cookieId),'cookie delivered');
 assert.equal(b.state.gifts.filter(g=>g.id===cookieId).length,1,'cookie retry does not duplicate');
 await assert.rejects(a.call('cookie',{recipient:alice.id,messageId:randomUUID()}));
 await assert.rejects(a.call('cookie',{recipient:'absent',messageId:randomUUID()}));
 assert.equal((await d.call('rest',{path:base+'/gifts'})).ok,false,'other room cannot read gifts');
 await a.call('letter',{recipient:bob.id,body,messageId:letterId});
 await a.call('letter',{recipient:bob.id,body,messageId:letterId});
 await until(()=>b.state.letters.some(n=>n.id===letterId),'sealed note delivered');
 assert.equal(b.state.letters.filter(n=>n.id===letterId).length,1,'note retry does not duplicate');
 assert.equal('body' in b.state.letters[0],false,'locked inbox never downloads message text');
 const bodyPath=base+'/letterBodies/'+bob.id+'/'+letterId,metaPath=base+'/letterBoxes/'+bob.id+'/'+letterId;
 assert.equal((await b.call('rest',{path:bodyPath})).ok,false,'server denies body before timer completion');
 assert.equal((await c.call('rest',{path:bodyPath})).ok,false,'third member cannot read body');
 assert.equal((await c.call('rest',{path:metaPath})).ok,false,'third member cannot read inbox metadata');
 assert.equal((await d.call('rest',{path:bodyPath})).ok,false,'other room cannot read body');
 await assert.rejects(b.call('openLetter',{messageId:letterId}));
 await b.call('restartFocus');
 assert.equal((await b.call('rest',{path:bodyPath})).ok,false,'reset does not unlock a letter');
 assert.equal((await a.call('rest',{path:base+'/members/'+bob.id,method:'PATCH',body:{focusRound:2,finishedRound:1}})).ok,false,'sender cannot finish recipient timer');
 const forged={sender:bob.id,senderName:'Note Bob',recipient:alice.id,recipientName:'Note Alice',kind:'cookie',created:{'.sv':'timestamp'}};
 assert.equal((await a.call('rest',{path:base+'/gifts/'+randomUUID(),method:'PUT',body:forged})).ok,false,'cookie sender cannot be forged');
 const invalidId=randomUUID();
 assert.equal((await a.call('rest',{path:base,method:'PATCH',body:{['letterBoxes/'+bob.id+'/'+invalidId]:{sender:alice.id,senderName:'Note Alice',recipient:bob.id,recipientName:'Note Bob',round:999,created:{'.sv':'timestamp'}},['letterBodies/'+bob.id+'/'+invalidId]:{sender:alice.id,body:'bad round'}}})).ok,false,'letter targets actual recipient round');
 await Promise.all([b.call('finishFocus'),b.call('finishFocus')]);
 await until(()=>b.state.people.find(p=>p.id===bob.id)?.finishedRound===1,'completion synced');
 assert.equal(await b.call('openLetter',{messageId:letterId}),body,'completed recipient opens note');
 assert.equal((await b.call('rest',{path:bodyPath})).body.body,body,'server permits completed recipient');
 await b.call('finishFocus');
 assert.equal((await b.call('rest',{path:base+'/members/'+bob.id})).body.finishedRound,1,'repeated completion is idempotent');
 await b.call('order',{drink:'pudding'});
 const nextId=randomUUID();await a.call('letter',{recipient:bob.id,body:'두 번째 집중도 응원해',messageId:nextId});
 await until(()=>b.state.letters.some(n=>n.id===nextId),'second-round note arrives');
 assert.equal(b.state.letters.find(n=>n.id===nextId).round,2);
 await assert.rejects(b.call('openLetter',{messageId:nextId}));
 assert.equal(await b.call('openLetter',{messageId:letterId}),body,'past note remains readable after ordering');
 await b.call('offline');await until(()=>a.state.people.length===2,'disconnect removes recipient');
 await b.call('online');await until(()=>b.state.people.length===3&&b.state.status==='','reconnected');
 assert.equal(b.state.people.find(p=>p.id===bob.id).finishedRound,1,'completion survives reconnect');
 assert.ok(b.state.gifts.some(g=>g.id===cookieId),'cookie survives occupied-room reconnect');
 await assert.rejects(b.call('openLetter',{messageId:nextId}));
 await b.call('finishFocus');await until(()=>b.state.people.find(p=>p.id===bob.id)?.finishedRound===2,'second completion');
 assert.equal(await b.call('openLetter',{messageId:nextId}),'두 번째 집중도 응원해');
 assert.equal((await c.call('rest',{path:bodyPath})).ok,false,'unlock never exposes a note to third members');
 await a.call('close');await c.call('close');await b.call('close');
 await b.call('join',{code,name:'Fresh Bob',drink:'americano'});
 await until(()=>b.state.people.length===1,'fresh session');
 for(const path of ['gifts','letterBoxes/'+bob.id])assert.equal((await b.call('rest',{path:base+'/'+path})).body,null,'last departure clears '+path);
 const oldBody=await b.call('rest',{path:bodyPath});assert.ok(!oldBody.ok||oldBody.body===null,'no previous-session body is readable');
 console.log('PASS: cookie delivery/idempotence; sealed note server privacy; correct timer rounds/reset/order/reconnect; no forged identities; last-exit cleanup.');
}finally{
 const results=await Promise.allSettled(all.map(async client=>{await client.call('cleanup');await client.worker.terminate()}));
 for(const client of all)await client.worker.terminate();
 assert.equal(results.filter(result=>result.status==='rejected').length,0,'disposable user cleanup');
}
