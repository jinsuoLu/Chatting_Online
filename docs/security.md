# Security

Keep `.env` outside Git and use long random secrets. PostgreSQL and Redis are internal-only services. Caddy provides HTTPS. Set a specific `WEB_ORIGIN`; cookies must use Secure, HttpOnly and SameSite=Lax/Strict in application auth. Admin endpoints should be protected by authentication, authorization and rate limiting at the edge. Socket.IO is websocket-only, origin-restricted and capped to 1 MB frames.

Audit metadata is sanitized: passwords, tokens, cookies, session values and oversized strings are redacted. Never log message bodies or raw access links.
