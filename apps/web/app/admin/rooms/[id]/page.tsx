'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {api,Shell,State} from '../../ui';
export default function Page(){const {id}=useParams<{id:string}>();const [room,setRoom]=useState<any>(),[error,setError]=useState('');useEffect(()=>{api('/rooms/'+id).then(setRoom).catch(x=>setError(x.message))},[id]);return <Shell title="聊天室详情"><State loading={!room&&!error} error={error}/>{room&&<section className="panel"><h2>{room.name}</h2><p>状态：{room.status}</p><button onClick={()=>{navigator.clipboard.writeText(location.href);alert('链接已复制，请仅分享给授权访客。')}}>复制访问链接</button></section>}</Shell>}
