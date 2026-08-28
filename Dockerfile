FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm check && pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && useradd --create-home --shell /usr/sbin/nologin angelmind
COPY --from=build --chown=angelmind:angelmind /app/dist ./dist
COPY --from=build --chown=angelmind:angelmind /app/package.json /app/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && chown -R angelmind:angelmind /app
USER angelmind
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
