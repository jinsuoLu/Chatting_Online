'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, copyText, Shell, State } from '../../ui';

type Link = { id: string; url?: string; expiresAt: string; status: string; usedCount?: number; maxUses?: number | null };
type Draft = { id: number; minutes: number };

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [room, setRoom] = useState<any>();
  const [links, setLinks] = useState<Link[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([{ id: 1, minutes: 10 }]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError('');
    Promise.all([api(`/rooms/${id}`), api(`/rooms/${id}/access-links`)]).then(([nextRoom, nextLinks]) => {
      setRoom(nextRoom);
      setLinks(Array.isArray(nextLinks) ? nextLinks : []);
    }).catch(reason => setError(reason.message));
  };
  useEffect(load, [id]);

  function updateDraft(id: number, minutes: number) {
    setDrafts(current => current.map(draft => draft.id === id ? { ...draft, minutes } : draft));
  }
  function addDraft() { setDrafts(current => [...current, { id: Date.now(), minutes: 10 }]); }
  function removeDraft(id: number) { setDrafts(current => current.length > 1 ? current.filter(draft => draft.id !== id) : current); }

  async function createVisitorLinks() {
    if (drafts.some(draft => !Number.isInteger(draft.minutes) || draft.minutes < 1 || draft.minutes > 43_200)) {
      setError('时长请填写 1 至 43200 分钟之间的整数。');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api(`/rooms/${id}/access-links`, { method: 'POST', body: JSON.stringify({ links: drafts.map(draft => ({ durationMinutes: draft.minutes })) }) });
      const created = Array.isArray(result) ? result : [];
      setLinks(current => [...created, ...current]);
      setNotice(`已生成 ${created.length} 条访客链接。链接仅在本页显示一次，请立即复制。`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '生成访客链接失败');
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string | undefined) {
    if (!url) return;
    setNotice((await copyText(url)) ? '访客链接已复制。' : '复制失败，请手动选择并复制链接。');
  }

  return <Shell title="聊天室与访客链接"><State loading={!room && !error} error={error} />{room && <div className="detail-grid"><section className="panel room-summary"><p className="section-kicker">ROOM / {room.id.slice(0, 8)}</p><h2>{room.name}</h2><div className="summary-row"><span>运行状态</span><b className={`status status-${String(room.status).toLowerCase()}`}>{room.status === 'ACTIVE' ? '运行中' : room.status}</b></div><div className="summary-row"><span>聊天室截止时间</span><b>{room.expiresAt ? new Date(room.expiresAt).toLocaleString('zh-CN') : '未设置'}</b></div><p className="muted">同一聊天室可以生成多条独立访客链接。每条链接的有效期从创建时开始计算。</p></section><section className="panel link-builder"><div className="panel-heading"><div><p className="section-kicker">VISITOR ACCESS</p><h2>生成访客链接</h2></div><button type="button" className="secondary" onClick={addDraft} disabled={busy}>添加一条</button></div><div className="duration-list">{drafts.map((draft, index) => <div className="duration-row" key={draft.id}><label htmlFor={`duration-${draft.id}`}>链接 {index + 1} 有效时长</label><div><input id={`duration-${draft.id}`} type="number" min="1" max="43200" value={draft.minutes} onChange={event => updateDraft(draft.id, Number(event.target.value))} disabled={busy} /><span>分钟</span><button type="button" className="icon-button" aria-label={`移除链接 ${index + 1}`} onClick={() => removeDraft(draft.id)} disabled={busy || drafts.length === 1}>×</button></div></div>)}</div><button onClick={createVisitorLinks} disabled={busy}>{busy ? '正在生成…' : `生成 ${drafts.length} 条链接`}</button>{notice && <p role="status" className="notice-text">{notice}</p>}{error && <p role="alert" className="form-error">{error}</p>}</section></div>}<section className="panel link-list"><div className="panel-heading"><div><p className="section-kicker">ISSUED LINKS</p><h2>已生成链接</h2></div><span>{links.length} 条记录</span></div>{links.length === 0 ? <State empty /> : links.map((link, index) => <div className="issued-link" key={link.id}><div><b>链接 {links.length - index}</b><small>到期：{new Date(link.expiresAt).toLocaleString('zh-CN')} · 已使用 {link.usedCount ?? 0}{link.maxUses ? ` / ${link.maxUses}` : ''}</small>{link.url && <input aria-label={`访客访问链接 ${link.id}`} value={link.url} readOnly onFocus={event => event.currentTarget.select()} />}</div><div className="actions"><span className={`status status-${String(link.status).toLowerCase()}`}>{link.status}</span>{link.url && <button onClick={() => copy(link.url)}>复制链接</button>}</div></div>)}</section></Shell>;
}
