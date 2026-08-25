export interface VisitorSessionState { sessionId:string; roomId:string; displayName:string; expiresAt:string }
const KEY='chatting.visitor-session';
export function saveVisitorSession(s:VisitorSessionState){sessionStorage.setItem(KEY,JSON.stringify(s))}
export function readVisitorSession(roomId:string){try{const s=JSON.parse(sessionStorage.getItem(KEY)||'null') as VisitorSessionState|null;return s&&s.roomId===roomId?s:null}catch{return null}}
export function clearVisitorSession(){sessionStorage.removeItem(KEY)}
