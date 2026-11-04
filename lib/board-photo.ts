export async function prepareBoardPhoto(file:File){
 if(!/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type))throw Error('PNG, JPG, WebP, GIF 사진을 넣어주세요.');
 if(file.size>20*1024*1024)throw Error('20MB 이하의 사진을 넣어주세요.');
 const bitmap=await createImageBitmap(file);
 try{
  const canvas=document.createElement('canvas'),ratio=Math.min(1,1100/Math.max(bitmap.width,bitmap.height));
  canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
  const context=canvas.getContext('2d');if(!context)throw Error('이 브라우저에서 사진을 넣을 수 없어요.');
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  for(const quality of [.86,.72,.58,.42]){
   const image=canvas.toDataURL('image/webp',quality);
   if(image.length<=180000)return {image,width:bitmap.width,height:bitmap.height};
  }
  const smaller=document.createElement('canvas');smaller.width=Math.max(1,Math.round(canvas.width*.6));smaller.height=Math.max(1,Math.round(canvas.height*.6));smaller.getContext('2d')!.drawImage(canvas,0,0,smaller.width,smaller.height);
  const image=smaller.toDataURL('image/webp',.65);if(image.length>180000)throw Error('사진 크기를 줄여 다시 넣어주세요.');
  return {image,width:bitmap.width,height:bitmap.height};
 }finally{bitmap.close()}
}
