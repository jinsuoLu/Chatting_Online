'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, copyText, Shell, State } from '../../ui';

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [room, setRoom] = useState<any>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [visitorLink, setVisitorLink] = useState('');

  useEffect(() => { api(`/rooms/${id}`).then(setRoom).catch(reason => setError(reason.message)); }, [id]);

  async function createVisitorLink() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const result = await api(`/rooms/${id}/access-links`, { method: 'POST', body: JSON.stringify({ expiresAt }) });
      const url = Array.isArray(result) ? result[0]?.url : result?.url;
      if (!url) throw new Error('访问链接生成失败');
      setVisitorLink(url);
      const copied = await copyText(url);
      setNotice(copied ? '10 分钟访客链接已生成并复制。' : '访客链接已生成，请手动复制下方地址。');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '生成访客链接失败');
    } finally {
      setBusy(false);
    }
  }

  return <Shell title="聊天室详情"><State loading={!room && !error} error={error} />{room && <section className="panel"><h2>{room.name}</h2><p>状态：{room.status}</p><button onClick={createVisitorLink} disabled={busy}>{busy ? '生成中…' : '生成并复制 10 分钟访客链接'}</button>{visitorLink && <input aria-label="访客访问链接" value={visitorLink} readOnly onFocus={event => event.currentTarget.select()} />}{notice && <p role="status">{notice}</p>}{error && <p role="alert" className="form-error">{error}</p>}</section>}</Shell>;
}
