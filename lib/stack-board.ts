// Keep persisted coordinates compatible with existing boards; present them on a landscape surface.
export const BOARD_WIDTH=1152,BOARD_HEIGHT=1660,VIEW_WIDTH=1920,VIEW_HEIGHT=1080,STARTER_MONTH='2026-11';
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

function boardItemGeometry(item:StackItem){
 const angle=item.rotation*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
 const factor=Math.min(1,(VIEW_WIDTH-64)/(item.w*c+item.h*s),(VIEW_HEIGHT-64)/(item.h*c+item.w*s));
 const w=item.w*factor,h=item.h*factor,insetX=Math.max(24,(w*c+h*s-w)/2+16),insetY=Math.max(24,(h*c+w*s-h)/2+16);
 return {w,h,factor,insetX,insetY,spanX:VIEW_WIDTH-w-2*insetX,spanY:VIEW_HEIGHT-h-2*insetY};
}
export function boardItemLayout(item:StackItem){
 const geometry=boardItemGeometry(item);
 return {...geometry,x:geometry.insetX+item.x/(BOARD_WIDTH-item.w)*geometry.spanX,y:geometry.insetY+item.y/(BOARD_HEIGHT-item.h)*geometry.spanY};
}
export function moveBoardItem(item:StackItem,dx:number,dy:number){
 const geometry=boardItemGeometry(item);
 return fitStackItem({...item,x:item.x+dx*(BOARD_WIDTH-item.w)/geometry.spanX,y:item.y+dy*(BOARD_HEIGHT-item.h)/geometry.spanY});
}
