'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, Shell, State, Stat } from '../ui';

export default function Dashboard() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/rooms').then(value => setRooms(Array.isArray(value) ? value : value.data || [])).catch(reason => setError(reason.message)).finally(() => setLoading(false)); }, []);
  const expiring = useMemo(() => rooms.filter(room => room.expiresAt).sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()).slice(0, 5), [rooms]);
  const paused = rooms.filter(room => room.status === 'PAUSED').length;
  return <Shell title="运行概览"><div className="stats"><Stat label="可见聊天室" value={loading ? '—' : rooms.length} /><Stat label="运行中" value={loading ? '—' : rooms.length - paused} /><Stat label="已暂停" value={loading ? '—' : paused} /><Stat label="近期到期" value={loading ? '—' : expiring.length} /></div><section className="panel"><div className="panel-heading"><div><p className="section-kicker">LIFECYCLE WATCH</p><h2>即将到期聊天室</h2></div><a className="button secondary" href="/admin/rooms">查看聊天室</a></div><State loading={loading} error={error} empty={!loading && !error && !expiring.length} />{expiring.map(room => <div className="issued-link" key={room.id}><div><b>{room.name}</b><small>到期：{new Date(room.expiresAt).toLocaleString('zh-CN')}</small></div><a className="button secondary" href={`/admin/rooms/${room.id}`}>管理链接</a></div>)}</section></Shell>;
}
