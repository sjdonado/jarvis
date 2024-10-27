FROM node:22

EXPOSE 3000

RUN apt-get update && \
    apt-get install -y \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    build-essential \
    g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

CMD ["npm", "start"]
