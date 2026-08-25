# Architecture Notes

- 所有时间以 UTC ISO-8601 表示，数据库使用 `timestamptz` 对应的 Prisma `DateTime`。
- 所有主键使用 UUID；字段命名使用 camelCase。
- API 版本前缀固定为 `/api/v1`。
- 管理员权限必须在后端守卫/服务层校验，前端仅负责展示。
- 所有写操作预留 `AuditLog` 记录点。
- Socket.IO 网关命名空间为 `/chat`，业务事件通过 `RealtimeEvent` 契约扩展。

