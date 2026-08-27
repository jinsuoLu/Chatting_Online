'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, copyText, Shell, State } from '../../ui';

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [room, setRoom] = useState<any>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { api(`/rooms/${id}`).then(setRoom).catch(reason => setError(reason.message)); }, [id]);

  async function copyManagementLink() {
    const copied = await copyText(location.href);
    setNotice(copied ? '管理页面链接已复制。' : '浏览器不允许自动复制，请手动复制地址栏链接。');
  }

  return <Shell title="聊天室详情"><State loading={!room && !error} error={error} />{room && <section className="panel"><h2>{room.name}</h2><p>状态：{room.status}</p><button onClick={copyManagementLink}>复制管理链接</button>{notice && <p role="status">{notice}</p>}</section>}</Shell>;
}
