FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production PORT=3000 DB_PATH=/data/pixels.sqlite
COPY --chown=node:node server.js package.json index.html styles.css game.js player.js telemetry.js audio.js sw.js manifest.webmanifest admin.html admin.js admin.css ./
COPY --chown=node:node assets/ ./assets/
RUN mkdir -p /data && chown node:node /data
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
