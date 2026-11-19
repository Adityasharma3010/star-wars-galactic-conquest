export function allowedOrigin(origin,configured=[],allowLAN=false){
  if(!origin)return true;
  if(configured.includes(origin))return true;
  if(!allowLAN)return false;
  try{
    const url=new URL(origin);
    if(url.origin!==origin||url.protocol!=='http:'||!['5173','5174'].includes(url.port))return false;
    if(['localhost','127.0.0.1'].includes(url.hostname))return true;
    const parts=url.hostname.split('.').map(Number);
    if(parts.length!==4||parts.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
    return parts[0]===10||(parts[0]===172&&parts[1]>=16&&parts[1]<=31)||(parts[0]===192&&parts[1]===168);
  }catch{return false;}
}
