FROM node:20-alpine

WORKDIR /app

# Instala curl para healthcheck
RUN apk add --no-cache curl

# Copia dependências
COPY package*.json ./
RUN npm ci --only=production

# Copia código fonte
COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
