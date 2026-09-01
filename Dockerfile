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
RUN DEBIAN_FRONTEND=noninteractive apt-get update \
    && apt-get install --no-install-recommends -y \
       binutils \
       ca-certificates \
       curl \
       dnsutils \
       file \
       jq \
       python3 \
       python3-pip \
       ripgrep \
       unzip \
    && for package in bandit binwalk cppcheck dc3dd flawfinder foremost gdb gitleaks dnsrecon dnstwist python3-capstone python3-unicorn tcpdump tshark snort suricata python3-plaso scalpel shellcheck sleuthkit yara whois; do \
         if apt-cache show \"$package\" >/dev/null 2>&1; then apt-get install --no-install-recommends -y \"$package\"; else echo \"optional package unavailable in Bookworm repositories: $package\"; fi; \
       done \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://github.com/anchore/grype/releases/download/v0.118.0/grype_0.118.0_linux_amd64.tar.gz | tar -xz -C /usr/local/bin grype \
    && curl -fsSL https://github.com/anchore/syft/releases/download/v1.51.1/syft_1.51.1_linux_amd64.tar.gz | tar -xz -C /usr/local/bin syft \
    && curl -fsSL -o /usr/local/bin/osv-scanner https://github.com/google/osv-scanner/releases/download/v2.5.1/osv-scanner_linux_amd64 \
    && curl -fsSL -o /tmp/chainsaw.tar.gz https://github.com/WithSecureLabs/chainsaw/releases/download/v2.16.5/chainsaw_x86_64-unknown-linux-gnu.tar.gz \
    && echo '7a7289d15f085af9bce39dfa3052adf0b4c78cab0dbfb91c2dbe38322909ce02  /tmp/chainsaw.tar.gz' | sha256sum -c - \
    && tar -xzf /tmp/chainsaw.tar.gz -C /tmp \
    && install -m 0755 /tmp/chainsaw/chainsaw /usr/local/bin/chainsaw \
    && rm -rf /tmp/chainsaw /tmp/chainsaw.tar.gz \
    && curl -fsSL -o /tmp/gosec.tar.gz https://github.com/securego/gosec/releases/download/v2.28.0/gosec_2.28.0_linux_amd64.tar.gz \
    && curl -fsSL -o /tmp/gosec_checksums.txt https://github.com/securego/gosec/releases/download/v2.28.0/gosec_2.28.0_checksums.txt \
    && grep 'gosec_2.28.0_linux_amd64.tar.gz' /tmp/gosec_checksums.txt | sha256sum -c - \
    && tar -xzf /tmp/gosec.tar.gz -C /tmp \
    && install -m 0755 /tmp/gosec /usr/local/bin/gosec \
    && rm -f /tmp/gosec.tar.gz /tmp/gosec_checksums.txt /tmp/gosec \
    && curl -fsSL -o /tmp/dnsx.zip https://github.com/projectdiscovery/dnsx/releases/download/v1.3.0/dnsx_1.3.0_linux_amd64.zip \
    && curl -fsSL -o /tmp/dnsx_checksums.txt https://github.com/projectdiscovery/dnsx/releases/download/v1.3.0/dnsx_1.3.0_checksums.txt \
    && grep 'dnsx_1.3.0_linux_amd64.zip' /tmp/dnsx_checksums.txt | sha256sum -c - \
    && unzip -q /tmp/dnsx.zip -d /tmp/dnsx \
    && install -m 0755 /tmp/dnsx/dnsx /usr/local/bin/dnsx \
    && rm -rf /tmp/dnsx /tmp/dnsx.zip /tmp/dnsx_checksums.txt \
    && curl -fsSL -o /tmp/subfinder.zip https://github.com/projectdiscovery/subfinder/releases/download/v2.16.0/subfinder_2.16.0_linux_amd64.zip \
    && curl -fsSL -o /tmp/subfinder_checksums.txt https://github.com/projectdiscovery/subfinder/releases/download/v2.16.0/subfinder_2.16.0_checksums.txt \
    && grep 'subfinder_2.16.0_linux_amd64.zip' /tmp/subfinder_checksums.txt | sha256sum -c - \
    && unzip -q /tmp/subfinder.zip -d /tmp/subfinder \
    && install -m 0755 /tmp/subfinder/subfinder /usr/local/bin/subfinder \
    && rm -rf /tmp/subfinder /tmp/subfinder.zip /tmp/subfinder_checksums.txt \
    && curl -fsSL https://github.com/aquasecurity/trivy/releases/download/v0.74.0/trivy_0.74.0_Linux-64bit.tar.gz | tar -xz -C /usr/local/bin trivy \
    && curl -fsSL https://github.com/aquasecurity/tfsec/releases/download/v1.28.14/tfsec_1.28.14_linux_amd64.tar.gz | tar -xz -C /usr/local/bin tfsec \
    && chmod 0755 /usr/local/bin/grype /usr/local/bin/syft /usr/local/bin/osv-scanner /usr/local/bin/trivy /usr/local/bin/tfsec /usr/local/bin/subfinder /usr/local/bin/dnsx /usr/local/bin/gosec /usr/local/bin/chainsaw \
    && corepack enable \
    && useradd --create-home --shell /usr/sbin/nologin angelmind
COPY --from=build --chown=angelmind:angelmind /app/dist ./dist
COPY --from=build --chown=angelmind:angelmind /app/package.json /app/pnpm-lock.yaml ./
COPY --chown=angelmind:angelmind config/tool-runtime-packs.yaml ./config/tool-runtime-packs.yaml
COPY --chown=angelmind:angelmind runtime/rules.yar /etc/angelmind/rules.yar
COPY --chown=angelmind:angelmind runtime/capstone_inspect.py runtime/unicorn_probe.py runtime/dkim_verify.py ./runtime/
RUN python3 -m pip install --no-cache-dir --break-system-packages \
       checkov==3.3.16 \
       checkdmarc==6.0.0 \
       cyclonedx-bom==7.3.1 \
       dkimpy==1.1.8 \
       detect-secrets==1.5.0 \
       njsscan==1.0.0 \
       pip-audit==2.10.1 \
       semgrep==1.175.0 \
       safety==3.8.1 \
       sigmatools==0.23.1 \
       trufflehog==2.2.1 \
       volatility3==2.28.0 \
    && pnpm install --prod --frozen-lockfile \
    && chown -R angelmind:angelmind /app
USER angelmind
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "const port=process.env.PORT||3000; fetch('http://127.0.0.1:'+port+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/_core/index.js"]
