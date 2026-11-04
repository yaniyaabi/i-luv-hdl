export const BOARD_WIDTH=1152,BOARD_HEIGHT=1660,STARTER_MONTH='2026-11';
export type StackItem={id:string,kind:'image'|'text',ownerId:string,ownerName:string,content:string,x:number,y:number,w:number,h:number,rotation:number,z:number,color:string,fontSize:number,created:number,updated:number,deleted:boolean};
export function currentBoardMonth(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit'}).formatToParts(new Date());
 return parts.find(part=>part.type==='year')!.value+'-'+parts.find(part=>part.type==='month')!.value;
}
export function moveBoardMonth(month:string,offset:number){
 const [year,number]=month.split('-').map(Number),date=new Date(Date.UTC(year,number-1+offset,1));
 return date.getUTCFullYear()+'-'+String(date.getUTCMonth()+1).padStart(2,'0');
}
export function monthLettering(month:string){return ['jan\nuary','feb\nruary','mar\nch','ap\nril','may','ju\nne','ju\nly','au\ngust','sep\ntem\nber','oc\nto\nber','no\nvem\nber','de\ncem\nber'][Number(month.slice(5))-1]}
export function fitStackItem(item:StackItem):StackItem{
 const w=Math.max(80,Math.min(800,item.w)),h=Math.max(40,Math.min(1000,item.h));
 return {...item,w:Math.round(w),h:Math.round(h),x:Math.round(Math.max(0,Math.min(BOARD_WIDTH-w,item.x))),y:Math.round(Math.max(0,Math.min(BOARD_HEIGHT-h,item.y))),rotation:Math.max(-45,Math.min(45,item.rotation)),fontSize:Math.round(Math.max(32,Math.min(180,item.fontSize)))};
}
