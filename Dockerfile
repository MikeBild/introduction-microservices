# One image per service from the same repo: docker build --build-arg SERVICE=orders .
# Node 26 runs TypeScript directly (type stripping), so there is no build step.
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
