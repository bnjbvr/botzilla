FROM node:10-slim

RUN apt-get update \
 && apt-get dist-upgrade -y \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /app/data

COPY ./src /app/src
COPY package.json /app/package.json

WORKDIR /app
RUN npm install --production

VOLUME /app/config.json
VOLUME /app/data

CMD ["node", "/app/src/index.js", "/config.json"]
