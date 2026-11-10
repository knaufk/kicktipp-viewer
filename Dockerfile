# Kicktipp Viewer: Seite + automatische Aktualisierung in einem Container.
# Konfiguration über Umgebungsvariablen (siehe .env.example), Daten im Volume /data.
FROM node:24-alpine
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
WORKDIR /app
COPY package.json server.mjs auto-update.mjs update.mjs ./
COPY export/*.mjs export/odds-snippet.js ./export/
COPY public/ ./public/
COPY demo/data.json ./demo/
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=1m --timeout=5s CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" || exit 1
CMD ["node", "server.mjs"]
