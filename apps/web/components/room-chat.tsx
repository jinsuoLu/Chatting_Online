'use client';

import React, { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { clearVisitorSession, readVisitorSession } from '../lib/visitor-session';

const MAX = 2000;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function imageSource(imageUrl: string | null | undefined) {
  if (!imageUrl) return '';
  return imageUrl.startsWith('/') ? `${new URL(API_BASE_URL).origin}${imageUrl}` : imageUrl;
}

export function RoomChat({ roomId }: { roomId: string }) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [online, setOnline] = useState(0);
  const [status, setStatus] = useState('connecting');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView(); }, [messages]);

  useEffect(() => {
    const session = readVisitorSession(roomId);
    if (!session) {
      setStatus('disconnected');
      setError('访客会话已失效，请重新打开访问链接。');
      return;
    }

    const socket = io(`${SOCKET_URL}/chat`, { auth: { sessionToken: session.sessionToken }, transports: ['websocket'], reconnection: true });
    socketRef.current = socket;
    const join = () => { setStatus('connected'); socket.emit('room:join', { roomId }); };
    const heartbeat = window.setInterval(() => socket.emit('heartbeat'), 15_000);

    socket.on('connect', join);
    socket.on('disconnect', () => setStatus('reconnecting'));
    socket.on('connect_error', () => { setStatus('disconnected'); setError('连接服务失败，正在尝试重新连接。'); });
    socket.on('room:joined', (event: any) => setOnline(event.onlineCount ?? 0));
    socket.on('message:new', (message: any) => setMessages(existing => existing.some(item => item.id === message.id) ? existing : [...existing, message]));
    socket.on('visitor:count', (event: any) => setOnline(event.count ?? 0));
    socket.on('error', (event: any) => { setSending(false); setUploading(false); setError(event?.message ?? '发送失败'); });
    socket.on('room:closed', () => { clearVisitorSession(); router.replace(`/room/${roomId}/closed`); });

    return () => { window.clearInterval(heartbeat); socket.disconnect(); };
  }, [roomId, router]);

  function send() {
    const value = text.trim();
    if (!value || value.length > MAX || sending || uploading || status !== 'connected' || !socketRef.current) return;
    setError('');
    setSending(true);
    socketRef.current.emit('message:send', { roomId, content: value });
    setText('');
    setSending(false);
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image || uploading || status !== 'connected' || !socketRef.current) return;
    if (image.size > MAX_IMAGE_BYTES) { setError('图片不能超过 5MB。'); return; }

    const session = readVisitorSession(roomId);
    if (!session) { setError('访客会话已失效，请重新打开访问链接。'); return; }
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', image);
      const response = await fetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomId)}/images`, {
        method: 'POST',
        headers: { 'x-visitor-session': session.sessionToken },
        body: form,
      });
      const body = await response.json().catch(() => null) as any;
      if (!response.ok) throw new Error(body?.error?.message ?? body?.message ?? '图片上传失败');
      socketRef.current.emit('image:publish', { roomId, messageId: body.id });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '图片上传失败');
      setUploading(false);
    }
  }

  function key(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
  }

  const unavailable = status !== 'connected' || sending || uploading;
  return <main className="chat-shell"><header className="chat-header"><div><p className="eyebrow">访客聊天室</p><h1>聊天室</h1></div><div className="room-meta"><span>{online} 人在线</span><span role="status">{status === 'connected' ? '已连接' : status === 'reconnecting' ? '正在重连' : status === 'connecting' ? '正在连接' : '连接断开'}</span></div></header><section className="messages">{messages.length === 0 && <p className="empty-state">还没有消息，和大家打个招呼吧。</p>}{messages.map(message => <article className="message" key={message.id}><div className="message-heading"><strong>{message.nickname ?? '系统'}</strong><time>{new Date(message.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></div>{message.type === 'IMAGE' && message.imageUrl ? <img className="message-image" src={imageSource(message.imageUrl)} alt={`${message.nickname ?? '访客'} 上传的图片`} /> : <p>{message.content}</p>}</article>)}<div ref={end} /></section><footer className="composer-wrap">{error && <p role="alert" className="form-error">{error}</p>}<form className="composer" onSubmit={event => { event.preventDefault(); send(); }}><textarea aria-label="消息内容" value={text} onChange={event => setText(event.target.value)} onKeyDown={key} maxLength={MAX + 1} disabled={unavailable} /><div className="composer-actions"><input ref={fileInput} className="image-input" aria-label="上传图片" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={uploadImage} disabled={unavailable} /><span className={text.length > MAX ? 'limit limit-error' : 'limit'}>{uploading ? '图片上传中…' : `${text.length}/${MAX}`}</span><button disabled={!text.trim() || text.length > MAX || unavailable}>{sending ? '发送中…' : '发送'}</button></div></form></footer></main>;
}
