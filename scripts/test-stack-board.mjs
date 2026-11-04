import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {firebaseConfig as config} from '../lib/firebase-config.ts';
import {moveBoardMonth,fitStackItem} from '../lib/stack-board.ts';
const accounts=[],written=[],stamp={'.sv':'timestamp'},month='2097-01';
const bounded={orderBy:JSON.stringify('created'),limitToLast:'100'};
async function account(){
 const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+config.apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
 const value=await response.json();assert.ok(response.ok,'anonymous sign-in');const user={uid:value.localId,token:value.idToken};accounts.push(user);return user;
}
async function request(user,path,method='GET',body,query={}){
 const params=new URLSearchParams(query);if(user)params.set('auth',user.token);
 const response=await fetch(config.databaseURL+'/'+path+'.json?'+params,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result={ok:response.ok,data:await response.json()};
 if(result.ok&&method==='PUT')written.push({user,path});
 if(result.ok&&method==='DELETE')for(let i=written.length-1;i>=0;i--)if(written[i].path===path)written.splice(i,1);
 return result;
}
const denied=result=>assert.equal(result.ok,false,'request must be rejected');
const record=(user,id)=>({kind:'image',ownerId:user.uid,ownerName:'보드 검사',content:id,x:100,y:200,w:240,h:200,rotation:-5,z:100,color:'#fffaf0',fontSize:32,created:stamp,updated:stamp,deleted:false});
try{
 assert.equal(moveBoardMonth('2026-12',1),'2027-01');assert.equal(moveBoardMonth('2027-01',-1),'2026-12');
 const [a,b]=await Promise.all([account(),account()]),id=randomUUID(),base='stackBoards/'+month+'/items',path=base+'/'+id,asset='stackImages/'+month+'/'+id,comments='stackComments/'+month+'/'+id;
 denied(await request(null,base,'GET',undefined,bounded));denied(await request(a,'stackBoards'));denied(await request(a,base));
 denied(await request(a,base,'GET',undefined,{...bounded,limitToLast:'101'}));
 denied(await request(a,'stackBoards/invalid/items/'+id,'PUT',record(a,id)));
 denied(await request(a,path,'PUT',record(b,id)));
 denied(await request(a,path,'PUT',{...record(a,id),x:1200}));
 denied(await request(a,path,'PUT',{...record(a,id),fontSize:200}));
 denied(await request(a,path,'PUT',{...record(a,id),extra:true}));
 denied(await request(a,path,'PUT',{...record(a,id),created:1}));
 denied(await request(a,asset,'PUT',{ownerId:a.uid,image:'data:image/svg+xml;base64,AAAA',created:stamp}));
 denied(await request(a,asset,'PUT',{ownerId:a.uid,image:'data:image/png;base64,'+'A'.repeat(180000),created:stamp}));
 const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
 assert.ok((await request(a,asset,'PUT',{ownerId:a.uid,image:pixel,created:stamp})).ok,'photo storage');
 assert.ok((await request(a,path,'PUT',record(a,id))).ok,'board item creation');
 assert.equal((await request(b,base,'GET',undefined,bounded)).data[id].ownerId,a.uid,'all visitors share the month');
 assert.equal((await request(b,asset)).data.image,pixel,'other visitor sees the photo');
 assert.ok(!(await request(b,'stackBoards/2097-02/items','GET',undefined,bounded)).data?.[id],'months stay separate');
 denied(await request(b,path,'PATCH',{x:110,updated:stamp}));denied(await request(b,path,'DELETE'));denied(await request(b,asset,'DELETE'));
 assert.ok((await request(a,path,'PATCH',{x:110,rotation:10,updated:stamp})).ok,'owner moves and rotates');
 assert.equal((await request(b,base,'GET',undefined,bounded)).data[id].x,110,'position persists for other visitors');
 const commentId=randomUUID(),commentPath=comments+'/'+commentId;
 denied(await request(b,commentPath,'PUT',{authorId:a.uid,authorName:'보드 검사',body:'spoof',created:stamp}));
 assert.ok((await request(b,commentPath,'PUT',{authorId:b.uid,authorName:'보드 검사',body:'공유 보드 댓글 검사',created:stamp})).ok,'shared comments');
 assert.equal((await request(a,comments,'GET',undefined,bounded)).data[commentId].authorId,b.uid);
 denied(await request(a,commentPath,'DELETE'));
 assert.ok((await request(a,path,'PATCH',{deleted:true,updated:stamp})).ok,'recoverable removal');
 denied(await request(b,comments,'GET',undefined,bounded));
 assert.ok((await request(a,path,'PATCH',{deleted:false,updated:stamp})).ok,'restore from trash');
 assert.ok((await request(b,comments,'GET',undefined,bounded)).data[commentId],'restored item keeps comments');
 const fitted=fitStackItem({...record(a,id),x:9999,y:-50,w:240,h:200,rotation:90,fontSize:32});assert.equal(fitted.x,912);assert.equal(fitted.y,0);assert.equal(fitted.rotation,45);
 console.log('PASS: month/year navigation, shared photos and positioning, isolated monthly boards, author-only editing, size/type/ownership validation, recoverable removal, and item comments.');
}finally{
 const errors=[];
 for(const {user,path} of [...written].reverse())if(!(await request(user,path,'DELETE')).ok)errors.push('test data cleanup');
 for(const user of accounts){const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key='+config.apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:user.token})});if(!response.ok)errors.push('test account cleanup')}
 assert.equal(errors.length,0,'disposable records and accounts cleaned up');console.log('Disposable board photos, comments, records, and accounts cleaned up.');
}
