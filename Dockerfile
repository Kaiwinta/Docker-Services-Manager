FROM node:20-alpine

WORKDIR /app

RUN apk update && apk add --no-cache git
RUN apk update && apk add --no-cache docker-cli

COPY package*.json ./
RUN npm install --production

COPY server/ ./server/
COPY public/ ./public/

EXPOSE 3000

CMD ["node", "server/index.js"]