FROM node:22-bookworm-slim AS build
WORKDIR /app
# Railway exposes service variables during the build, but Docker requires
# explicit ARG declarations before Vite can embed public VITE_* values.
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_APPCHECK_SITE_KEY
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_APPCHECK_SITE_KEY=$VITE_FIREBASE_APPCHECK_SITE_KEY \
    VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT \
    VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm check && pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Safe offline/passive utilities only. Active scanners, exploit frameworks,
# credential tooling, phishing tooling, and remote execution tools are excluded.
RUN apt-get update \
    && apt-get install --no-install-recommends -y \
       bandit \
       binutils \
       ca-certificates \
       cppcheck \
       dc3dd \
       flawfinder \
       foremost \
       gdb \
       gitleaks \
       dnsutils \
       file \
       jq \
       python3-plaso \
       ripgrep \
       scalpel \
       shellcheck \
       sleuthkit \
       yara \
       whois \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && useradd --create-home --shell /usr/sbin/nologin angelmind
COPY --from=build --chown=angelmind:angelmind /app/dist ./dist
COPY --from=build --chown=angelmind:angelmind /app/package.json /app/pnpm-lock.yaml ./
COPY --chown=angelmind:angelmind config/tool-runtime-packs.yaml ./config/tool-runtime-packs.yaml
COPY --chown=angelmind:angelmind runtime/rules.yar /etc/angelmind/rules.yar
RUN pnpm install --prod --frozen-lockfile && chown -R angelmind:angelmind /app
USER angelmind
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "const port=process.env.PORT||3000; fetch('http://127.0.0.1:'+port+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/_core/index.js"]
