// Exercises only disposable comments and anonymous accounts, then removes them.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {firebaseConfig as config} from '../lib/firebase-config.ts';
const accounts=[],written=[];
const stamp={'.sv':'timestamp'};
async function account(){
 const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+config.apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
 const data=await response.json();assert.ok(response.ok,'anonymous sign-in');
 const user={uid:data.localId,token:data.idToken};accounts.push(user);return user;
}
async function request(user,path,method='GET',body,query={}){
 const params=new URLSearchParams(query);if(user)params.set('auth',user.token);
 const response=await fetch(config.databaseURL+'/'+path+'.json?'+params,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result={ok:response.ok,data:await response.json()};
 if(result.ok&&method==='PUT')written.push({user,path});
 if(result.ok&&method==='DELETE')for(let i=written.length-1;i>=0;i--)if(written[i].path===path)written.splice(i,1);
 return result;
}
const bounded={orderBy:JSON.stringify('created'),limitToLast:'100'};
const denied=result=>assert.equal(result.ok,false,'request must be rejected');
const comment=(user,body='Disposable meme comment test')=>({authorId:user.uid,authorName:'댓글 검사',body,created:stamp});
try{
 const [a,b]=await Promise.all([account(),account()]);
 const base='memeComments/study-fire',id=randomUUID(),path=base+'/'+id;
 denied(await request(null,base,'GET',undefined,bounded));
 denied(await request(a,'memeComments'));
 denied(await request(a,base));
 denied(await request(a,base,'GET',undefined,{...bounded,limitToLast:'101'}));
 denied(await request(a,'memeComments/unknown-meme/'+randomUUID(),'PUT',comment(a)));
 denied(await request(null,path,'PUT',comment(a)));
 denied(await request(a,path,'PUT',comment(b)));
 denied(await request(a,path,'PUT',comment(a,'x'.repeat(501))));
 denied(await request(a,path,'PUT',{...comment(a),created:1}));
 denied(await request(a,path,'PUT',{...comment(a),extra:true}));
 denied(await request(a,base+'/bad-id','PUT',comment(a)));
 assert.ok((await request(a,path,'PUT',comment(a))).ok,'comment creation');
 const shared=await request(b,base,'GET',undefined,bounded);
 assert.ok(shared.ok,'other visitor can read');assert.equal(shared.data[id].authorId,a.uid);
 const separate=await request(b,'memeComments/princess','GET',undefined,bounded);
 assert.ok(separate.ok);assert.ok(!separate.data?.[id],'comments stay with their meme');
 denied(await request(b,path,'DELETE'));
 denied(await request(b,path,'PUT',comment(b)));
 denied(await request(a,path,'PUT',comment(a,'cannot overwrite existing comment')));
 const c=await account();
 assert.ok((await request(c,base,'GET',undefined,bounded)).data[id],'comments persist for a new visitor');
 assert.ok((await request(a,path,'DELETE')).ok,'author can delete own comment');
 assert.ok(!(await request(b,base,'GET',undefined,bounded)).data?.[id],'deletion is visible to others');
 console.log('PASS: shared persistent comments, per-meme isolation, bounded reads, authentication, author-only deletion, and spoof/overwrite/invalid-content rejection.');
}finally{
 const cleanupErrors=[];
 for(const {user,path} of [...written])if(!(await request(user,path,'DELETE')).ok)cleanupErrors.push('comment cleanup');
 for(const user of accounts){
  const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key='+config.apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:user.token})});
  if(!response.ok)cleanupErrors.push('anonymous account cleanup');
 }
 assert.equal(cleanupErrors.length,0,'disposable data and account cleanup');
 console.log('Disposable comments and accounts cleaned up.');
}
