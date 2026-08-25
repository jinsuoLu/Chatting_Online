import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisitorJoin } from './visitor-join';
import { RoomChat } from './room-chat';

const replace = vi.fn();
const socket: any = { connected: true, on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('socket.io-client', () => ({ io: vi.fn(() => socket) }));
const response = (body: any, ok = true) => ({ ok, status: ok ? 200 : 400, json: vi.fn().mockResolvedValue(body) }) as any;

beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); global.fetch = vi.fn() as any; });
afterEach(cleanup);

describe('visitor links', () => {
  it('exchanges an access link for a session without storing the access token', async () => {
    (fetch as any).mockResolvedValueOnce(response({ room: { id: 'r1', name: '设计讨论' }, expiresAt: '2026-08-26T12:00:00Z' })).mockResolvedValueOnce(response({ id: 's1', roomId: 'r1', displayName: '小林', sessionToken: 'session-secret', expiresAt: '2026-08-26T12:00:00Z' }));
    render(<VisitorJoin token="private-token" />);
    await screen.findByText('设计讨论');
    fireEvent.change(screen.getByLabelText('你的昵称'), { target: { value: '小林' } });
    fireEvent.click(screen.getByText('进入聊天室'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/room/r1'));
    const stored = sessionStorage.getItem('chatting.visitor-session') ?? '';
    expect(stored).not.toContain('private-token');
    expect(stored).toContain('session-secret');
  });
  it('rejects invalid links', async () => { (fetch as any).mockResolvedValue(response({ error: { code: 'ACCESS_LINK_NOT_FOUND', message: 'missing' } }, false)); render(<VisitorJoin token="bad" />); expect(await screen.findByRole('alert')).toHaveTextContent('该访问链接不存在'); });
});

describe('chat', () => {
  function view() {
    sessionStorage.setItem('chatting.visitor-session', JSON.stringify({ sessionId: 's1', roomId: 'r1', displayName: '小林', sessionToken: 'session-secret', expiresAt: '2026-08-26T12:00:00Z' }));
    render(<RoomChat roomId="r1" />);
    act(() => socket.on.mock.calls.find((call: any) => call[0] === 'connect')[1]());
  }
  it('uses the session token and sends messages with the server event name', () => {
    view();
    expect((socket as any).emit).toHaveBeenCalledWith('room:join', { roomId: 'r1' });
    const box = screen.getByLabelText('消息内容');
    fireEvent.change(box, { target: { value: '你好' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect((socket as any).emit).toHaveBeenCalledWith('message:send', { roomId: 'r1', content: '你好' });
  });
  it('renders message:new as text and handles closed rooms', () => {
    view();
    act(() => socket.on.mock.calls.find((call: any) => call[0] === 'message:new')[1]({ id: 'm1', content: '<img src=x>', nickname: '访客', createdAt: '2026-08-25T08:00:00Z' }));
    expect(screen.getByText('<img src=x>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    act(() => socket.on.mock.calls.find((call: any) => call[0] === 'room:closed')[1]());
    expect(replace).toHaveBeenCalledWith('/room/r1/closed');
  });
});