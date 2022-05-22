FROM node:16.15.0-alpine

WORKDIR /usr/src/app

COPY package.json .
COPY package-lock.json .
RUN npm ci
ENV TZ=Europe/Helsinki
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY src ./src

EXPOSE 25

USER node

CMD ["npm", "start"]