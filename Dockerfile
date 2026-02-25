FROM node:22-alpine

# Instala curl para o HEALTHCHECK
RUN apk add --no-cache curl

WORKDIR /app

# Copia dependências primeiro (cache de layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copia código fonte
COPY src/ ./src/

# Diretório de dados (mapeado via volume em produção)
RUN mkdir -p /data

EXPOSE 6500 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${HTTP_PORT:-3000}/health || exit 1

CMD ["node", "src/index.js"]
