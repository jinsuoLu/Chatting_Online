'use client';

import React from 'react';

export async function api(path: string, init: RequestInit = {}) {
  const response = await fetch('/api/v1' + path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (response.status === 401) {
    window.location.assign('/login');
    throw new Error('AUTH_REQUIRED');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || body?.message || `HTTP_${response.status}`);
  return body;
}

export async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // HTTP/IP deployments do not expose the Clipboard API.
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
}

const navigation = [
  { href: '/admin/dashboard', label: '运行概览' },
  { href: '/admin/rooms', label: '聊天室' },
  { href: '/admin/access-links', label: '访问链接' },
  { href: '/admin/audit-logs', label: '审计日志' },
  { href: '/super-admin/admins', label: '管理员' },
];

export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="shell"><aside className="side-nav"><a className="brand" href="/admin/dashboard"><span className="brand-mark">CO</span><span>Chatting<span>Online</span></span></a><p className="nav-caption">CONTROL SURFACE</p><nav>{navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav><div className="side-status"><i />系统在线<br /><small>SECURE CHANNEL</small></div></aside><main className="content"><header className="content-header"><div><p className="section-kicker">OPERATIONS / 2026</p><h1>{title}</h1></div><span className="header-status">控制台已连接</span></header>{children}</main></div>;
}

export function State({ loading, error, empty }: { loading?: boolean; error?: string; empty?: boolean }) {
  if (loading) return <div className="state">正在同步数据…</div>;
  if (error) return <div role="alert" className="state error">{error === 'FORBIDDEN' ? '无权限访问此资源' : error}</div>;
  if (empty) return <div className="state">暂无数据</div>;
  return null;
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <section className="stat"><span>{label}</span><strong>{value}</strong></section>;
}

