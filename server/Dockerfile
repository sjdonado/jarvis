FROM node:22-alpine

EXPOSE 3000

WORKDIR /app

RUN apk add --no-cache \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg \
    libpng-dev \
    pixman-dev

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --production

CMD ["npm", "start"]
