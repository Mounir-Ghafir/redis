FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY app ./app
COPY redis.conf ./

EXPOSE 6379

ENV NODE_ENV=production

CMD ["node", "app/main.js"]