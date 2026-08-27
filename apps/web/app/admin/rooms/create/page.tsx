'use client';

import { useState } from 'react';
import { api, Shell } from '../../ui';
import { useRouter } from 'next/navigation';

export default function CreateRoomPage() {
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  return <Shell title="新建聊天室"><form className="panel login" onSubmit={async event => {
    event.preventDefault();
    setError('');
    try {
      await api('/rooms', { method: 'POST', body: JSON.stringify({ name, expiresAt: expiresAt || undefined }) });
      router.push('/admin/rooms');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '创建聊天室失败');
    }
  }}><input placeholder="聊天室名称" value={name} onChange={event => setName(event.target.value)} required /><input type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} />{error && <p role="alert" className="form-error">{error}</p>}<button>创建</button></form></Shell>;
}
