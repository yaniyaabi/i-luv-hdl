// Runs against the configured Firebase project using disposable anonymous users.
// Only its own randomly chosen room/message/profile records are removed.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {firebaseConfig as config} from '../lib/firebase-config.ts';

const room=String(10000000+Math.floor(Math.random()*80000000));
const otherRoom=String(Number(room)+1),accounts=[],written=[];
const stamp={'.sv':'timestamp'};
async function account(name){
  const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+config.apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
  const result=await response.json();
  assert.equal(response.ok,true,'anonymous sign-in: '+JSON.stringify(result.error));
  const user={uid:result.localId,token:result.idToken,name};accounts.push(user);return user;
}
async function request(user,path,method='GET',body){
  const url=config.databaseURL+'/'+path+'.json'+(user?'?auth='+encodeURIComponent(user.token):'');
  const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {ok:response.ok,status:response.status,body:await response.json()};
}
async function put(user,path,body){
  const result=await request(user,path,'PUT',body);assert.equal(result.ok,true,'write '+path+': '+JSON.stringify(result.body));
  written.push({user,path});return result;
}
const denied=result=>assert.equal(result.ok,false,'access should be denied');
const profile=user=>({name:user.name,drink:'americano · Panama Geisha',joinedAt:stamp});
function message(user,recipient='',recipientName=''){
  return {kind:'chat',sender:user.uid,senderName:user.name,recipient,recipientName,body:'Firebase connection test',created:stamp};
}
try{
  const [a,b,c,d]=await Promise.all(['QA Alice','QA Bob','QA Casey','QA Other'].map(account));
  denied(await request(null,'rooms'));
  denied(await request(a,'rooms'));
  denied(await request(a,'rooms/'+room+'/members'));
  denied(await request(a,'rooms/abc/members/'+a.uid,'PUT',profile(a)));
  for(const user of [a,b,c])await put(user,'rooms/'+room+'/members/'+user.uid,profile(user));
  await put(d,'rooms/'+otherRoom+'/members/'+d.uid,profile(d));
  assert.equal(Object.keys((await request(a,'rooms/'+room+'/members')).body).length,3);
  const publicPath='rooms/'+room+'/messages/'+randomUUID();
  await put(a,publicPath,message(a));
  assert.equal((await request(b,publicPath)).body.sender,a.uid);
  denied(await request(d,publicPath));
  denied(await request(b,publicPath,'PUT',{...message(b),body:'tampered'}));
  denied(await request(a,'rooms/'+room+'/members/'+b.uid,'PUT',profile(a)));
  denied(await request(a,'rooms/'+room+'/messages/'+randomUUID(),'PUT',{...message(a),sender:b.uid,senderName:b.name}));
  denied(await request(a,'rooms/'+room+'/messages/'+randomUUID(),'PUT',{...message(a),kind:'system'}));
  denied(await request(a,'rooms/'+room+'/messages/'+randomUUID(),'PUT',{...message(a),body:'x'.repeat(501)}));
  const dmId=randomUUID(),privateMessage=message(a,b.uid,b.name);
  const mine='rooms/'+room+'/inboxes/'+a.uid+'/'+dmId,theirs='rooms/'+room+'/inboxes/'+b.uid+'/'+dmId;
  const dm=await request(a,'','PATCH',{[mine]:privateMessage,[theirs]:privateMessage});
  assert.equal(dm.ok,true,'atomic whisper: '+JSON.stringify(dm.body));written.push({user:a,path:mine},{user:a,path:theirs});
  assert.equal((await request(a,mine)).body.recipient,b.uid);
  assert.equal((await request(b,theirs)).body.sender,a.uid);
  denied(await request(c,mine));denied(await request(c,theirs));denied(await request(d,theirs));
  denied(await request(c,'rooms/'+room+'/inboxes'));
  denied(await request(c,'rooms/'+room+'/inboxes/'+c.uid+'/'+randomUUID(),'PUT',message(a,b.uid,b.name)));
  denied(await request(a,'rooms/'+room+'/inboxes/'+c.uid+'/'+randomUUID(),'PUT',privateMessage));
  await request(c,'rooms/'+room+'/members/'+c.uid,'DELETE');
  denied(await request(c,publicPath));
  denied(await request(c,'rooms/'+room+'/messages/'+randomUUID(),'PUT',message(c)));
  console.log('PASS: anonymous entry, shared presence, public chat, room isolation, private-message privacy, spoof/tamper/length rejection, membership revocation.');
}finally{
  // Messages must be removed while their sender is still a member.
  for(const {user,path} of written.filter(x=>!x.path.includes('/members/'))){
    const result=await request(user,path,'DELETE');assert.equal(result.ok,true,'message cleanup');
  }
  for(const {user,path} of written.filter(x=>x.path.includes('/members/')))await request(user,path,'DELETE');
  for(const user of accounts){
    const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key='+config.apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:user.token})});
    assert.equal(response.ok,true,'temporary anonymous account cleanup');
  }
  console.log('Temporary Firebase test data and accounts cleaned up.');
}
