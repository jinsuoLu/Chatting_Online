'use client';
import React from 'react';
import {useEffect,useMemo,useState} from 'react';
import {api,Shell,State} from '../ui';
export default function Rooms(){
 const [rooms,setRooms]=useState<any[]>([]),[query,setQuery]=useState(''),[status,setStatus]=useState('ALL'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null);
 const load=()=>{setLoading(true);setError('');api('/rooms').then(x=>setRooms(Array.isArray(x)?x:x?.data||[])).catch(x=>setError(x.message||'REQUEST_FAILED')).finally(()=>setLoading(false))};
 useEffect(load,[]);
 const filtered=useMemo(()=>rooms.filter(r=>(status==='ALL'||r.status===status)&&String(r.name||'').toLowerCase().includes(query.toLowerCase())),[rooms,query,status]);
 async function action(id:string,kind:'pause'|'resume'|'delete'){if(kind==='delete'&&!window.confirm('确定删除此聊天室？删除后不可恢复。'))return;setBusy(id);try{await api(kind==='delete'?`/rooms/${id}`:`/rooms/${id}/${kind}`,{method:kind==='delete'?'DELETE':'POST'});load()}catch(e:any){setError(e.message||'REQUEST_FAILED')}finally{setBusy(null)}}
 return <Shell title="聊天室管理"><div className="toolbar"><input aria-label="搜索聊天室" placeholder="搜索聊天室" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="状态筛选" value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">全部状态</option><option value="ACTIVE">正常</option><option value="PAUSED">已暂停</option><option value="EXPIRED">已过期</option></select><a className="button" href="/admin/rooms/create">新建聊天室</a><a className="button" href="/admin/rooms/batch">批量创建</a></div><State loading={loading} error={error} empty={!loading&&!error&&!filtered.length}/><section className="panel table">{filtered.map(room=><div className="row" key={room.id}><div><b>{room.name}</b><small>{room.status} · {room.expiresAt?new Date(room.expiresAt).toLocaleString():'长期有效'}</small></div><div className="actions"><a href={`/admin/rooms/${room.id}`}>详情</a>{room.status==='ACTIVE'?<button disabled={busy===room.id} onClick={()=>action(room.id,'pause')}>暂停</button>:<button disabled={busy===room.id} onClick={()=>action(room.id,'resume')}>恢复</button>}<button className="danger" disabled={busy===room.id} onClick={()=>action(room.id,'delete')}>删除</button></div></div>)}</section></Shell>
}

