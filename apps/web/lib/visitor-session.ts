export interface VisitorSessionState {
  sessionId: string;
  roomId: string;
  displayName: string;
  sessionToken: string;
  expiresAt: string;
}

const KEY = 'chatting.visitor-session';

export function saveVisitorSession(session: { id: string; roomId: string; displayName: string; sessionToken: string; expiresAt: string }) {
  sessionStorage.setItem(KEY, JSON.stringify({ sessionId: session.id, roomId: session.roomId, displayName: session.displayName, sessionToken: session.sessionToken, expiresAt: session.expiresAt }));
}

export function readVisitorSession(roomId: string) {
  try {
    const session = JSON.parse(sessionStorage.getItem(KEY) || 'null') as VisitorSessionState | null;
    return session && session.roomId === roomId && new Date(session.expiresAt) > new Date() ? session : null;
  } catch {
    return null;
  }
}

export function clearVisitorSession() {
  sessionStorage.removeItem(KEY);
}