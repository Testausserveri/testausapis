FROM node:16.15.0-alpine

WORKDIR /usr/src/app

RUN apk add jq curl bash

COPY package.json .
COPY package-lock.json .
RUN npm ci

ENV TZ=Europe/Helsinki
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY src ./src
COPY scripts ./scripts

RUN echo "0 */10 * * * /bin/bash /usr/src/app/scripts/syncDiscord/runWithWebhook.sh" >> /var/spool/cron/crontabs/root

EXPOSE 25
CMD crond && npm start