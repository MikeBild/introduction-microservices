# Ein Image je Service aus demselben Repo: docker build --build-arg SERVICE=orders .
# Node 26 führt TypeScript direkt aus (Type Stripping), ein Build-Schritt entfällt.
FROM node:26-alpine
ARG SERVICE
ENV NODE_ENV=production SERVICE=${SERVICE} DB_PATH=/data/${SERVICE}.db
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY services ./services
RUN npm ci --omit=dev && mkdir -p /data && chown node:node /data
USER node
CMD ["sh", "-c", "exec node services/${SERVICE}/src/server.ts"]
