FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @chatting/api exec prisma generate && pnpm --filter @chatting/api build
FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@chatting/api", "start"]
