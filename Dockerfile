FROM node:16-alpine

WORKDIR /usr/src/app

COPY package.json .
COPY package-lock.json .
RUN npm ci

COPY src ./src

EXPOSE 25

USER node

CMD ["npm", "start"]