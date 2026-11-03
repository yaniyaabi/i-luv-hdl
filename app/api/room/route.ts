import {env} from 'cloudflare:workers';
const headers={'Cache-Control':'private, no-store'};
export async function POST(req:Request) {
 try{
  const owner=req.headers.get('oai-authenticated-user-id');
  if(!owner)return Response.json({error:'로그인 후 함께 입장할 수 있어요.'},{status:401,headers});
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'잘못된 요청입니다.'},{status:403});
  const b=await req.json() as any;
  if(!/^\d{4,8}$/.test(b.code)||!/^[a-zA-Z0-9-]{20,60}$/.test(b.id))return Response.json({error:'방 번호는 숫자 4~8자리로 입력해주세요.'},{status:400});
  if(!['join','heartbeat','leave','message'].includes(b.action))return Response.json({error:'잘못된 요청입니다.'},{status:400});
  const db=env.DB!,now=Date.now(),name=String(b.name||'guest').trim().slice(0,16)||'guest',drink=String(b.drink||'').slice(0,100);
  const existing=await db.prepare('SELECT id,room,name,drink,seen,owner FROM visitors WHERE id=?').bind(b.id).first() as any;
  if(existing?.owner&&existing.owner!==owner)return Response.json({error:'본인의 입장 정보로 다시 접속해주세요.'},{status:403});
  async function announce(text:string){
   await db.prepare('INSERT INTO room_messages (id,room,kind,sender,sender_name,sender_owner,recipient,recipient_name,recipient_owner,body,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),b.code,'system',b.id,name,'','','','',text,now).run();
  }
  if(b.action==='leave'){
   if(existing?.room===b.code&&existing.owner===owner){await announce(name+'님이 자리를 떠났습니다.');await db.prepare('DELETE FROM visitors WHERE id=? AND owner=?').bind(b.id,owner).run();}
   return Response.json({ok:true},{headers});
  }
  if(b.action==='message'&&(!existing||existing.room!==b.code||existing.owner!==owner||existing.seen<now-30000))return Response.json({error:'방에 다시 입장한 뒤 메시지를 보내주세요.'},{status:403});
  await db.prepare('INSERT OR IGNORE INTO rooms (code,space) VALUES (?,0)').bind(b.code).run();
  const fresh=!existing||existing.room!==b.code||existing.seen<now-20000;
  if(fresh){await announce(name+'님이 들어왔습니다.');if(drink)await announce(name+'님은 '+drink+'를 주문했습니다.');}
  else if(existing.drink!==drink&&drink)await announce(name+'님은 '+drink+'를 주문했습니다.');
  await db.prepare('INSERT INTO visitors (id,room,name,drink,seen,owner) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET room=excluded.room,name=excluded.name,drink=excluded.drink,seen=excluded.seen,owner=excluded.owner WHERE visitors.owner IS NULL OR visitors.owner=excluded.owner').bind(b.id,b.code,name,drink,now,owner).run();
  if(b.action==='message'){
   const body=typeof b.body==='string'?b.body.trim():'';
   if(!body||body.length>500||typeof b.messageId!=='string'||!/^[a-zA-Z0-9-]{20,60}$/.test(b.messageId))return Response.json({error:'메시지는 1~500자로 입력해주세요.'},{status:400});
   const recipient=typeof b.recipient==='string'?b.recipient:'';
   let recipientName='',recipientOwner='';
   if(recipient){
    const target=await db.prepare('SELECT id,name,owner FROM visitors WHERE id=? AND room=? AND seen>?').bind(recipient,b.code,now-20000).first() as any;
    if(!target?.owner||recipient===b.id)return Response.json({error:'상대가 지금 방에 없어요. 다른 사람을 선택해주세요.'},{status:400});
    recipientName=target.name;recipientOwner=target.owner;
   }
   const duplicate=await db.prepare('SELECT id FROM room_messages WHERE id=? AND sender_owner=?').bind(b.messageId,owner).first();
   if(!duplicate){
    const recent=await db.prepare("SELECT created FROM room_messages WHERE sender=? AND kind='chat' ORDER BY created DESC LIMIT 1").bind(b.id).first() as any;
    if(recent&&recent.created>now-600)return Response.json({error:'잠시 후 다시 보내주세요.'},{status:429});
    await db.prepare('INSERT OR IGNORE INTO room_messages (id,room,kind,sender,sender_name,sender_owner,recipient,recipient_name,recipient_owner,body,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(b.messageId,b.code,'chat',b.id,name,owner,recipient,recipientName,recipientOwner,body,now).run();
   }
  }
  const people=await db.prepare('SELECT id,name,drink FROM visitors WHERE room=? AND seen>? ORDER BY seen DESC LIMIT 30').bind(b.code,now-20000).all();
  const messages=await db.prepare("SELECT id,kind,sender,sender_name AS senderName,recipient,recipient_name AS recipientName,body,created FROM (SELECT *,rowid AS messageOrder FROM room_messages WHERE room=? AND (recipient='' OR sender_owner=? OR recipient_owner=?) ORDER BY created DESC, rowid DESC LIMIT 100) ORDER BY created ASC, messageOrder ASC").bind(b.code,owner,owner).all();
  return Response.json({people:people.results,messages:messages.results},{headers});
 }catch{return Response.json({error:'연결이 잠시 끊겼어요. 다시 시도해주세요.'},{status:500,headers});}
}
