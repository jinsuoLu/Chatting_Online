# Operations

Tasks are idempotent and can be run manually: `POST /api/v1/ops/tasks/expire-rooms/run`. Query one result with `GET /api/v1/ops/tasks/expire-rooms` or all results with `GET /api/v1/ops/tasks`. The worker executes cleanup tasks once per container start; run it from a scheduler (systemd timer, Kubernetes CronJob, or CI) at the desired interval.

Readiness: `/api/v1/health/live` checks process liveness; `/api/v1/health/ready` checks PostgreSQL and Redis. Investigate failed worker logs and the stored `ops:task:*` result before retrying.

	imeout-batches is recorded as a no-op until the business module persists batch jobs; the current database schema has no batch-job entity, so a safe timeout update cannot be issued without a schema change.
