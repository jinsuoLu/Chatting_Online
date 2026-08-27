'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, Shell, State } from '../ui';

export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => {
    setLoading(true);
    setError('');
    api('/rooms').then(value => setRooms(Array.isArray(value) ? value : value?.data || [])).catch(reason => setError(reason.message || 'REQUEST_FAILED')).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const filtered = useMemo(() => rooms.filter(room => (status === 'ALL' || room.status === status) && String(room.name || '').toLowerCase().includes(query.toLowerCase())), [rooms, query, status]);
  async function action(id: string, kind: 'pause' | 'resume' | 'delete') {
    if (kind === 'delete' && !window.confirm('确定删除此聊天室？访客将立刻无法访问。')) return;
    setBusy(id);
    try {
      await api(kind === 'delete' ? `/rooms/${id}` : `/rooms/${id}/${kind}`, { method: kind === 'delete' ? 'DELETE' : 'POST' });
      load();
    } catch (reason: any) {
      setError(reason.message || 'REQUEST_FAILED');
    } finally {
      setBusy(null);
    }
  }
  return <Shell title="聊天室管理"><section className="console-intro"><div><b>活跃聊天室</b><p>已删除和已到期的聊天室不会出现在此数据视图中，历史记录仍保留于审计系统。</p></div><strong>{rooms.length}</strong></section><div className="toolbar"><input aria-label="搜索聊天室" placeholder="按名称筛选" value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="状态筛选" value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">全部可见状态</option><option value="ACTIVE">正常运行</option><option value="PAUSED">已暂停</option></select><a className="button" href="/admin/rooms/create">新建聊天室</a><a className="button secondary" href="/admin/rooms/batch">批量创建</a></div><State loading={loading} error={error} empty={!loading && !error && !filtered.length} /><section className="panel table"><div className="table-head"><span>聊天室</span><span>有效期</span><span>状态</span><span>操作</span></div>{filtered.map(room => <div className="row" key={room.id}><div><b>{room.name}</b><small>{room.description || '访客实时沟通空间'}</small></div><span>{room.expiresAt ? new Date(room.expiresAt).toLocaleString('zh-CN') : '长期有效'}</span><span className={`status status-${String(room.status).toLowerCase()}`}>{room.status === 'ACTIVE' ? '运行中' : '已暂停'}</span><div className="actions"><a href={`/admin/rooms/${room.id}`}>链接与详情</a>{room.status === 'ACTIVE' ? <button disabled={busy === room.id} onClick={() => action(room.id, 'pause')}>暂停</button> : <button disabled={busy === room.id} onClick={() => action(room.id, 'resume')}>恢复</button>}<button className="danger" disabled={busy === room.id} onClick={() => action(room.id, 'delete')}>删除</button></div></div>)}</section></Shell>;
}
