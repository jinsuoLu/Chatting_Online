FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @chatting/web build
FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@chatting/web", "start"]
