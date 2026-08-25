# Deployment

Production requires Docker Engine and Compose v2 on a Linux host with a DNS record for `DOMAIN`. Install Docker from the official Docker documentation, then clone the repository and configure `.env` from `.env.example`.

Run `docker compose up -d --build`, then apply migrations with `docker compose run --rm api pnpm --filter @chatting/api prisma:migrate`. Stop with `docker compose down`; add `-v` only when intentionally deleting database volumes. Logs: `docker compose logs -f api worker`.

The API is private to the Compose network; PostgreSQL and Redis have no host ports. Caddy terminates HTTPS and routes `/api/*` to the API. Update with `git pull && docker compose up -d --build`; rollback by checking out the previous tag and rebuilding.
