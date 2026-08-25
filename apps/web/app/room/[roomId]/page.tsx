import { RoomChat } from '../../../components/room-chat'; export default async function Page({params}:{params:Promise<{roomId:string}>}){return <RoomChat roomId={(await params).roomId}/>}
