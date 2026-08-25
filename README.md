# Chatting Online

聊天室 monorepo，包含 Next.js Web、NestJS API、Prisma/PostgreSQL、Redis、Socket.IO，以及可独立运行的运维 worker。

## 快速启动

1. 复制 `.env.example` 为 `.env` 并设置随机数据库密码与域名。
2. `pnpm install`
3. `docker compose up -d --build`
4. `docker compose run --rm api pnpm --filter @chatting/api prisma:migrate`
5. 本地开发可执行 `pnpm dev`；生产入口由 Caddy 提供 HTTPS。

停止：`docker compose down`。日志：`docker compose logs -f api worker caddy`。

## 运维入口

- `GET /api/v1/health/live`：进程存活。
- `GET /api/v1/health/ready`：PostgreSQL 与 Redis 就绪状态、版本、运行模式。
- `POST /api/v1/ops/tasks/:name/run`：手动执行幂等任务。
- `GET /api/v1/ops/tasks`：查询最近任务结果。
- `GET /api/v1/audit`：查询审计日志（敏感字段自动脱敏）。

任务、备份、恢复、更新、回滚和安全要求见 `docs/deployment.md`、`docs/backup-restore.md`、`docs/security.md`、`docs/operations.md`。
